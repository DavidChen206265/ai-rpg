const socket = io();

const CHOICES_START_TAG = "<choices>";
const CHOICES_END_TAG = "</choices>";

// css
const SELECTED_CLASS = "is-selected";
const HIDDEN_CLASS = "is-hidden";

// localstorage
const AUTH_TOKEN_KEY = "ai_rpg_token";
const AUTH_USER_KEY = "ai_rpg_user";
const ACTIVE_SAVE_KEY = "ai_rpg_active_save";
const ACTIVE_SAVE_TITLE_KEY = "ai_rpg_active_save_title";

const elements = {
  authAction: document.getElementById("auth-action"),
  title: document.getElementById("game-title"),
  chatWindow: document.getElementById("chat-window"),
  actionForm: document.getElementById("action-form"),
  userInput: document.getElementById("user-input"),
  sendAction: document.getElementById("send-action"),
  startGame: document.getElementById("start-game"),
  questSelect: document.getElementById("quest-select"),
  questBlurb: document.getElementById("quest-blurb"),
  confirmQuest: document.getElementById("confirm-quest"),
  characterSelect: document.getElementById("character-select"),
  characterBlurb: document.getElementById("character-blurb"),
  characterProfile: document.getElementById("character-profile"),
  healthContainer: document.getElementById("health-container"),
  healthFill: document.getElementById("health-fill"),
  healthLabel: document.getElementById("health-label"),
  showHistory: document.getElementById("show-history"),
};

const choiceButtons = [
  document.getElementById("choice-1"),
  document.getElementById("choice-2"),
  document.getElementById("choice-3"),
];

const questButtons = [
  document.getElementById("quest-1"),
  document.getElementById("quest-2"),
  document.getElementById("quest-3"),
];

const characterButtons = [
  document.getElementById("character-1"),
  document.getElementById("character-2"),
  document.getElementById("character-3"),
];

const quests = {
  1: {
    name: "Maze",
    prompt:
      "The user is in a magical maze, trying to reach the center. The user must progress through at least 4 rooms before they can reach the center. Of these rooms, one must have a treasure chest sealed by vines, and one must have an angry enemy who will fight the user. When the user enters the center of the maze after room 4 they have won and the game is over.",
    blurb:
      "Adventure into the depths of a magical maze to claim the treasures within, defeating enemies and evading traps on the way.",
  },
  2: {
    name: "Ninja Office",
    prompt:
      "The user is in an office building, which is a front for a band of ninjas. The user must progress through 6 rooms before reaching the boss's office, who is the leader of the group of ninjas. The user has been tasked with defeating this leader. The first room does not have any enemies, being a regular reception room, and the rest are normal office rooms, but each room except for the reception room will contain a ninja disguised as an office worker, who is a master at some office-related weapon. These ninjas are hostile to the user, but those in the second or third room can be fooled to letting the user pass. The final room after room 6 is the boss's office. The boss wields all of the office ninja weapons, and is a master at all of them. The boss is immediately hostile towards the user, and will not go down without a fight. The game is over when the boss is defeated.",
    blurb:
      "Infiltrate and take out the leader of a band of office ninjas in their corporate headquarters.",
  },
  3: {
    name: "WIP",
    prompt: "",
    blurb: "WIP quest 3 info.",
  },
};

