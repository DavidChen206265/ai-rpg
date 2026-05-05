const socket = io();

const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("userInput");

// chat history
let chatHistory = new Set();
let systemPrompt = `The user is in a magical maze, trying to reach the center. The user must progress through at least 4 rooms before you can reach the center. Of these rooms, one must have a treasure chest sealed by vines, and one must have an angry goblin who will fight the user.

You are a game master, running a fantasy game. The user's character is Wilde, a wily ranger. They are highly dexterous and nimble, and are well suited to acrobatic maneuvers. They only have a very limited use of magic, able to use only the simplest nature spells and none else. While they are nimble they aren't frail, and can hold their own in one-on-one combat. (avoid quoting the character description verbatim) Based on the previous quest information, generate a description of the room the user is currently in.

Your response MUST be in this format: Current time, location + (new paragraph) main descriptions(story's progress) + "<choices>" + json of three choices and if the game is over + "</choices>"

json format:
  {
    choice1: "Choice 1 text.",
    choice2: "Choice 2 text.",
    choice3: "Choice 3 text."
    gameOver: "1" //if the game is over, 0. if the game is ongoing, 1.
  }`;

// choice system
let choices = ["Choice 1", "Choice2", "Choice3"];
let choice1 = document.getElementById("choice-1");
let choice2 = document.getElementById("choice-2");
let choice3 = document.getElementById("choice-3");

let gameend = false;

let chardesc = "Wilde, a wily ranger. They are highly dexterous and nimble, and are well suited to acrobatic maneuvers. They only have a very limited use of magic, able to use only the simplest nature spells and none else. While they are nimble they aren't frail, and can hold their own in one-on-one combat." //by default you play as wilde, so this should be the same as the wilde info

function selectCharacter(char) {
    if(char == 1){ //Wizard
      chardesc = "Fitzgerald, an aspiring wizard. They have great knowledge of most magic, and tend to use magic instead of physical acts. They can cast most magic, but high level spells drain their energy, so they are used sparingly. While they aren't old, they don't have much defense or stamina, and are not well suited for strength based activity. Their magical prowess makes up for their lack of strength however."
      document.getElementById("char1").style.backgroundColor = "#007bff"
      document.getElementById("char2").style.backgroundColor = "#0056b3"
      document.getElementById("char3").style.backgroundColor = "#0056b3"
    }
    if(char == 2){ //Ranger
      chardesc = "Wilde, a wily ranger. They are highly dexterous and nimble, and are well suited to acrobatic maneuvers. They only have a very limited use of magic, able to use only the simplest nature spells and none else. While they are nimble they aren't frail, and can hold their own in one-on-one combat."
      document.getElementById("char2").style.backgroundColor = "#007bff"
      document.getElementById("char1").style.backgroundColor = "#0056b3"
      document.getElementById("char3").style.backgroundColor = "#0056b3"
    }
    if(char == 3){ //Barbarian
      chardesc = "Burgess, a strong warrior. They are very strong, and well trained in all manner of close combat. They have high defense and stamina, and are very well suited to feats of strength. They are also somewhat nimble, but lack the ability for major acrobatic movements. However, they have a complete and utter lack of magic, being completely incapable under any circumstances to cast even the simplest of spells. They can still use potions and magical items, but cannot cast any magic on their own at all."
      document.getElementById("char3").style.backgroundColor = "#007bff"
      document.getElementById("char2").style.backgroundColor = "#0056b3"
      document.getElementById("char1").style.backgroundColor = "#0056b3"
    }
    systemPrompt = `The user is in a magical maze, trying to reach the center. The user must progress through at least 4 rooms before you can reach the center. Of these rooms, one must have a treasure chest sealed by vines, and one must have an angry goblin who will fight the user.

    You are a game master, running a fantasy game. The user's character is ${chardesc} (avoid quoting the character description verbatim) Based on the previous quest information, generate a description of the room the user is currently in.
    
    Your response MUST be in this format: Current time, location + (new paragraph) main descriptions(story's progress) + "<choices>" + json of three choices and if the game is over + "</choices>"
    
    json format:
      {
        choice1: "Choice 1 text.",
        choice2: "Choice 2 text.",
        choice3: "Choice 3 text."
        gameOver: "1" //if the game is over, 0. if the game is ongoing, 1.
      }`
}



// connected to the server
socket.on("connect", () => {
  chatWindow.innerHTML =
    '<div>System: Connected to the server.</div>';
});

// listen for AI response from server
socket.on("ai_response", (msg) => {

  if (msg === "Waiting...") {
    chatWindow.innerHTML += `<div class="msg-ai" id="loading">${msg}</div>`;
  } else if (msg.startsWith("[Error]")) {
    chatWindow.innerHTML += `<div class="msg-ai" id="loading">${msg}</div>`;
  } else {

    console.log("msg: " + msg);

    // update choices
    msg = updateChoices(msg);

    // show message to user
    const loadingNode = document.getElementById("loading");
    if (loadingNode) loadingNode.remove(); // remove loading sign
    chatWindow.innerHTML += `<div class="msg-ai">${msg}</div>`;

    // add response to history
    chatHistory.add("Response " + Math.floor(chatHistory.size / 2) + ": " + msg);
  }
  chatWindow.scrollTo({top:0, behavior:'auto'});
});

// send message to server
function sendMessage() {
  document.getElementById("buttonStart").style.display = "none";
  document.getElementById("characterSelect").style.display = "none";
  document.getElementById("inputBox").style.display = "grid";
  chatWindow.innerHTML = "";
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
  // add initial instructions
  if (chatHistory.size === 0) {
    text = systemPrompt;
  }
  chatHistory.add("Prompt " + Math.floor(chatHistory.size / 2) + ": " + text);

  userInput.value = "";
}

// press Enter to send the message
function checkEnter(e) {
  if (e.key === "Enter") sendMessage();
}

function applyChoice(choiceNumber) {
  if (!choiceNumber) return;

  console.log("applyChoice " + choiceNumber);


  let selectedChoiceText = "";

  if (choiceNumber === 1 && choice1.innerText) {
    selectedChoiceText = choice1.innerText;
  }
  else if (choiceNumber === 2 && choice2.innerText) {
    selectedChoiceText = choice2.innerText;
  }
  else if (choiceNumber === 3 && choice3.innerText) {
    selectedChoiceText = choice3.innerText;
  } 

  // update userInput
  userInput.value = selectedChoiceText;
  sendMessage();
  // console.log("InputText: " + userInput.value);
}

function extractJsonFromString(text, start, end) {

  console.log("extractJsonFromString - text: " + text);


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
  if(choicesJson.gameOver == "0"){
    gameend = true;
    document.getElementById("inputBox").style.display = "grid"; //temp get rid of the options
  }

  return cutOffString(response, choicesStart, choicesEnd);
}

