require("dotenv").config();

const crypto = require("crypto");
const path = require("path");
const express = require("express");
const http = require("http");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(process.cwd(), "public");

// MongoDB names
const DATABASE_NAME = "ai_rpg_db";
const USERS_COLLECTION = "users";
const SESSIONS_COLLECTION = "sessions";
const SAVES_COLLECTION = "game_saves";
const DEFAULT_MONGODB_URI = "mongodb://127.0.0.1:27017/ai-rpg";
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

// AI
const AI_API = {
  baseUrl: "https://gcli.ggchan.dev/v1/chat/completions",
  mainModel: "gemini-3.1-pro-preview",
  dataModel: "gemini-3-flash-preview",
};

// Idle timeout for upstream AI calls. For streaming, this is the gap
// between chunks; for non-streaming, the overall request budget.
const AI_REQUEST_TIMEOUT_MS = 180_000;

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

// MongoDB client
assertLocalMongoUri(MONGODB_URI);
const mongoClient = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  directConnection: true,
  socketTimeoutMS: 60000,
  serverSelectionTimeoutMS: 60000,
});

// If the underlying topology drops (mongo restart, network blip), reset the
// flag so the next request triggers a fresh connect() instead of operating
// on a closed client.
mongoClient.on("close", () => {
  console.warn("MongoDB connection closed.");
  mongoConnected = false;
});
mongoClient.on("topologyClosed", () => {
  console.warn("MongoDB topology closed.");
  mongoConnected = false;
});

// MongoDB connection
let mongoConnected = false;
let mongoConnecting = null;

app.use(express.static(PUBLIC_DIR));
app.use(express.json({ limit: "1mb" }));

// Centralised error -> response helper. Logs the full error server-side and
// returns a generic message to clients; route-specific 4xx responses already
// happen inline above each try/catch, so this only fires for unexpected
// failures (Mongo errors, programmer mistakes, etc.) where we don't want to
// leak internals.
function sendInternalError(req, res, error) {
  console.error(`[${req.method} ${req.originalUrl}]`, error);
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error." });
}

// routers
app.get("/", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
app.get("/login", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "login.html")));
app.get("/chat", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "chat.html")));

// auth helper
app.get("/api/me", async (req, res) => {
  try {
    const user = await requireAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    res.json({
      user: {
        id: user._id.toString(),
        username: user.displayName,
      },
    });
  } catch (error) {
    sendInternalError(req, res, error);
  }
});

// get all saves' basic info for home page
app.get("/api/saves", async (req, res) => {
  try {
    const user = await requireAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const saves = await getSavesCollection()
      .find({ userId: user._id })
      .project({ title: 1, createdAt: 1, updatedAt: 1 })
      .sort({ updatedAt: -1 })
      .toArray();

    res.json({ saves });
  } catch (error) {
    sendInternalError(req, res, error);
  }
});

// read in a save
app.get("/api/saves/:id", async (req, res) => {
  try {
    const user = await requireAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid save id." });
    }

    const save = await getSavesCollection().findOne(
      {
        _id: new ObjectId(req.params.id),
        userId: user._id,
      },
      {
        projection: { title: 1, gameState: 1, createdAt: 1, updatedAt: 1 },
      }
    );

    if (!save) {
      return res.status(404).json({ error: "Save not found" });
    }

    res.json({ save });
  } catch (error) {
    sendInternalError(req, res, error);
  }
});

// register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!isValidCredential(username, password)) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    await connectMongo();
    const users = getUsersCollection();
    const normalizedUsername = normalizeUsername(username);

    // check for duplicated usernames
    const existing = await users.findOne({ username: normalizedUsername });
    if (existing) {
      return res.status(409).json({ error: "Username already exists." });
    }

    // create a new user
    const userDoc = {
      username: normalizedUsername,
      displayName: username.trim(),
      passwordHash: hashPassword(password),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await users.insertOne(userDoc);
    const sessionToken = crypto.randomUUID();
    await upsertSession(sessionToken, result.insertedId);

    // auto login
    res.json({
      user: {
        id: result.insertedId.toString(),
        username: username.trim(),
      },
      token: sessionToken,
    });
  } catch (error) {
    sendInternalError(req, res, error);
  }
});

// login 
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!isValidCredential(username, password)) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    await connectMongo();
    const users = getUsersCollection();

    // check for username and password
    const user = await users.findOne({ username: normalizeUsername(username) });
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const sessionToken = crypto.randomUUID();
    await upsertSession(sessionToken, user._id);

    res.json({
      user: {
        id: user._id.toString(),
        username: user.displayName,
      },
      token: sessionToken,
    });
  } catch (error) {
    sendInternalError(req, res, error);
  }
});