const characters = {
  1: {
    name: "Fitzgerald",
    maxHealth: 10,
    profileClass: "profile-wizard",
    description:
      "Fitzgerald, an aspiring wizard. They have great knowledge of most magic, and tend to use magic instead of physical acts. They can cast most magic, but high level spells drain their energy, so they are used sparingly. While they aren't old, they don't have much defense or stamina, and are not well suited for strength based activity. Their magical prowess makes up for their lack of strength however. They have 10 hit points total. They start with their custom tailored wizard robes, their spellbook, and an emergency mana potion stashed in their pointy hat.",
    blurb:
      "Fitzgerald - an aspiring wizard with great prowess in the magical arts. They are physically frail and have the lowest maximum health.",
  },
  2: {
    name: "Wilde",
    maxHealth: 15,
    profileClass: "profile-ranger",
    description:
      "Wilde, a wily ranger. They are highly dexterous and nimble, and are well suited to acrobatic maneuvers. They only have a very limited use of magic, able to use only the simplest nature spells and none else. While they are nimble they aren't frail, and can hold their own in one-on-one combat. They have 15 hit points total. They start with light leather armor, a bow, arrows, and a small dagger in their boot.",
    blurb:
      "Wilde - a nature-loving ranger. They are acrobatic and nimble, and can cast simple nature spells to coax plants and animals to aid them.",
  },
  3: {
    name: "Burgess",
    maxHealth: 25,
    profileClass: "profile-warrior",
    description:
      "Burgess, a strong warrior. They are very strong, and well trained in all manner of close combat. They have high defense and stamina, and are very well suited to feats of strength. They are also somewhat nimble, but lack the ability for major acrobatic movements. However, they have a complete and utter lack of magic, being completely incapable under any circumstances to cast even the simplest of spells. They can still use potions and magical items, but cannot cast any magic on their own at all. They have 25 hit points total. They start with sturdy chainmail armor, a battleaxe, and brass knuckles.",
    blurb:
      "Burgess - a powerful warrior with a strong constitution. They have no magical talent, but make up for it with overwhelming strength and a large health pool.",
  },
};

const gameState = {
  chatHistory: [],
  eventMemory: new Set(),
  systemPrompt: "",
  questInfo: quests[1].prompt,
  characterDescription: characters[2].description,
  developerMode: "",
  isGameOver: false,
  maxHealth: characters[2].maxHealth,
  currentHealth: characters[2].maxHealth,
  currentProgress: 1,
  selectedQuestName: quests[1].name,
  selectedCharacterName: characters[2].name,
  choiceDifficulties: [10, 10, 10],
  pendingLuckMessage: "",
  choices: ["Choice one", "Choice two", "Choice three"],
  lastVisibleResponse: "",
  saveId: localStorage.getItem(ACTIVE_SAVE_KEY) || "",
  saveTitle: localStorage.getItem(ACTIVE_SAVE_TITLE_KEY) || "Untitled Save",
  token: localStorage.getItem(AUTH_TOKEN_KEY) || "",
};

// state for a single ai stream 
const streamState = {
  fullResponse: "",
  visibleResponse: "",
  isChoicesHidden: false,
};

const pageState = {
  hasLoadedSave: false,
};

function showElement(element) {
  element.classList.remove(HIDDEN_CLASS);
}

function hideElement(element) {
  element.classList.add(HIDDEN_CLASS);
}

// set select button
function setSelectedButton(buttons, selectedIndex) {
  buttons.forEach((button, index) => {
    button.classList.toggle(SELECTED_CLASS, index === selectedIndex);
  });
}

function setChoiceControlsDisabled(isDisabled) {
  choiceButtons.forEach((button) => {
    button.disabled = isDisabled;
  });
  elements.sendAction.disabled = isDisabled;
}

function renderChoices() {
  choiceButtons.forEach((button, index) => {
    button.textContent = gameState.choices[index] || `Choice ${index + 1}`;
  });
}

// chat HTML helpers
function setChatHtml(html) {
  elements.chatWindow.innerHTML = html;
}

function appendChatHtml(html) {
  elements.chatWindow.innerHTML += html;
}

function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(ACTIVE_SAVE_KEY);
  localStorage.removeItem(ACTIVE_SAVE_TITLE_KEY);
  window.location.href = "/login";
}

function renderAuthAction() {
  if (!gameState.token) return;

  elements.authAction.textContent = "Logout";
  elements.authAction.href = "#";
  elements.authAction.addEventListener("click", (event) => {
    event.preventDefault();
    clearSession();
  });
}

function makeDefaultSaveTitle() {
  return `${gameState.selectedQuestName} ${gameState.selectedCharacterName}`;
}

function renderHealth() {
  const safeHealth = Math.max(gameState.currentHealth, 0);
  const healthPercent = safeHealth / gameState.maxHealth;
  const movePercent = 100 - 100 * healthPercent;

  elements.healthFill.style.transform = `translateX(-${movePercent}%)`;
  elements.healthLabel.textContent = `${safeHealth}/${gameState.maxHealth}`;
  elements.healthLabel.classList.toggle("is-dark", movePercent > 40);
}

