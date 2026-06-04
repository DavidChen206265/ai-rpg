require("dotenv").config();

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const express = require("express");
const http = require("http");
const https = require("https");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(process.cwd(), "public");
const IMAGE_DIR = path.join(PUBLIC_DIR, "imgs");
const BACKGROUND_IMAGE_DIR = path.join(IMAGE_DIR, "background");
const PROFILE_IMAGE_DIR = path.join(IMAGE_DIR, "profile");

// MongoDB names
const DATABASE_NAME = "ai_rpg_db";
const USERS_COLLECTION = "users";
const SESSIONS_COLLECTION = "sessions";
const SAVES_COLLECTION = "game_saves";
const DEFAULT_MONGODB_URI = "mongodb://127.0.0.1:27017/ai-rpg";
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

// AI
const AI_API = {
  baseUrl: process.env.AI_BASE_URL || "https://gcli.ggchan.dev/v1/chat/completions",
  mainModel: process.env.AI_MAIN_MODEL || "gemini-3.1-pro-preview",
  dataModel: process.env.AI_DATA_MODEL || "gemini-3-flash-preview",
};

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

// MongoDB connection
let mongoConnected = false;

app.use(express.static(PUBLIC_DIR));
app.use(express.json());

// routers
app.get("/", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
app.get("/login", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "login.html")));
app.get("/chat", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "chat.html")));

// image routers
app.get("/api/background-images", async (req, res) => {
  try {
    const entries = await fs.readdir(BACKGROUND_IMAGE_DIR, { withFileTypes: true });
    const images = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => /\.(jpe?g|png|webp)$/i.test(fileName))
      .sort((a, b) => a.localeCompare(b));

    res.json({ images });
  } catch (error) {
    res.status(500).json({ error: "Failed to load background images." });
  }
});

app.get("/api/profile-images", async (req, res) => {
  try {
    const entries = await fs.readdir(PROFILE_IMAGE_DIR, { withFileTypes: true });
    const images = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => /\.(jpe?g|png|webp)$/i.test(fileName))
      .sort((a, b) => a.localeCompare(b));

    res.json({ images });
  } catch (error) {
    res.status(500).json({ error: "Failed to load profile images." });
  }
});

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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

// read in a save
app.get("/api/saves/:id", async (req, res) => {
  try {
    const user = await requireAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

// update a save
app.put("/api/saves/:id", async (req, res) => {
  try {
    const user = await requireAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
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
    res.status(500).json({ error: error.message });
  }
});

// delete a save
app.delete("/api/saves/:id", async (req, res) => {
  try {
    const user = await requireAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await getSavesCollection().deleteOne({
      _id: new ObjectId(req.params.id),
      userId: user._id,
    });

    res.json({ deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

io.on("connection", (socket) => {

  // ai stream 
  socket.on("ask_ai", async (payload = {}) => {
    try {
      const { prompt, currentInput, token } = payload;
      if (!token) throw new Error("Missing session token.");

      socket.emit("ai_stream", "start");
      const aiMessage = await streamChatCompletion({
        model: AI_API.mainModel,
        prompt,
        onChunk: (delta) => socket.emit("ai_stream", `[Chunk]: ${delta}`),
      });

      socket.emit("ai_stream", "end");
      await summarizeConversation(socket, currentInput, aiMessage);
    } catch (error) {
      socket.emit("ai_stream", `[Error]: ${error.message}`);
    }
  });
});

// create connection to db
async function connectMongo() {
  if (mongoConnected) return;
  await mongoClient.connect();
  mongoConnected = true;
  console.log("Connected to MongoDB.");
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
async function streamChatCompletion({ model, prompt, onChunk }) {
  return postAiStream({
    model,
    messages: [{ role: "user", content: prompt }],
    stream: true,
  }, onChunk);
}

// data AI: summarize the last conversation
async function summarizeConversation(socket, currentInput, aiResponse) {
  
  const prompt = [
    "Summarize and organize the following conversation for AI to read in a few short and concise sentences.",
    "Include settings, time, location, important events, interactions, and characters.",
    "",
    `[User]: ${currentInput}`,
    "",
    `[GameMaster]: ${aiResponse}`,
  ].join("\n");

  try {
    const data = await postAiJson({
      model: AI_API.dataModel,
      messages: [{ role: "user", content: prompt }],
    });
    socket.emit("data_response", data.choices[0].message.content);
  } catch (error) {
    socket.emit("data_response", `[Error]: ${error.message}`);
  }
}

function getAiHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.AI_API_KEY}`,
  };
}

function makeAiRequest(payload, onResponse) {
  const url = new URL(AI_API.baseUrl);
  const body = JSON.stringify(payload);
  const client = url.protocol === "https:" ? https : http;
  const request = client.request({
    method: "POST",
    hostname: url.hostname,
    port: url.port || (url.protocol === "https:" ? 443 : 80),
    path: `${url.pathname}${url.search}`,
    headers: {
      ...getAiHeaders(),
      "Content-Length": Buffer.byteLength(body),
    },
  }, onResponse);

  request.setTimeout(180000, () => request.destroy(new Error("AI request timed out.")));
  request.write(body);
  request.end();
  return request;
}

function postAiJson(payload) {
  return new Promise((resolve, reject) => {
    const request = makeAiRequest(payload, (response) => {
      let raw = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        raw += chunk;
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`API request failed, status code: ${response.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch (error) {
          reject(new Error(`Invalid AI JSON response: ${error.message}`));
        }
      });
    });

    request.on("error", reject);
  });
}

function postAiStream(payload, onChunk) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = makeAiRequest(payload, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`API request failed, status code: ${response.statusCode}`));
        return;
      }

      let buffer = "";
      let fullMessage = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;

          const payloadText = line.replace("data: ", "").trim();
          if (payloadText === "[DONE]") {
            settled = true;
            resolve(fullMessage);
            return;
          }

          try {
            const data = JSON.parse(payloadText);
            const delta = data.choices[0]?.delta?.content;
            if (delta) {
              fullMessage += delta;
              onChunk(delta);
            }
          } catch (error) {
            console.error("Error parsing stream chunk:", error, line);
          }
        }
      });
      response.on("end", () => {
        if (!settled) resolve(fullMessage);
      });
    });

    request.on("error", reject);
  });
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