// create a new save
app.post("/api/saves", async (req, res) => {
  try {
    const user = await requireAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { title, gameState } = req.body || {};
    if (!gameState || typeof gameState !== "object" || Array.isArray(gameState)) {
      return res.status(400).json({ error: "Game state is required." });
    }

    const result = await getSavesCollection().insertOne({
      userId: user._id,
      title: cleanSaveTitle(title),
      gameState,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({ saveId: result.insertedId.toString() });
  } catch (error) {
    sendInternalError(req, res, error);
  }
});

// update a save
app.put("/api/saves/:id", async (req, res) => {
  try {
    const user = await requireAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid save id." });
    }

    // check for what to update
    const update = {};
    if (typeof req.body?.title === "string") update.title = cleanSaveTitle(req.body.title);
    if (req.body?.gameState) {
      if (typeof req.body.gameState !== "object" || Array.isArray(req.body.gameState)) {
        return res.status(400).json({ error: "Game state must be an object." });
      }
      update.gameState = req.body.gameState;
    }
    update.updatedAt = new Date();

    const result = await getSavesCollection().updateOne(
      { _id: new ObjectId(req.params.id), userId: user._id },
      { $set: update }
    );

    res.json({ matched: result.matchedCount, modified: result.modifiedCount });
  } catch (error) {
    sendInternalError(req, res, error);
  }
});

// delete a save
app.delete("/api/saves/:id", async (req, res) => {
  try {
    const user = await requireAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid save id." });
    }

    const result = await getSavesCollection().deleteOne({
      _id: new ObjectId(req.params.id),
      userId: user._id,
    });

    res.json({ deleted: result.deletedCount });
  } catch (error) {
    sendInternalError(req, res, error);
  }
});

// Global error middleware: catches body-parser errors (malformed JSON, payload
// too large) and any error a route forwarded with next(err). Routes still
// return their own JSON errors via try/catch above; this is the safety net.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large." });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
});

io.on("connection", (socket) => {

  // ai stream
  socket.on("ask_ai", async (payload = {}) => {
    const controller = new AbortController();
    const onDisconnect = () => controller.abort(new Error("Client disconnected"));
    socket.once("disconnect", onDisconnect);

    try {
      const { prompt, currentInput, token } = payload;
      if (!token) throw new Error("Missing session token.");
      if (typeof prompt !== "string" || !prompt.trim()) {
        throw new Error("Missing prompt.");
      }

      const user = await getSessionUser(token);
      if (!user) throw new Error("Invalid session token.");

      socket.emit("ai_stream", { type: "start" });
      const aiMessage = await streamChatCompletion({
        model: AI_API.mainModel,
        prompt,
        signal: controller.signal,
        onChunk: (delta) => socket.emit("ai_stream", { type: "chunk", delta }),
      });

      socket.emit("ai_stream", { type: "end" });
      await summarizeConversation(socket, currentInput, aiMessage, controller.signal);
    } catch (error) {
      socket.emit("ai_stream", { type: "error", message: error.message });
    } finally {
      socket.off("disconnect", onDisconnect);
    }
  });
});

// create connection to db
async function connectMongo() {
  if (mongoConnected) return;
  if (mongoConnecting) return mongoConnecting;

  mongoConnecting = (async () => {
    try {
      await mongoClient.connect();
      mongoConnected = true;
      console.log("Connected to MongoDB.");
    } finally {
      mongoConnecting = null;
    }
  })();
  return mongoConnecting;
}

// get all users
function getUsersCollection() {
  return mongoClient.db(DATABASE_NAME).collection(USERS_COLLECTION);
}

// auth helper
function getSessionsCollection() {
  return mongoClient.db(DATABASE_NAME).collection(SESSIONS_COLLECTION);
}

// get saves from database
function getSavesCollection() {
  return mongoClient.db(DATABASE_NAME).collection(SAVES_COLLECTION);
}

// clean username
function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

// clean title for saves
function cleanSaveTitle(title) {
  return typeof title === "string" && title.trim() ? title.trim() : "Untitled Save";
}

// SHA-256 
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function isValidCredential(username, password) {
  return Boolean(username && password && username.trim() && password.trim());
}