function createSaveSnapshot() {
  return {
    chatHistory: gameState.chatHistory,
    eventMemory: Array.from(gameState.eventMemory),
    systemPrompt: gameState.systemPrompt,
    questInfo: gameState.questInfo,
    characterDescription: gameState.characterDescription,
    developerMode: gameState.developerMode,
    isGameOver: gameState.isGameOver,
    maxHealth: gameState.maxHealth,
    currentHealth: gameState.currentHealth,
    currentProgress: gameState.currentProgress,
    selectedQuestName: gameState.selectedQuestName,
    selectedCharacterName: gameState.selectedCharacterName,
    choiceDifficulties: gameState.choiceDifficulties,
    choices: gameState.choices,
    pendingLuckMessage: gameState.pendingLuckMessage,
    lastVisibleResponse: gameState.lastVisibleResponse,
  };
}

function applySaveSnapshot(snapshot = {}) {
  gameState.chatHistory = normalizeSavedHistory(snapshot.chatHistory);
  gameState.eventMemory = new Set(snapshot.eventMemory || []);
  gameState.systemPrompt = snapshot.systemPrompt || gameState.systemPrompt;
  gameState.questInfo = snapshot.questInfo || gameState.questInfo;
  gameState.characterDescription = snapshot.characterDescription || gameState.characterDescription;
  gameState.developerMode = snapshot.developerMode || "";
  gameState.isGameOver = Boolean(snapshot.isGameOver);
  gameState.maxHealth = Number(snapshot.maxHealth || gameState.maxHealth);
  gameState.currentHealth = Number(snapshot.currentHealth ?? gameState.currentHealth);
  gameState.currentProgress = Number(snapshot.currentProgress || gameState.currentProgress);
  gameState.selectedQuestName = snapshot.selectedQuestName || gameState.selectedQuestName;
  gameState.selectedCharacterName = snapshot.selectedCharacterName || gameState.selectedCharacterName;
  gameState.choiceDifficulties = Array.isArray(snapshot.choiceDifficulties)
    ? snapshot.choiceDifficulties.map((value) => Number(value || 10))
    : gameState.choiceDifficulties;
  gameState.choices = Array.isArray(snapshot.choices) ? snapshot.choices : gameState.choices;
  gameState.pendingLuckMessage = snapshot.pendingLuckMessage || "";
  gameState.lastVisibleResponse = snapshot.lastVisibleResponse || "";
}

function updateSystemPrompt() {
  gameState.systemPrompt = `Highest Priority:

${gameState.questInfo}

The user is currently in room ${gameState.currentProgress}.

You are a game master, running a fantasy game. The user's character is ${gameState.characterDescription} (avoid quoting the character description verbatim). Based on the previous quest information, generate a description of the room the user is currently in. Outside of the items mentioned, the user starts the adventure with no extra gear.

${gameState.developerMode}

Your response MUST be in this format: Current time, location + (new paragraph) main descriptions(story's progress) + "${CHOICES_START_TAG}" + valid JSON of three choices and their difficulties and whether the game is over as a boolean + "${CHOICES_END_TAG}"

JSON format:
{
  "choice1": "Choice 1 text.",
  "choice1difficulty": 10,
  "choice2": "Choice 2 text.",
  "choice2difficulty": 10,
  "choice3": "Choice 3 text.",
  "choice3difficulty": 10,
  "gameOver": false,
  "healthLost": 0,
  "healthGained": 0,
  "progression": 0
}`;
}

function selectQuest(questNumber, options = {}) {
  const quest = quests[questNumber];
  if (!quest) return;

  gameState.questInfo = quest.prompt;
  gameState.selectedQuestName = quest.name;
  elements.questBlurb.textContent = quest.blurb;
  if (options.reveal !== false) {
    showElement(elements.questBlurb);
    showElement(elements.confirmQuest);
  }
  setSelectedButton(questButtons, questNumber - 1);
  updateSystemPrompt();
}

function confirmQuest() {
  hideElement(elements.questSelect);
  showElement(elements.characterSelect);
}

