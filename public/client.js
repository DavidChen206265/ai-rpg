const socket = io();

const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("userInput");

// chat history
let chatHistory = new Set();
let systemPrompt = `The user is in a magical maze, trying to reach the center. The user must progress through at least 4 rooms before you can reach the center. Of these rooms, one must have a treasure chest sealed by vines, and one must have an angry goblin who will fight the user.

You are a game master, running a fantasy game. Based on the previous quest information, generate a description of the room the user is currently in.

Your response MUST be in this format: Current time, location + main descriptions(story's progress) + "<choices>" + json of three choices + "</choices>"

json format:
  {
    choice1: "[Choice 1] Choice 1 text.",
    choice2: "[Choice 2] Choice 2 text.",
    choice3: "[Choice 3] Choice 3 text."
  }`;

// choice system
let choices = ["Choice 1", "Choice2", "Choice3"];
let choice1 = document.getElementById("choice-1");
let choice2 = document.getElementById("choice-2");
let choice3 = document.getElementById("choice-3");



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

    console.log("msg: " + msg);


    // update choices
    msg = updateChoices(msg);

    // show message to user
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

function applyChoice(choiceNumber) {
  if (!choiceNumber) return;

  let selectedChoiceText = "";

  if (choiceNumber === 1 && choice1.innerText) selectedChoiceText = choice1.innerText;
  else if (choiceNumber === 2 && choice2.innerText) selectedChoiceText = choice2.innerText;
  else if (choiceNumber === 3 && choice3.innerText) selectedChoiceText = choice3.innerText;

  // update userInput
  userInput.innerText = selectedChoiceText;
}

function extractJsonFromString(text, start, end) {

  const result = text.split(start)[1].split(end)[0];

  console.log('Extracted JSON: ' + result);

  // convert to json and return
  return JSON.parse(result);
}

function cutOffString(text, start, end) {

  const result = text.split(start)[0] + text.split(end)[1];

  console.log('Cutoff: ' + result);

  // convert to json and return
  return result;
}

function updateChoices(response) {

  const choicesStart = "<choices>";
  const choicesEnd = "</choices>";

  const choicesJson = extractJsonFromString(response, choicesStart, choicesEnd);
  choice1.innerText = choicesJson.choice1;
  choice2.innerText = choicesJson.choice2;
  choice3.innerText = choicesJson.choice3;

  return cutOffString(response, choicesStart, choicesEnd);
}