function assertLocalMongoUri(mongoUri) {
  if (mongoUri.startsWith("mongodb+srv://")) {
    throw new Error("MONGODB_URI must use a local mongodb:// URI, not mongodb+srv://.");
  }

  const match = mongoUri.match(/^mongodb:\/\/([^/?#]+)/);
  if (!match) {
    throw new Error("MONGODB_URI must be a valid mongodb:// URI.");
  }

  const hosts = match[1].split(",").map((host) => {
    const withoutAuth = host.includes("@") ? host.slice(host.lastIndexOf("@") + 1) : host;
    return withoutAuth.replace(/^\[/, "").replace(/\](:\d+)?$/, "").replace(/:\d+$/, "");
  });

  const allowedHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  const nonLocalHosts = hosts.filter((host) => !allowedHosts.has(host));

  if (nonLocalHosts.length > 0) {
    throw new Error(`MongoDB connections are restricted to localhost. Refused: ${nonLocalHosts.join(", ")}`);
  }
}

// auth helper
async function upsertSession(token, userId) {
  await connectMongo();
  await getSessionsCollection().updateOne(
    { token },
    {
      $set: { token, userId, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
}

// auth helper
async function getSessionUser(token) {
  if (!token) return null;
  await connectMongo();
  const session = await getSessionsCollection().findOne({ token });
  if (!session) return null;
  return getUsersCollection().findOne({ _id: session.userId });
}


// auth helper
function getTokenFromRequest(req) {
  return req.headers.authorization?.replace(/^Bearer\s+/i, "") || req.query.token || req.body?.token || null;
}

// auth helper
async function requireAuthUser(req) {
  const token = getTokenFromRequest(req);
  return getSessionUser(token);
}

// stream output
async function streamChatCompletion({ model, prompt, onChunk, signal }) {
  const idleController = new AbortController();
  let idleTimer = null;
  let timedOut = false;
  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      timedOut = true;
      idleController.abort();
    }, AI_REQUEST_TIMEOUT_MS);
  };

  const composedSignal = signal
    ? AbortSignal.any([signal, idleController.signal])
    : idleController.signal;

  resetIdleTimer();

  try {
    const response = await fetch(AI_API.baseUrl, {
      method: "POST",
      headers: getAiHeaders(),
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
      }),
      signal: composedSignal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(
        `Upstream ${response.status} ${response.statusText}: ${errBody.slice(0, 500) || "<empty body>"}`
      );
    }

    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let fullMessage = "";

    const handleLine = (line) => {
      if (!line.trim() || !line.startsWith("data: ")) return null;
      const payload = line.replace("data: ", "").trim();
      if (payload === "[DONE]") return "DONE";

      let data;
      try {
        data = JSON.parse(payload);
      } catch (error) {
        console.error("Error parsing stream chunk:", error, line);
        return null;
      }

      if (data.error) {
        const message = data.error.message || JSON.stringify(data.error);
        throw new Error(`Upstream error: ${message}`);
      }

      const delta = data.choices?.[0]?.delta?.content;
      if (delta) {
        fullMessage += delta;
        onChunk(delta);
      }
      return null;
    };

    for await (const chunk of response.body) {
      resetIdleTimer();
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (handleLine(line) === "DONE") return fullMessage;
      }
    }

    // flush any trailing line left in the buffer
    buffer += decoder.decode();
    if (buffer.trim()) {
      if (handleLine(buffer) === "DONE") return fullMessage;
    }

    return fullMessage;
  } catch (error) {
    if (timedOut || error?.name === "AbortError") {
      if (timedOut) {
        throw new Error(`Upstream timeout after ${AI_REQUEST_TIMEOUT_MS / 1000}s of inactivity.`);
      }
      throw new Error("Upstream request cancelled.");
    }
    throw error;
  } finally {
    if (idleTimer) clearTimeout(idleTimer);
  }
}

// data AI: summarize the last conversation
async function summarizeConversation(socket, currentInput, aiResponse, externalSignal) {

  const prompt = [
    "Summarize and organize the following conversation for AI to read in a few short and concise sentences.",
    "Include settings, time, location, important events, interactions, and characters.",
    "",
    `[User]: ${currentInput}`,
    "",
    `[GameMaster]: ${aiResponse}`,
  ].join("\n");

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), AI_REQUEST_TIMEOUT_MS);
  const composedSignal = externalSignal
    ? AbortSignal.any([externalSignal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const response = await fetch(AI_API.baseUrl, {
      method: "POST",
      headers: getAiHeaders(),
      body: JSON.stringify({
        model: AI_API.dataModel,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: composedSignal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(
        `Upstream ${response.status} ${response.statusText}: ${errBody.slice(0, 500) || "<empty body>"}`
      );
    }

    const data = await response.json();
    if (data.error) {
      const message = data.error.message || JSON.stringify(data.error);
      throw new Error(`Upstream error: ${message}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Upstream response missing choices[0].message.content.");
    }

    socket.emit("data_response", { type: "summary", content });
  } catch (error) {
    let message;
    if (timeoutController.signal.aborted && !externalSignal?.aborted) {
      message = `Upstream timeout after ${AI_REQUEST_TIMEOUT_MS / 1000}s.`;
    } else if (error?.name === "AbortError") {
      message = "Upstream request cancelled.";
    } else {
      message = error.message;
    }
    socket.emit("data_response", { type: "error", message });
  } finally {
    clearTimeout(timeoutId);
  }
}

function getAiHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.AI_API_KEY}`,
  };
}

// boot the server
async function bootstrap() {
  if (!process.env.AI_API_KEY) {
    console.warn("AI_API_KEY is not set. AI requests will fail until it is configured in .env.");
  }

  await connectMongo();
  await ensureIndexes();
  httpServer.listen(PORT, () => {
    console.log(`Server is up, visit http://localhost:${PORT}`);
  });
}

// create index for users, sessions, saves
async function ensureIndexes() {
  await getUsersCollection().createIndex({ username: 1 }, { unique: true });
  await getSessionsCollection().createIndex({ token: 1 }, { unique: true });
  await getSessionsCollection().createIndex({ userId: 1 });
  await getSavesCollection().createIndex({ userId: 1, updatedAt: -1 });
}

bootstrap().catch((error) => {
  console.error("Server bootstrap failed:", error);
  process.exit(1);
});