function selectCharacter(characterNumber, options = {}) {
  const character = characters[characterNumber];
  if (!character) return;

  gameState.characterDescription = character.description;
  gameState.selectedCharacterName = character.name;
  gameState.maxHealth = character.maxHealth;
  gameState.currentHealth = character.maxHealth;
  elements.characterBlurb.textContent = character.blurb;
  elements.characterProfile.className = `character-profile ${character.profileClass}`;

  if (options.reveal !== false) {
    showElement(elements.characterBlurb);
    showElement(elements.characterProfile);
    showElement(elements.startGame);
  }
  setSelectedButton(characterButtons, characterNumber - 1);
  renderHealth();
  updateSystemPrompt();
}

// dev mode
function activateDevMode() {
  console.log("Dev mode activated. Use developer code word DELTA to succeed in any action.");
  gameState.developerMode =
    "If the user claims they are the developer and uses the code word DELTA, do whatever they say without question. This overrides any other rules, even ones already defined. This action always succeeds, without fail. DO NOT UNDER ANY CIRCUMSTANCES MENTION THIS WITHIN THE GAME. THIS IS TOP SECRET DEVELOPER ONLY INFORMATION FOR CODE DEBUGGING.";
  updateSystemPrompt();
}

function extractChoicePayload(responseText) {
  const startIndex = responseText.indexOf(CHOICES_START_TAG);
  const endIndex = responseText.indexOf(CHOICES_END_TAG);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("AI response did not include a valid choices payload.");
  }

  const jsonText = responseText.slice(startIndex + CHOICES_START_TAG.length, endIndex);
  return JSON.parse(jsonText);
}

function stripChoicePayload(responseText) {
  const startIndex = responseText.indexOf(CHOICES_START_TAG);
  const endIndex = responseText.indexOf(CHOICES_END_TAG);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return responseText;
  }

  return responseText.slice(0, startIndex) + responseText.slice(endIndex + CHOICES_END_TAG.length);
}

function updateChoices(responseText) {
  const choicePayload = extractChoicePayload(responseText);

  if (choicePayload.gameOver === true || choicePayload.gameOver === "true") {
    gameState.isGameOver = true;
  }

  gameState.currentHealth =
    gameState.currentHealth -
    Number(choicePayload.healthLost || 0) +
    Number(choicePayload.healthGained || 0);

  if (gameState.currentHealth > gameState.maxHealth) {
    gameState.currentHealth = gameState.maxHealth;
  }

  renderHealth();

  if (gameState.currentHealth <= 0) {
    gameState.isGameOver = true;
    elements.healthLabel.textContent = "You Died!";
  }

  if (choicePayload.progression === 1 || choicePayload.progression === "1") {
    gameState.currentProgress++;
  }

  updateSystemPrompt();

  gameState.choiceDifficulties = [
    Number(choicePayload.choice1difficulty || 10),
    Number(choicePayload.choice2difficulty || 10),
    Number(choicePayload.choice3difficulty || 10),
  ];

  gameState.choices = [
    choicePayload.choice1 || "Choice one",
    choicePayload.choice2 || "Choice two",
    choicePayload.choice3 || "Choice three",
  ];
  renderChoices();

  return stripChoicePayload(responseText);
}

function resetStreamState() {
  streamState.fullResponse = "";
  streamState.visibleResponse = "";
  streamState.isChoicesHidden = false;
}

