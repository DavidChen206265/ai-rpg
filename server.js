require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const { MongoClient, ServerApiVersion } = require('mongodb');

// Pull the connection string from your .env file
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.use(express.static("public"));

// AI API request variables
const API_BASE_URL = "https://gcli.ggchan.dev/v1/chat/completions";
const MAIN_MODEL_ID = "gemini-3.1-pro-preview"; 
const DATA_MODEL_ID = "gemini-3-flash-preview"; 

runDB().catch(console.dir);

// after a client connected
io.on("connection", (socket) => {
  console.log("A client has connected.");

  

  // ask AI
  socket.on("ask_ai", async (prompt, currentInput) => {
    try {
      // Notify the client that the stream is starting
      socket.emit("ai_stream", "start");

      // send a request and wait for the response
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MAIN_MODEL_ID,
          messages: [{ role: "user", content: prompt }],
          stream: true, // 1. Tell the API to stream the response
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed, status code: ${response.status}`);
      }

      // 2. Set up a decoder and a buffer to handle partial chunks
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let fullAiMessage = ""; // Accumulator for the final summary

      // 3. Iterate asynchronously over the incoming stream
      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");

        // The last line might be incomplete, keep it in the buffer for the next chunk
        buffer = lines.pop();

        for (const line of lines) {
          if (line.trim() === "") continue;

          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();

            // Standard OpenAI-compatible API termination signal
            if (dataStr === "[DONE]") break;

            try {
              const data = JSON.parse(dataStr);
              // In a stream, the data is typically inside `delta` rather than `message`
              const delta = data.choices[0]?.delta?.content;

              if (delta) {
                fullAiMessage += delta;
                // 4. Emit each piece of text as soon as it arrives
                socket.emit("ai_stream", `[Chunk]: ${delta}`);
              }
            } catch (e) {
              console.error("Error parsing stream chunk:", e, line);
            }
          }
        }
      }

      // 5. Notify the client the stream is complete and run your summary
      socket.emit("ai_stream", "end");
      summarizeData(socket, currentInput, fullAiMessage);

    } catch (error) {
      console.error("API error:", error);
      socket.emit("ai_stream", `[Error]: ${error.message}`);
    }
  });

  // disconnect
  socket.on("disconnect", () => {
    console.log("A client has disconnected.");
  });
});

// request data summarization
async function summarizeData(socket, currentInput, response) {

  let prompt = "Summarize and organize the following conversation for AI to read in A FEW SHORT AND CONCISE SENTENCES. Including settings, time, location, important events, interactions, characters. ";

  prompt += "[User: ] " + currentInput;
  prompt += "\n\n ";
  prompt += "[GameMaster: ] " + response;
  prompt += "\n\n ";

  try {

    // send a request and wait for the response
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: DATA_MODEL_ID,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed, status code: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);
    // get the message
    const aiMessage = data.choices[0].message.content;

    // send back the response
    socket.emit("data_response", aiMessage);
  } catch (error) {
    console.error("API error:", error);
    socket.emit("data_response", `[Error]: ${error.message}`);
  }

}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is up, visit http://localhost:${PORT}`);
});

async function runDB() {
  try {
    // Connect the client to the VPS server
    await client.connect();
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB on db.davidchen.me!");

    // --- YOUR APP LOGIC GOES HERE ---
    // Example: const myDatabase = client.db("myGameData");
    // Example: const usersCollection = myDatabase.collection("users");

  } catch (error) {
    console.error("Connection failed! Check your IP, UFW firewall, or password.", error);
  } finally {
    // Ensures that the client will close when you finish/error
    // (In a continuous web server, you would leave this open)
    await client.close();
  }
}