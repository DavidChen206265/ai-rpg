const socket = io();

const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("userInput");

// chat history
let chatHistory = [];
let eventMemory = new Set();

let systemPrompt = ``;

// choice system
let choices = ["Choice 1", "Choice2", "Choice3"];
let choice1 = document.getElementById("choice-1");
let choice2 = document.getElementById("choice-2");
let choice3 = document.getElementById("choice-3");

let currentResponse = "";

let gameend = false;
let health = 10;
let currenthealth = 10;
let progression = 1;
let luck = 1;

let chardesc = "Wilde, a wily ranger. They are highly dexterous and nimble, and are well suited to acrobatic maneuvers. They only have a very limited use of magic, able to use only the simplest nature spells and none else. While they are nimble they aren't frail, and can hold their own in one-on-one combat. They have 15 hit points total." //by default you play as wilde, so this should be the same as the wilde info

function selectCharacter(char) {
    if(char == 1){ //Wizard
      chardesc = "Fitzgerald, an aspiring wizard. They have great knowledge of most magic, and tend to use magic instead of physical acts. They can cast most magic, but high level spells drain their energy, so they are used sparingly. While they aren't old, they don't have much defense or stamina, and are not well suited for strength based activity. Their magical prowess makes up for their lack of strength however. They have 10 hit points total."
      document.getElementById("char1").style.backgroundColor = "#007bff"
      document.getElementById("char2").style.backgroundColor = "#0056b3"
      document.getElementById("char3").style.backgroundColor = "#0056b3"
      health = 10;
      document.getElementById("characterblurb").innerHTML = "It's Fitzgerald!"; //ADD CHARACTER DESC HERE
      document.getElementById("characterprofile").style.backgroundColor = "blue"; //ADD CHARACTER PROFILE HERE
    }
    if(char == 2){ //Ranger
      chardesc = "Wilde, a wily ranger. They are highly dexterous and nimble, and are well suited to acrobatic maneuvers. They only have a very limited use of magic, able to use only the simplest nature spells and none else. While they are nimble they aren't frail, and can hold their own in one-on-one combat. They have 15 hit points total."
      document.getElementById("char2").style.backgroundColor = "#007bff"
      document.getElementById("char1").style.backgroundColor = "#0056b3"
      document.getElementById("char3").style.backgroundColor = "#0056b3"
      health = 15;
      document.getElementById("characterblurb").innerHTML = "It's Wilde!"; //ADD CHARACTER DESC HERE
      document.getElementById("characterprofile").style.backgroundColor = "green"; //ADD CHARACTER PROFILE HERE
    }
    if(char == 3){ //Barbarian
      chardesc = "Burgess, a strong warrior. They are very strong, and well trained in all manner of close combat. They have high defense and stamina, and are very well suited to feats of strength. They are also somewhat nimble, but lack the ability for major acrobatic movements. However, they have a complete and utter lack of magic, being completely incapable under any circumstances to cast even the simplest of spells. They can still use potions and magical items, but cannot cast any magic on their own at all. They have 25 hit points total."
      document.getElementById("char3").style.backgroundColor = "#007bff"
      document.getElementById("char2").style.backgroundColor = "#0056b3"
      document.getElementById("char1").style.backgroundColor = "#0056b3"
      health = 25;
      document.getElementById("characterblurb").innerHTML = "It's Burgess!"; //ADD CHARACTER DESC HERE
      document.getElementById("characterprofile").style.backgroundColor = "red"; //ADD CHARACTER PROFILE HERE
    }
    document.getElementById("buttonStart").style.display = "block";
    currenthealth = health;
    document.getElementById("healthbar").innerHTML = currenthealth + "/" + health;
    document.getElementById("characterblurb").style.display = "block";
    document.getElementById("characterprofile").style.display = "inline-block";
    updateSystemPrompt(chardesc, progression);
}

let questinfo = ``;