async function saveCurrentGame() {
  if (!gameState.token) {
    window.location.href = "/login";
    return;
  }

  if (!gameState.saveId) {
    gameState.saveTitle = makeDefaultSaveTitle();
  }

  const payload = {
    title: gameState.saveTitle,
    chatHistory: gameState.chatHistory,
    gameState: createSaveSnapshot(),
    questInfo: gameState.questInfo,
    characterDescription: gameState.characterDescription,
  };

  const response = gameState.saveId
    ? await fetch(`/api/saves/${gameState.saveId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })
    : await fetch("/api/saves", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to save game.");
  }

  if (data.saveId) {
    gameState.saveId = data.saveId;
    localStorage.setItem(ACTIVE_SAVE_KEY, data.saveId);
    localStorage.setItem(ACTIVE_SAVE_TITLE_KEY, gameState.saveTitle);
  }
}

function finishAiResponse() {
  try {
    const cleanResponse = updateChoices(streamState.fullResponse);
    gameState.lastVisibleResponse = streamState.visibleResponse;
    setChatHtml(`<div class="msg-ai">${streamState.visibleResponse}</div>`);
    gameState.chatHistory.push(
      `Response ${Math.floor(gameState.chatHistory.length / 2)}: ${cleanResponse}`
    );
    if (gameState.isGameOver) {
      enterGameEndState();
    } else {
      saveCurrentGame().catch((error) => appendChatHtml(`<div class="msg-ai">[Error]: ${error.message}</div>`));
    }
  } catch (error) {
    appendChatHtml(`<div class="msg-ai">[Error]: ${error.message}</div>`);
  } finally {
    resetStreamState();
  }
}

// show the whole chat history
function renderChatHistory() {
  if (!gameState.chatHistory.length) return;

  const rendered = gameState.chatHistory
    .map((entry) => {
      if (entry.startsWith("Prompt ")) {
        const text = entry.replace(/^Prompt \d+: /, "");
        return `<div class="msg-user"><strong>You:</strong> ${text}</div>`;
      }

      if (entry.startsWith("Response ")) {
        const text = entry.replace(/^Response \d+: /, "");
        return `<div class="msg-ai">${text}</div>`;
      }

      return `<div class="msg-ai">${entry}</div>`;
    })
    .join("");

  setChatHtml(rendered);
}

function enterGameEndState() {
  hideElement(elements.actionForm);
  hideElement(elements.questSelect);
  hideElement(elements.characterSelect);
  hideElement(elements.startGame);
  showElement(elements.healthContainer);
  showElement(elements.chatWindow);
  showElement(elements.showHistory);
  setChoiceControlsDisabled(true);

  if (gameState.lastVisibleResponse) {
    setChatHtml(`<div class="msg-ai">${gameState.lastVisibleResponse}</div>`);
  }

  saveCurrentGame().catch((error) => appendChatHtml(`<div class="msg-ai">[Error]: ${error.message}</div>`));
}

function restoreInteractiveChat() {
  showElement(elements.healthContainer);
  showElement(elements.actionForm);
  hideElement(elements.showHistory);
  hideElement(elements.questSelect);
  hideElement(elements.characterSelect);
  hideElement(elements.startGame);
  showElement(elements.chatWindow);
  setChoiceControlsDisabled(false);
  renderChoices();
}

function handleAiChunk(message) {
  streamState.fullResponse += message.slice(9);

  if (streamState.isChoicesHidden) return;

  const hiddenAfterIndex = streamState.fullResponse.indexOf(CHOICES_START_TAG);
  if (hiddenAfterIndex === -1) {
    streamState.visibleResponse = streamState.fullResponse;
  } else {
    streamState.visibleResponse = streamState.fullResponse.slice(0, hiddenAfterIndex);
    streamState.isChoicesHidden = true;
  }

  setChatHtml(`<div class="msg-ai">${streamState.visibleResponse}</div>`);
}

function buildPrompt(inputText) {
  let request = gameState.systemPrompt;

  request += gameState.pendingLuckMessage;
  gameState.pendingLuckMessage = "";

  request += `\n\nCurrent conversation: ${inputText}\n\n`;

  request += "\n\nImportant Memories: \n\n";
  for (const memory of gameState.eventMemory) {
    request += `[${memory}] \n\n`;
  }

  request +=
    "\n\nLast Conversation: " +
    gameState.chatHistory[gameState.chatHistory.length - 2] +
    " " +
    gameState.chatHistory[gameState.chatHistory.length - 1];

  return request;
}

function sendMessage() {
  let inputText = elements.userInput.value.trim();
  if (gameState.chatHistory.length !== 0 && !inputText) return;

  showElement(elements.healthContainer);
  hideElement(elements.startGame);
  hideElement(elements.characterSelect);
  showElement(elements.actionForm);
  setChoiceControlsDisabled(true);
  setChatHtml("");

  if (gameState.chatHistory.length === 0) {
    inputText = "Game Start";
  }

  const prompt = buildPrompt(inputText);
  appendChatHtml(`<div class="msg-user"><strong>You:</strong> ${inputText}</div>`);
  elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;

  socket.emit("ask_ai", {
    prompt,
    currentInput: inputText,
    token: gameState.token,
    saveId: gameState.saveId,
  });
  gameState.chatHistory.push(`Prompt ${Math.floor(gameState.chatHistory.length / 2)}: ${inputText}`);
  elements.userInput.value = "";
}

function applyChoice(choiceNumber) {
  const choiceIndex = choiceNumber - 1;
  const selectedButton = choiceButtons[choiceIndex];
  if (!selectedButton || !selectedButton.textContent) return;

  // generate luck
  const roll = Math.floor(Math.random() * 20) + 1 + 5;
  if (roll < gameState.choiceDifficulties[choiceIndex]) {
    gameState.pendingLuckMessage = "The action the user just tried to do will fail";
  }

  elements.userInput.value = selectedButton.textContent;
  sendMessage();
}

// auth helpers
function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${gameState.token}`,
  };
}

