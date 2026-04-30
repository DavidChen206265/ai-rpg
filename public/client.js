const socket = io();

const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("userInput");

// chat history
let chatHistory = new Set();
let systemPrompt = "The player is in a magical maze, trying to reach the center. The player must progress through at least 4 rooms before you can reach the center. Of these rooms, one must have a treasure chest sealed by vines, and one must have an angry goblin who will fight the player. You are a game master, running a fantasy game. Based on the previous quest information, generate a description of the room the player is currently in.";

// connected to the server
socket.on("connect", () => {
  chatWindow.innerHTML =
    '<div style="color: green;">System: Conncected to the server.</div>';
});

// listen for AI response from server
socket.on("ai_response", (msg) => {

  if (msg === "Waiting...") {
    chatWindow.innerHTML += `<div class="msg-ai" id="loading"><strong>AI:</strong> ${msg}</div>`;
  } else {

    const loadingNode = document.getElementById("loading");
    if (loadingNode) loadingNode.remove(); // remove loading sign
    chatWindow.innerHTML += `<div class="msg-ai"><strong>AI:</strong> ${msg}</div>`;

    // add response to history
    chatHistory.add("Response " + Math.floor(chatHistory.size / 2) + ": " + msg);
  }
  chatWindow.scrollTop = chatWindow.scrollHeight;
});

// send message to server
function sendMessage() {
  let text = userInput.value.trim();
  let request = "";
  if (chatHistory.size !== 0 & !text) return;
  else if (chatHistory.size === 0) {
    text = systemPrompt;
  }

  // give AI the chat history
  request = "Current conversation: " + text + " Chat history: ";

  // don't show systemPrompt
  if (chatHistory.size === 0) text = "Game Start";

  for (const x of chatHistory) {
    request += " [" + x + "] ";
  }

  // show user's message in chatWindow
  chatWindow.innerHTML += `<div class="msg-user"><strong>You:</strong> ${text}</div>`;

  // log the whole prompt
  console.log("Prompt " + Math.floor(chatHistory.size / 2) + ": " + request);
  
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // send text to server
  socket.emit("ask_ai", request);

  // add prompt to history
  chatHistory.add("Prompt " + Math.floor(chatHistory.size / 2) + ": " + text);

  userInput.value = "";
}

// press Enter to send the message
function checkEnter(e) {
  if (e.key === "Enter") sendMessage();
}