function selectQuest(number){
  if(number == 1){
    questinfo = `The user is in a magical maze, trying to reach the center. The user must progress through at least 4 rooms before you can reach the center. Of these rooms, one must have a treasure chest sealed by vines, and one must have an angry goblin who will fight the user. When the user enters the center of the maze (the room after room 4) they have won and the game is over.`;
    document.getElementById("quest1").style.backgroundColor = "#007bff"
    document.getElementById("quest2").style.backgroundColor = "#0056b3"
    document.getElementById("quest3").style.backgroundColor = "#0056b3"
    document.getElementById("questblurb").innerHTML = "WIP quest1 info"; //ADD QUEST 1 INFO
  }
  if(number == 2){
    questinfo = `The user is in an office building, which is a front for a band of ninjas. The user must progress through 6 rooms before reaching the boss's office, who is the leader of the group of ninjas. The user has been tasked with defeating this leader. The first room does not have any enemies, being a regular reception room, and the rest are normal office rooms, but each room (except for the reception room) will contain a ninja disguised as an office worker, who is a master at some office-related weapon (for example, using scissors as throwing knives, or a stapler as nunchucks). These ninjas are hostile to the user, but those in the second or third room can be fooled to letting the user pass. The final room (the room after room 6) is the boss's office. The boss wields all of the office ninja weapons, and is a master at all of them. The boss is immediately hostile towards the user, and will not go down without a fight. The game is over when the boss is defeated.`;
    document.getElementById("quest2").style.backgroundColor = "#007bff"
    document.getElementById("quest1").style.backgroundColor = "#0056b3"
    document.getElementById("quest3").style.backgroundColor = "#0056b3"
    document.getElementById("questblurb").innerHTML = "WIP quest2 info"; //ADD QUEST 2 INFO
  }
  if(number == 3){
    questinfo = ``;
    document.getElementById("quest3").style.backgroundColor = "#007bff"
    document.getElementById("quest2").style.backgroundColor = "#0056b3"
    document.getElementById("quest1").style.backgroundColor = "#0056b3"
    document.getElementById("questblurb").innerHTML = "WIP quest3 info"; //ADD QUEST 3 INFO
  }
  document.getElementById("confirmbtn").style.display = "inline-block";
  document.getElementById("questblurb").style.display = "block";
}

function confirmQuest(){
  document.getElementById("questSelect").style.display = "none";
  document.getElementById("characterSelect").style.display = "grid";
}

function updateSystemPrompt(chardesc1, progression1){
  systemPrompt = `Highest Priority:
    
    ${questinfo}

    The user is currently in room ${progression1}.

    You are a game master, running a fantasy game. The user's character is ${chardesc1} (avoid quoting the character description verbatim) Based on the previous quest information, generate a description of the room the user is currently in.
    
    Your response MUST be in this format: Current time, location + (new paragraph) main descriptions(story's progress) + "<choices>" + json of three choices and if the game is over and if any health is lost and if any health is gained and if they have progressed a room + "</choices>"

    ONLY RESPOND FOR THE CURRENT CONVERSATION!!!
    
    json format:
      {
        choice1: "Choice 1 text.",
        choice2: "Choice 2 text.",
        choice3: "Choice 3 text.",
        gameOver: 1 //if the game is over, 0. if the game is ongoing, 1 (integer, whole numbers only).
        healthLost: 0 //how many hit points the user loses if they are hurt (integer, whole numbers only).
        healthGained: 0 //how many hit points the user gains if they are healed (integer, whole numbers only).
        progression: 0 //if the user has progressed to the next room, 1. If they remain in the same room, 0. (1 or 0 only).
      }`
}

// connected to the server
socket.on("connect", () => {
  chatWindow.innerHTML =
    '<div>System: Connected to the server.</div>';
});

// listen for AI response from server
socket.on("ai_stream", (msg) => {

  if (msg === "on") {
    chatWindow.innerHTML = `<div class="msg-ai" id="loading">${msg}</div>`;
  } else if (msg.startsWith("[Error]")) {
    chatWindow.innerHTML += `<div class="msg-ai" id="loading">${msg}</div>`;
  } else if (msg.startsWith("[Chunk]")) {

    // update currentResponse
    currentResponse += msg.slice(9);

    // show message to user
    const loadingNode = document.getElementById("loading");
    if (loadingNode) loadingNode.remove(); // remove loading sign

    chatWindow.innerHTML = `<div class="msg-ai">${currentResponse}</div>`;

  } else if (msg === 'end'){

    console.log("Raw Msg: \n\n" + currentResponse);

    // update choices
    currentResponse = updateChoices(currentResponse);

    // show message to user
    const loadingNode = document.getElementById("loading");
    if (loadingNode) loadingNode.remove(); // remove loading sign

    chatWindow.innerHTML = `<div class="msg-ai">${currentResponse}</div>`;
    // add response to history
    chatHistory[chatHistory.length] = "Response " + Math.floor(chatHistory.size / 2) + ": " + currentResponse;

    // reset currentResponse
    currentResponse = "";
  }
  chatWindow.scrollTo({top:0, behavior:'auto'});
});

socket.on("data_response", (msg) => {
  if (msg.startsWith("[Error]")) {
    chatWindow.innerHTML += `<div class="msg-ai" id="loading"><strong>Data AI:</strong> ${msg}</div>`;
  }

  eventMemory.add(msg);

  console.log("memory updated: \n\n" + msg);
  document.getElementById("choice-1").disabled = false;
  document.getElementById("choice-2").disabled = false;
  document.getElementById("choice-3").disabled = false;
  document.getElementById("buttonSend").disabled = false;

});