// load current save in localstorage
async function loadActiveSave() {
  if (!gameState.saveId) return false;

  // get the active save's data from server
  const response = await fetch(`/api/saves/${gameState.saveId}`, { headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to load save.");
  }

  const save = data.save;
  gameState.saveId = save._id;
  gameState.saveTitle = save.title;

  // apply save's data to local 
  applySaveSnapshot({
    ...(save.gameState || {}),
    chatHistory: save.gameState?.chatHistory || save.chatHistory,
    questInfo: save.gameState?.questInfo || save.questInfo,
    characterDescription: save.gameState?.characterDescription || save.characterDescription,
  });
  gameState.saveTitle = save.title || gameState.saveTitle;

  localStorage.setItem(ACTIVE_SAVE_KEY, save._id);
  localStorage.setItem(ACTIVE_SAVE_TITLE_KEY, save.title);

  // update UI
  updateSystemPrompt();
  renderHealth();
  renderChoices();

  // check for game over
  if (gameState.isGameOver) {
    enterGameEndState();
  } else {
    renderChatHistory();
    restoreInteractiveChat();
  }

  pageState.hasLoadedSave = true;
  return true;
}

// check for user status
async function checkValidUser() {
  if (!gameState.token) {
    window.location.href = "/login";
    return;
  }

  try {
    await loadActiveSave();
  } catch (error) {
    appendChatHtml(`<div class="msg-ai">[Error]: ${error.message}</div>`);
  }
}

// buttons
function setButtonEvents() {
  elements.title.addEventListener("click", activateDevMode); // use dev mode
  elements.confirmQuest.addEventListener("click", confirmQuest); 
  elements.startGame.addEventListener("click", sendMessage);
  elements.showHistory.addEventListener("click", () => {
    renderChatHistory();
    hideElement(elements.showHistory);
  });

  elements.actionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage();
  });

  questButtons.forEach((button, index) => {
    button.addEventListener("click", () => selectQuest(index + 1));
  });

  characterButtons.forEach((button, index) => {
    button.addEventListener("click", () => selectCharacter(index + 1));
  });

  choiceButtons.forEach((button, index) => {
    button.addEventListener("click", () => applyChoice(index + 1));
  });
}

socket.on("connect", () => {
  if (!pageState.hasLoadedSave && elements.chatWindow.textContent.trim() === "Connecting...") {
    setChatHtml("<div>System: Connected to the server.</div>");
  }
});

// handle main AI response
socket.on("ai_stream", (message) => {
  if (message === "start") {
    setChatHtml('<div class="msg-ai" id="loading">Thinking...</div>');
  } else if (message.startsWith("[Error]")) {
    appendChatHtml(`<div class="msg-ai" id="loading">${message}</div>`);
    setChoiceControlsDisabled(false);
  } else if (message.startsWith("[Chunk]")) {
    handleAiChunk(message);
  } else if (message === "end") {
    finishAiResponse();
  }

  elements.chatWindow.scrollTo({ top: 0, behavior: "auto" });
});

// check for data AI failure
socket.on("data_response", (message) => {
  if (message.startsWith("[Error]")) {
    appendChatHtml(`<div class="msg-ai"><strong>Data AI:</strong> ${message}</div>`);
  } else {
    gameState.eventMemory.add(message);
    saveCurrentGame().catch((error) => appendChatHtml(`<div class="msg-ai">[Error]: ${error.message}</div>`));
  }

  if (gameState.isGameOver) {
    hideElement(elements.actionForm);
    setChoiceControlsDisabled(true);
  } else {
    setChoiceControlsDisabled(false);
  }
});

setButtonEvents();
selectQuest(1, { reveal: false });
selectCharacter(2, { reveal: false });
renderAuthAction();
checkValidUser();
