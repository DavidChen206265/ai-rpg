require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// AI API request variables
const API_BASE_URL = "https://gcli.ggchan.dev/v1/chat/completions";
const MAIN_MODEL_ID = "gemini-3.1-pro-preview";
const DATA_MODEL_ID = "gemini-3-flash-preview";

// after a client connected
io.on("connection", (socket) => {
  console.log("A client has connected.");

  // ask AI
  socket.on("ask_ai", async (prompt, currentInput) => {
    try {
      // send back the waiting status
      socket.emit("ai_response", "Waiting...");

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
      socket.emit("ai_response", aiMessage);

      // conversation summarization
      summarizeData(socket, currentInput, aiMessage);

    } catch (error) {
      console.error("API error:", error);
      socket.emit("ai_response", `[Error]: ${error.message}`);
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