// send message to server
function sendMessage() {
  document.getElementById("healthcontainer").style.display = "block";
  document.getElementById("buttonStart").style.display = "none";
  document.getElementById("characterSelect").style.display = "none";
  
  document.getElementById("inputBox").style.display = "grid";
  document.getElementById("choice-1").disabled = true;
  document.getElementById("choice-2").disabled = true;
  document.getElementById("choice-3").disabled = true;
  document.getElementById("buttonSend").disabled = true;
  chatWindow.innerHTML = "";
  let text = userInput.value.trim();
  let request = systemPrompt;

  //add luck modifier
  luck = Math.floor(Math.random() * 3);
  if(luck == 0){ //unlucky
    request += "\n\n User luck: Unlucky. The action the user just tried to do will end in failure"
  }
   if(luck == 2){ //lucky
     request += "\n\n User luck: Lucky. The action the user has just tried to do will brilliantly succeed, unless it is impossible to the user to do."
   }
  

  // check for empty input
  if (chatHistory.length !== 0 & !text) return;
 
  // give AI the chat history
  request += "\n\nCurrent conversation: " + text + "\n\n";

  // initialize game
  if (chatHistory.length === 0) text = "Game Start";

  // add in permanent memory
  request += "\n\nImportant Memories: \n\n";
  for (const x of eventMemory) {
    request += "[" + x + "] \n\n";
  }

  // add in the last conversation's original text to make it smoother
  request += "\n\nLast Conversation: " + chatHistory[chatHistory.length - 2] + " " + chatHistory[chatHistory.length - 1];

  // show user's message in chatWindow
  chatWindow.innerHTML += `<div class="msg-user"><strong>You:</strong> ${text}</div>`;

  // log the whole prompt
  console.log("Prompt " + Math.floor(chatHistory.length / 2) + ": \n\n" + request);

  chatWindow.scrollTop = chatWindow.scrollHeight;

  // send text to server
  socket.emit("ask_ai", request, text);

  // update chatHistory with text
  chatHistory[chatHistory.length] = "Prompt " + Math.floor(chatHistory.size / 2) + ": " + text;

  userInput.value = "";
}

// press Enter to send the message
function checkEnter(e) {
  if (e.key === "Enter") sendMessage();
}

function applyChoice(choiceNumber) {
  if (!choiceNumber) return;

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
  
  // send message directly after a choice is selected
  sendMessage();
  // console.log("InputText: " + userInput.value);
}

function extractJsonFromString(text, start, end) {


  const result = text.split(start)[1].split(end)[0];

  console.log('Extracted JSON: \n\n' + result);

  // convert to json and return
  return JSON.parse(result);
}

function cutOffString(text, start, end) {

  const result = text.split(start)[0] + text.split(end)[1];

  // convert to json and return
  return result;
}

let movepercent = 0;

function updateChoices(response) {

  const choicesStart = "<choices>";
  const choicesEnd = "</choices>";

  const choicesJson = extractJsonFromString(response, choicesStart, choicesEnd);
  choice1.innerText = choicesJson.choice1;
  choice2.innerText = choicesJson.choice2;
  choice3.innerText = choicesJson.choice3;
  if(choicesJson.gameOver == 0 || choicesJson.gameOver == "0"){
    gameend = true;
    document.getElementById("inputBox").style.display = "none"; //temp get rid of the options
    document.getElementById("healthcontainer").style.display = "none";
  }
  currenthealth = currenthealth - choicesJson.healthLost + choicesJson.healthGained

  if(currenthealth > health){
    currenthealth = health;
  };

  movepercent = 100 - (100 * (currenthealth / health))
  document.getElementById("healthmover").style.transform = "translate(-" + movepercent + "%)";

  if(movepercent > 40){
    document.getElementById("healthbar").style.color = "black";
  }else{
    document.getElementById("healthbar").style.color = "white";
  };

  document.getElementById("healthbar").innerHTML = currenthealth + "/" + health;
  if(currenthealth < 0){
    gameend = true;
    document.getElementById("inputBox").style.display = "none"; //temp get rid of the options
    document.getElementById("healthcontainer").style.display = "none";
  };

  if(choicesJson.progression == 1 || choicesJson.progression == "1"){
    progression++;
  }
  console.log(progression);
  updateSystemPrompt(chardesc, progression);

  return cutOffString(response, choicesStart, choicesEnd);
}
