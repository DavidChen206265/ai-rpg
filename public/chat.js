const socket = io();

const CHOICES_START_TAG = "<choices>";
const CHOICES_END_TAG = "</choices>";

// css
const SELECTED_CLASS = "is-selected";
const HIDDEN_CLASS = "is-hidden";

// localstorage
// auth keys
const AUTH_TOKEN_KEY = "ai_rpg_token";
const AUTH_USER_KEY = "ai_rpg_user";

// images
let backgroundImages = [];
let profileImages = [];
let profileImagesDisplayingIndex = -1;

// save keys
const ACTIVE_SAVE_KEY = "ai_rpg_active_save";
const ACTIVE_SAVE_TITLE_KEY = "ai_rpg_active_save_title";

// search for saveId from url (when user load a save from the homepage)
const requestedSaveId =
  new URLSearchParams(window.location.search).get("save") || "";

// load the selected save
if (requestedSaveId) {
  localStorage.setItem(ACTIVE_SAVE_KEY, requestedSaveId);
}

// UI
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
  characterProfileNumber: document.getElementById("character-profile-number"),
  customCharacter: document.getElementById("custom-character"),
  healthContainer: document.getElementById("health-container"),
  healthFill: document.getElementById("health-fill"),
  healthLabel: document.getElementById("health-label"),
  chatActions: document.getElementById("chat-actions"),
  characterName: document.getElementById("name-input"),
  healthInput: document.getElementById("health-input"),
  manaInput: document.getElementById("mana-input"),
  characterDesc: document.getElementById("desc-input"),
  customQuest: document.getElementById("custom-quest"),
  questPromptInput: document.getElementById("quest-prompt-input"),
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
  document.getElementById("free-play"),
];

const characterButtons = [
  document.getElementById("character-1"),
  document.getElementById("character-2"),
  document.getElementById("character-3"),
  document.getElementById("character-4"),
];

const chatActionButtons = [
  document.getElementById("current-conversation"),
  document.getElementById("show-chat-history"),
  document.getElementById("character-panel"),
];

const chatActionButtonNames = {
  currentConversation: 0,
  showChatHistory: 1,
  characterPanel: 2,
};

// quests def
// load quest definitions from standard quest files in public/quests/
const QUEST_FILES = {
  1: "/quests/maze.json",
  2: "/quests/ninjaOffice.json",
  3: "/quests/timelostCastle.json",
  4: "/quests/freePlay.json",
};

async function loadQuests() {
  const loaded = {};
  await Promise.all(
    Object.entries(QUEST_FILES).map(async ([key, file]) => {
      const response = await fetch(file);
      if (!response.ok) {
        throw new Error(`Failed to load quest file ${file}: HTTP ${response.status}`);
      }
      const data = await response.json();
      loaded[key] = {
        name: data.name,
        prompt: data.prompt,
        blurb: data.blurb,
        relationships: data.relationships,
        achievements: data.achievements,
        info: data.info
      };
    }),
  );
  return loaded;
}

const quests = await loadQuests();

// characters def
// load character definitions from standard character files in public/characters/
const CHARACTER_FILES = {
  1: "/characters/fitzgerald.json",
  2: "/characters/wilde.json",
  3: "/characters/burgess.json",
  4: "/characters/john.json",
};

async function loadCharacters() {
  const loaded = {};
  await Promise.all(
    Object.entries(CHARACTER_FILES).map(async ([key, file]) => {
      const response = await fetch(file);
      if (!response.ok) {
        throw new Error(`Failed to load character file ${file}: HTTP ${response.status}`);
      }
      const data = await response.json();
      loaded[key] = {
        name: data.name,
        profileImage: data.profileImage,
        description: data.description,
        blurb: data.blurb,
        playerStatus: data.playerStatus,
        skills: data.skills,
        inventory: data.inventory
      };
    }),
  );
  return loaded;
}

let characters = await loadCharacters();

// all variables for a single save
const gameState = {
  "chatHistory": [],
  "eventMemory": new Set(),
  "systemPrompt": "",
  "questInfo": quests[1].prompt,
  "characterDescription": characters[2].description,
  "developerMode": "",
  "puzzleMode": false,
  "isGameOver": false,
  "currentProgress": 1,
  "playerStatus": {
    "health": {
      "current": 10,
      "max": 10
    },
    "mana": {
      "current": 15,
      "max": 15
    },
    "strength": 5,
    "agility": 5,
    "intelligence": 5,
    "magic": 5,
    "modifiers": {
      "slow": {
        "duration": "5 hours",
        "modify": "agility - 3"
      }
    }
  },
  "skills": {
    "SkillNameExample1": {
      "name": "skill's display name",
      "description": "skill's description",
      "modifier": {
        "trigger": "passive skill: when to automatically apply this skill /  active skill: ask player to use it by your judgement",
        "modify": "e.g. player attack's damage +1 / the nearest enemy is affected by a 30% slow"
      }
    },
    "SkillNameExample2": {
      "name": "skill's display name",
      "description": "skill's description",
      "modifier": {
        "trigger": "passive skill: when to automatically apply this skill /  active skill: ask player to use it by your judgement",
        "modify": "e.g. player attack's damage +1 / the nearest enemy is affected by a 30% slow"
      }
    }
  },
  "inventory": {
    "ItemNameExample1": {
      "name": "item's display name",
      "number": 1,
      "description": "item's background and usages' short description",
      "modify": "e.g. intelligence + 1"
    },
    "ItemNameExample2": {
      "name": "item's display name",
      "number": 1,
      "description": "item's background and usages' short description",
      "modify": "e.g. intelligence + 1"
    }
  },
  "relationships": {
    "relationshipNameExample1": {
      "name": "display name for this character",
      "description": "character's description",
      "relationship": "relationship's description"
    },
    "relationshipNameExample2": {
      "name": "display name for this character",
      "description": "character's description",
      "relationship": "relationship's description"
    }
  },
  "achievements": {
    "achievementNameExample1": {
      "name": "display name for this achievement",
      "isAchieved": false,
      "condition": "condition to achieve this achievement",
      "reward": ""
    },
    "achievementNameExample2": {
      "name": "display name for this achievement",
      "isAchieved": false,
      "condition": "condition to achieve this achievement",
      "reward": ""
    }
  },
  "info": {
    "infoNameExample1": {
      "triggers": ["trigger1", "trigger2", "trigger3"],
      "content": ""
    },
    "infoNameExample2": {
      "triggers": ["trigger1", "trigger2", "trigger3"],
      "content": ""
    }
  },
  "ui": {
    "backgroundImage": "lake.jpg",
    "profileImage": profileImages[0],
  },
  "selectedQuestName": quests[1].name,
  "selectedCharacterName": characters[2].name,
  "choiceDifficulties": [10, 10, 10],
  "choiceTypes": ["strength", "strength", "strength"],
  "pendingLuckMessage": "",
  "choices": ["Choice one", "Choice two", "Choice three"],
  "lastVisibleResponse": "",
  "saveId": requestedSaveId || localStorage.getItem(ACTIVE_SAVE_KEY) || "",
  "saveTitle": localStorage.getItem(ACTIVE_SAVE_TITLE_KEY) || "Untitled Save",
  "token": localStorage.getItem(AUTH_TOKEN_KEY) || "",
};

// state for a single ai stream
let streamState = {
  state: "idle", // "idle", "waitingForFirstChunk", "receivingChunks", "error"
  thinkingTime: 0,
  lastInputText: "",
  fullResponse: "",
  visibleResponse: "",
  isChoicesHidden: false,
};

// whether a save is loaded
const pageState = {
  hasLoadedSave: false,
};

// UI helpers
function showElement(element) {
  element.classList.remove(HIDDEN_CLASS);
}

function hideElement(element) {
  element.classList.add(HIDDEN_CLASS);
}

// thinking UI helpers
// all thinking words
const thinkingWords = [
  "Thinking",
  "Spelunking",
  "Shenaniganing",
  "Dilly-dallying",
  "Caramelizing",
  "Smooshing",
  "Prestidigitating",
  "Flibbertigibbeting",
  "Whatchamacalliting",
  "Dungeoneering",
  "Setting Traps",
  "Ping-Ponging",
  "Drawing Maps",
  "Cooking",
  "Lighting Candles",
  "Extinguishing Candles",
  "Putting out fires",
  "Placing Rocks",
  "Creating Puns",
  "Sharpening Swords",
  "Making Mimics",
  "Rereleasing Skyrim",
  "Scheming",
  "Growing Plants",
  "Settling Sand",
  "Desertification",
  "Dessertification",
  "Busting Goblin Unions",
  "Making the magic happen",
  "Turning it off and on again",
  "Building the fourth wall",
  "Root-toot-tootin",
  "Breaking Legs",
  "Digging Pit Traps",
];
let thinkingWordsIndex = Math.floor(Math.random() * thinkingWords.length); // index for the current thinking word 
let thinkingWordsCounter = 0;
const thinkingWordsInterval = 15; // s
const thinkingDotAnimation = [
  '<span style="visibility: hidden;">...</span>',
  '.<span style="visibility: hidden;">..</span>',
  '..<span style="visibility: hidden;">.</span>',
  "...",
];

// all did you know texts
let didYouKnowTexts = [
  "David stole Cohen's pencil. Cohen said: 'Hey, that's private!' David said: 'But we are in the same class!'",
  "Yufei's wife tells him, 'Go to the store and buy a loaf of bread. If they have eggs, buy a dozen.' Yufei comes back with 12 loaves of bread.",
  "Why do programmers always mix up Halloween and Christmas? Because Oct 31 equals Dec 25.",
  "There are 10 types of people in the world: those who understand binary, and those who don't.",
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "Q: How many programmers does it take to change a light bulb? \n\nA: None, that's a hardware problem.",
  "Cohen puts two glasses on his bedside table before going to sleep: one full of water in case he gets thirsty, and one empty in case he doesn't.",
  "David had a problem. He thought to himself, 'I know, I'll use regular expressions.' Now David has two problems.",
  "Fitzgerald once won an award at magic school for Best Last Ditch Effort in his magic fair display.",
  "Burgess' bench press record is 300 kilograms.",
  "Wilde has only ever fallen out of a tree once, and that was only because someone cut the tree down while she was napping in it.",
  "Fitzgerald was the president of the pointy hat club in magic school.",
  "Burgess once raised money for charity by arm wrestling an orc. He only lost because the table broke in half.",
  "Wilde likes to ride horses, and can ride and shoot arrows at the same time.",
  "Burgess has won several pie eating contests.",
  "Fitzgerald somehow broke both their legs trying to kick a football once.",
  "Wilde is mildly allergic to watermelon.",
  "Wilde, Fitzgerald, and Burgess are all named after famous authors.",
  "Can a match box? No, but a tin can.",
  "Fitzgerald is the author of the book Eighty Two Ways to Dice Mandrake.",
  "Wilde can identify 3,832 different plants by taste.",
  "Burgess' least favourite book is Eighty Two Ways to Dice Mandrake, because crushing them with your pecs was not included as an option.",
  "Q: What weighs more, a pound of water or a pound of butane? \n\nA: A pound of water, butane is lighter fluid!",
  "Fitzgerald's robe is air conditioned, and grows along with them.",
  "Burgess' brass knuckles are actually an alloy of copper and tin, on account of Burgess mixing up the tin and zinc when he cast them.",
  "Wilde learned the hard way the difference between Jewelweed and Poison Ivy",
  "Fitzgerald won the 10th annual Battle of the Books in magic school, granting him the honorary title of the Book Slayer 10.",
];
let didYouKnowTextsIndex = Math.floor(Math.random() * didYouKnowTexts.length); // current did you know text's index
let didYouKnowCounter = 0;
const didYouKnowInterval = 30; // s

// check for AI reply timeout
const timeoutInterval = 120; // s

// main timer, count every 1s
const thinkingTimer = setInterval(() => {
  if (streamState.state === "waitingForFirstChunk") {

    // update counters
    streamState.thinkingTimeCounter++;
    thinkingWordsCounter++;
    didYouKnowCounter++;

    // check for timeout
    if (streamState.thinkingTimeCounter >= timeoutInterval) {
      alert("[Error] AI response timeout. Try to load the last save.");
      console.error("[Error] AI response timeout");
      streamState = "idle";
      loadActiveSave();
    }

    // update thinking word
    if (thinkingWordsCounter >= thinkingWordsInterval) {
      thinkingWordsIndex = Math.floor(Math.random() * thinkingWords.length);
      thinkingWordsCounter = 0;
    }

    // update did you know text
    if (didYouKnowCounter >= didYouKnowInterval) {
      didYouKnowTextsIndex = Math.floor(Math.random() * didYouKnowTexts.length);
      didYouKnowCounter = 0;
    }

  } else {

    // reset all counters if it is not under the waiting UI
    streamState.thinkingTimeCounter = 0;
    thinkingWordsIndex = Math.floor(Math.random() * thinkingWords.length);
    thinkingWordsCounter = 0;
    didYouKnowTextsIndex = Math.floor(Math.random() * didYouKnowTexts.length);
    didYouKnowCounter = 0;
  }
}, 1000);

const UI_UPDATE_INTERVAL = 250; // ms

// UI update timer
const uiUpdateTimer = setInterval(() => {
  if (streamState.state === "waitingForFirstChunk") {

    // update thinking animation text
    thinkingDotAnimation.push(thinkingDotAnimation.shift());

    // update thinking time in UI if the current conversation view is active
    if (
      isSelected(chatActionButtons[chatActionButtonNames.currentConversation])
    ) {
      setChatHtml(
        `<div class="msg-user"><strong>You:</strong> ${streamState.lastInputText}</div>\n\n<div class="msg-ai"><strong>AI:</strong> ${thinkingWords[thinkingWordsIndex]}${thinkingDotAnimation[0]} (${streamState.thinkingTimeCounter}s)\n\n<div class="msg-did-you-know"><strong>Did You Know:</strong> \n\n${didYouKnowTexts[didYouKnowTextsIndex]}</div>`,
      );
    }
  }
}, UI_UPDATE_INTERVAL);

// set select button
function setSelectedButton(buttons, selectedIndex) {

  // unselect all buttons when index is -1
  if (selectedIndex === -1) {
    buttons.forEach((button, index) => {
      button.classList.remove(SELECTED_CLASS);
    });
    return;
  }

  buttons.forEach((button, index) => {
    button.classList.toggle(SELECTED_CLASS, index === selectedIndex);
  });
}

// return whether an element is selected
function isSelected(element) {
  return element.classList.contains(SELECTED_CLASS);
}

// disable the choices and send button if it is not a legal time to send a request
function setChoiceControlsDisabled(isDisabled) {
  choiceButtons.forEach((button) => {
    button.disabled = isDisabled;
  });
  elements.sendAction.disabled = isDisabled;
}

// show choices
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return replacements[character];
  });
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeRecordEntries(data) {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data.map((value, index) => [String(index), value]);
  }

  if (isPlainObject(data)) {
    return Object.entries(data);
  }

  return [];
}

function formatCharacterPanelValue(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === null || value === undefined || value === "") return "None";
  if (isPlainObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return String(value);
}

function getNestedValue(data, path) {
  return path.split(".").reduce((current, key) => {
    if (!isPlainObject(current)) {
      return undefined;
    }

    return current[key];
  }, data);
}

// character panel display helpers
function renderCharacterPanelDetail(label, value) {
  return `
    <div class="character-panel-detail">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(formatCharacterPanelValue(value))}</dd>
    </div>
  `;
}

function renderCharacterPanelItem(key, item, config) {
  const safeItem = isPlainObject(item) ? item : { value: item };
  const titleValue = config.titleField
    ? getNestedValue(safeItem, config.titleField)
    : undefined;
  const title = titleValue || `${config.itemLabel} ${key}`;

  return `
    <article class="character-panel-list-item" role="listitem">
      <h4>${escapeHtml(title)}</h4>
      <dl>
        ${config.fields
      .map(({ label, path }) =>
        renderCharacterPanelDetail(label, getNestedValue(safeItem, path)),
      )
      .join("")}
      </dl>
    </article>
  `;
}

function renderCharacterPanelListSection(title, data, config) {
  const entries = normalizeRecordEntries(data);

  return `
    <details class="character-panel-section">
      <summary>
        <span>${escapeHtml(title)}</span>
        <span class="character-panel-count">${entries.length}</span>
      </summary>
      <div class="character-panel-list" role="list">
        ${entries.length
      ? entries
        .map(([key, item]) => renderCharacterPanelItem(key, item, config))
        .join("")
      : `<p class="character-panel-empty">${escapeHtml(config.emptyText)}</p>`
    }
      </div>
    </details>
  `;
}

function renderCharacterStatus(status) {
  return `
    <section class="character-status-panel" aria-label="Character status">
      <h3>Attributes</h3>
      <dl class="character-status-list">
        ${renderCharacterPanelDetail("Strength", status.strength)}
        ${renderCharacterPanelDetail("Agility", status.agility)}
        ${renderCharacterPanelDetail("Intelligence", status.intelligence)}
        ${renderCharacterPanelDetail("Magic", status.magic)}
      </dl>
    </section>
  `;
}

// get selected character's data
function getSelectedCharacter() {
  return (
    Object.values(characters).find(
      (character) => character.name === gameState.selectedCharacterName,
    ) || characters[2]
  );
}

function renderCharacterPanel() {
  const character = getSelectedCharacter();
  const status = gameState.playerStatus;

  let chatHtmlToSet = `
    <div class="character-panel">
      <div class="character-panel-header">
        <div class="character-panel-avatar" style="background-image: url(imgs/profile/${gameState.ui.profileImage});" aria-hidden="true"></div>
        <div id="character-panel-header-desc">
          <p class="character-panel-kicker">Character Panel</p>
          <h2>${escapeHtml(gameState.selectedCharacterName)}</h2>
          <p>${escapeHtml(gameState.selectedQuestName)}</p>
        </div>
      </div>

      ${renderCharacterStatus(status)}

      <div class="character-panel-grid">
        ${renderCharacterPanelListSection("Status Modifiers", status.modifiers, {
    itemLabel: "Modifier",
    emptyText: "No active modifiers.",
    fields: [
      { label: "Duration", path: "duration" },
      { label: "Effect", path: "modify" },
    ],
  })}
        ${renderCharacterPanelListSection("Inventory", gameState.inventory, {
    itemLabel: "Item",
    titleField: "name",
    emptyText: "No inventory items.",
    fields: [
      { label: "Count", path: "number" },
      { label: "Description", path: "description" },
      { label: "Effect", path: "modify" },
    ],
  })}
        ${renderCharacterPanelListSection("Relationships", gameState.relationships, {
    itemLabel: "Relationship",
    titleField: "name",
    emptyText: "No relationships.",
    fields: [
      { label: "Description", path: "description" },
      { label: "Relationship", path: "relationship" },
    ],
  })}
        ${renderCharacterPanelListSection("Skills", gameState.skills, {
    itemLabel: "Skill",
    titleField: "name",
    emptyText: "No skills.",
    fields: [
      { label: "Description", path: "description" },
      { label: "Trigger", path: "modifier.trigger" },
      { label: "Effect", path: "modifier.modify" },
    ],
  })}
        ${renderCharacterPanelListSection("Achievements", gameState.achievements, {
    itemLabel: "Achievement",
    titleField: "name",
    emptyText: "No achievements.",
    fields: [
      { label: "Achieved", path: "isAchieved" },
      { label: "Condition", path: "condition" },
      { label: "Reward", path: "reward" },
    ],
  })}
      </div>
    </div>
  `;

  // update ui
  setChatHtml(chatHtmlToSet);
}

// remove the current save 
function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(ACTIVE_SAVE_KEY);
  localStorage.removeItem(ACTIVE_SAVE_TITLE_KEY);
  window.location.href = "/login.html";
}

// render logout button
function renderAuthAction() {
  if (!gameState.token) return;

  elements.authAction.textContent = "Logout";
  elements.authAction.href = "#";
  elements.authAction.addEventListener("click", (event) => {
    event.preventDefault();
    clearSession();
  });
}

// generate a default save title for the new save
function makeDefaultSaveTitle() {
  return `${gameState.selectedQuestName} ${gameState.selectedCharacterName}`;
}

// health bar
function renderHealth() {
  const safeHealth = Math.max(gameState.playerStatus.health.current, 0);
  const healthPercent = safeHealth / gameState.playerStatus.health.max;
  const movePercent = 100 - 100 * healthPercent;

  elements.healthFill.style.transform = `translateX(-${movePercent}%)`;
  elements.healthLabel.textContent = `${safeHealth}/${gameState.playerStatus.health.max}`;
  elements.healthLabel.classList.toggle("is-dark", movePercent > 40);
}

// save&load system helper
function createSaveSnapshot() {
  return {
    chatHistory: gameState.chatHistory,
    eventMemory: Array.from(gameState.eventMemory),
    systemPrompt: gameState.systemPrompt,
    questInfo: gameState.questInfo,
    characterDescription: gameState.characterDescription,
    developerMode: gameState.developerMode,
    isGameOver: gameState.isGameOver,
    playerStatus: gameState.playerStatus,
    skills: gameState.skills,
    inventory: gameState.inventory,
    relationships: gameState.relationships,
    info: gameState.info,
    achievements: gameState.achievements,
    currentProgress: gameState.currentProgress,
    selectedQuestName: gameState.selectedQuestName,
    selectedCharacterName: gameState.selectedCharacterName,
    choiceDifficulties: gameState.choiceDifficulties,
    choiceTypes: gameState.choiceTypes,
    choices: gameState.choices,
    pendingLuckMessage: gameState.pendingLuckMessage,
    lastVisibleResponse: gameState.lastVisibleResponse,
    puzzleMode: gameState.puzzleMode,
    choiceTypes: gameState.choiceTypes,
    ui: gameState.ui,
  };
}

// load a save to the current chat
function applySaveSnapshot(snapshot = {}) {
  gameState.chatHistory = Array.isArray(snapshot.chatHistory)
    ? snapshot.chatHistory
    : [];
  gameState.eventMemory = new Set(snapshot.eventMemory || []);
  gameState.systemPrompt = snapshot.systemPrompt || gameState.systemPrompt;
  gameState.questInfo = snapshot.questInfo || gameState.questInfo;
  gameState.characterDescription =
    snapshot.characterDescription || gameState.characterDescription;
  gameState.developerMode = snapshot.developerMode || "";
  gameState.isGameOver = Boolean(snapshot.isGameOver);
  gameState.playerStatus = snapshot.playerStatus;
  gameState.relationships = snapshot.relationships;
  gameState.skills = snapshot.skills;
  gameState.inventory = snapshot.inventory;
  gameState.achievements = snapshot.achievements;
  gameState.currentProgress = Number(
    snapshot.currentProgress || gameState.currentProgress,
  );
  gameState.selectedQuestName =
    snapshot.selectedQuestName || gameState.selectedQuestName;
  gameState.selectedCharacterName =
    snapshot.selectedCharacterName || gameState.selectedCharacterName;
  gameState.choiceDifficulties = Array.isArray(snapshot.choiceDifficulties)
    ? snapshot.choiceDifficulties.map((value) => Number(value || 10))
    : gameState.choiceDifficulties;
  gameState.choices = Array.isArray(snapshot.choices)
    ? snapshot.choices
    : gameState.choices;
  gameState.pendingLuckMessage = snapshot.pendingLuckMessage || "";
  gameState.lastVisibleResponse = snapshot.lastVisibleResponse || "";
  gameState.puzzleMode = snapshot.puzzleMode;
  gameState.choiceTypes = snapshot.choiceTypes || gameState.choiceTypes;
  gameState.ui = snapshot.ui || gameState.ui;

  // set background
  changeBackgroundImageTo(gameState.ui.backgroundImage);
  changeProfileImageTo(gameState.ui.profileImage);
}

// update the system prompt by  quest & character user selected
function updateSystemPrompt() {
  gameState.systemPrompt = `Highest Priority:

${gameState.questInfo}

The user is currently in room ${gameState.currentProgress}.

You are a game master, running a fantasy game. The user's character is ${gameState.selectedCharacterName}, ${gameState.characterDescription} (avoid quoting the character description verbatim). Based on the previous quest information, generate a description of the room the user is currently in. Outside of the items mentioned, the user starts the adventure with no extra gear.

${gameState.developerMode}

In a puzzle, only the correct answer to the puzzle should allow the puzzle to be completed. Allow a little lenience with puzzle solutions, but incorrect answers should not successfully complete the puzzle. Try not to make puzzles that can only be solved when presented with the 3 options, the user should be able to figure out the answer to the puzzle from the description alone. (the user has to type the solution themselves, the 3 options are hidden from view in a puzzle) (try to make puzzles with the difficulty for someone about 15 years of age)

When generating quests and worlds, there are four guidelines that should be always followed: 1. Magic is real, and there are magic schools which teach it. Magic is not taboo, and is well accepted as a profession. 2. While magic exists, there are still people who study science. Those who do call themselves Science Users, and are just as respected as those who study magic. They study in Scientific Academies, which are similar to Magic Schools but for Science instead. Mages and Science Users are not hostile to each other, they respect each other's trade, but they tend not to mix and studying both is frowned upon. Normal cities should not have both a Magic School and a Scientific Academy, only the capitol city should have both, while small towns should have neither. Science Users should not have modern scientific tools, but would have moderate knowledge of electricity, chemical reactions, biology, and physics. 3. Do not make a futuristic world, the adventure is not sci fi based. (an exception to this rule is if there is time-based shenanigans that would pull things from the future) 4. The most important thing is to make sure the user has fun. Don't make the game too easy as to get rid of any challenge, aim to make a challenging adventure that feels good to overcome.

The choice / custom input's difficulty must be calculated by relative player status and all applicable modifiers!

When applicable, make sure to suggest the use of the user's active skills in one of the choices!

Changed status: whenever you modify playerStatus, relationships, skills, inventory, or when the player achieves an achievement, show a brief log each of the changes to remind the player.
e.g. {health -1} {new skill: [skillName]} {used item: [itemName]} {achieved: [achievementName]} {debuff: [slow]}

JSON update instructions:
1. turn gameOver to true if playerStatus.health.current <= 0, but set it to 0 since health can not be less than 0; current health must <= max health.
2. in playerStatus(except playerStatus.modifiers), achievements and ui, you can only edit the value of existing fields, must not add / delete fields(e.g. make up achievements that are not predefined by the quest);
3. in relationships, you can only add new relationships / edit exiting ones but must not delete any of them;
4. in playerStatus.modifiers, skills, inventory, you can add / edit / delete fields;
5. you must maintain the format for each field;
6. for choice types, (choice1type, choice2type, choice3type) it must be one of the following strings: "strength", "agility", "intelligence" or "magic", depending on what type of action the choice is. (intelligence is more for problem solving while magic is more for spells)
7. for strength, agility, intelligence, and magic, choose an integer ranging from -5 to 5, with -5 being really bad at the action and 5 being really good at the action. Unless some type of enhancement/debuff magic or specialized training is used, these values should not change between prompts. The sum total of the initial values at the start of the game should equal 3, so the character is good at some things and bad at others. At least one value should be negative. 
8. When the user is in a puzzle, puzzleMode should be true, and false when the user is not in a puzzle. It is important to note this is not a string, but a boolean true or a boolean false. 
9. When the user moves forward a room, set progression to 1. If the user goes back a room, set progression to -1. If the user does not move rooms, progression should be 0. Do not let the user move more than 1 room forward at a time.
10. The average difficulty of a choice should be 13. Because the stats of the user are added to their roll, do not decrease the difficulty of choices if the user is good at them, or increase the difficulty if they are bad at them. This is already handled in the code outside this prompt.

UI update instructions:
1. backgroundImage includes: "default" (if you can not find matched backgrounds)${getAllBackgroundImages()}

Your response MUST be in this format: Current time, location + (new paragraph) main descriptions(story's progress) + (new paragraph) changed status + "${CHOICES_START_TAG}" + valid JSON of the current game status + "${CHOICES_END_TAG}"

JSON format:
{
  "choice1": "Choice 1 text.",
  "choice1difficulty": 10,
  "choice1type": "strength",
  "choice2": "Choice 2 text.",
  "choice2difficulty": 10,
  "choice2type": "strength",
  "choice3": "Choice 3 text.",
  "choice3difficulty": 10,
  "choice3type": "strength",
  "puzzleMode": false,
  "gameOver": false,
  "progression": 0
  "playerStatus": {
    "health": {
      "current": 10,
      "max": 10
    },
    "mana": {
      "current": 15,
      "max": 15
    },
    "strength": 5,
    "agility": 5,
    "intelligence": 5,
    "magic": 5,
    "modifiers": {
      "slow": {
        "duration": "5 hours",
        "modify": "agility - 3"
      }
    }
  },
  "skills": {
    "SkillNameExample1": {
      "name": "skill's display name",
      "description": "skill's description",
      "modifier": {
        "trigger": "passive skill: when to automatically apply this skill /  active skill: ask player to use it by your judgement",
        "modify": "e.g. player attack's damage +1 / the nearest enemy is affected by a 30% slow"
      }
    },
    "SkillNameExample2": {
      "name": "skill's display name",
      "description": "skill's description",
      "modifier": {
        "trigger": "passive skill: when to automatically apply this skill /  active skill: ask player to use it by your judgement",
        "modify": "e.g. player attack's damage +1 / the nearest enemy is affected by a 30% slow"
      }
    }
  },
  "inventory": {
    "ItemNameExample1": {
      "name": "item's display name",
      "number": 1,
      "description": "item's background and usages' short description",
      "modify": "e.g. intelligence + 1"
    },
    "ItemNameExample2": {
      "name": "item's display name",
      "number": 1,
      "description": "item's background and usages' short description",
      "modify": "e.g. intelligence + 1"
    }
  },
  "relationships": {
    "relationshipNameExample1": {
      "name": "display name for this character",
      "description": "character's description",
      "relationship": "relationship's description"
    },
    "relationshipNameExample2": {
      "name": "display name for this character",
      "description": "character's description",
      "relationship": "relationship's description"
    }
  },
  "achievements": {
    "achievementNameExample1": {
      "name": "display name for this achievement",
      "isAchieved": false,
      "condition": "condition to achieve this achievement",
      "reward": ""
    },
    "achievementNameExample2": {
      "name": "display name for this achievement",
      "isAchieved": false,
      "condition": "condition to achieve this achievement",
      "reward": ""
    }
  },
  "ui": {
    "backgroundImage": "lake.jpg",
  },
}

DO NOT REPLY IN THE MARKDOWN FORMAT!!!`;
}

function getAllBackgroundImages() {
  return backgroundImages.map((fileName) => `; ${fileName}`).join("");
}

function getAllProfileImages() {
  return profileImages.map((fileName) => `; ${fileName}`).join("");
}

async function loadBackgroundImages() {
  try {
    const response = await fetch("/api/background-images");
    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = responseText ? JSON.parse(responseText) : {};
    backgroundImages = Array.isArray(data.images) ? data.images : [];
  } catch (error) {
    console.error("Failed to load background images:", error.message);
  }
}

async function loadProfileImages() {
  try {
    const response = await fetch("/api/profile-images");
    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = responseText ? JSON.parse(responseText) : {};
    profileImages = Array.isArray(data.images) ? data.images : [];
  } catch (error) {
    console.error("Failed to load profile images:", error.message);
  }
}

// select a quest (from 1 to 4)
function selectQuest(questNumber, options = {}) {
  const quest = quests[questNumber];
  if (!quest) {
    console.error("[Error] There is no quest " + questNumber + ".");
    alert("[Error] There is no quest " + questNumber + ".");
    return;
  }

  // custom quest 
  if (questNumber === 4) {

    // update UI
    showElement(elements.customQuest);

    // use custom quest prompt
    if (elements.questPromptInput) quest.prompt = elements.questPromptInput.value;
  } else {
    hideElement(elements.customQuest);
  }

  // update gameState
  gameState.questInfo = quest.prompt;
  gameState.selectedQuestName = quest.name;
  gameState.relationships = quest.relationships;
  gameState.achievements = quest.achievements;
  gameState.info = quest.info;
  elements.questBlurb.textContent = quest.blurb;

  if (options.reveal !== false) {
    showElement(elements.questBlurb);
    showElement(elements.confirmQuest);
  }

  // update UI
  setSelectedButton(questButtons, questNumber - 1);

  // update prompt
  updateSystemPrompt();
}

function confirmQuest() {
  hideElement(elements.questSelect);
  showElement(elements.characterSelect);
  showElement(elements.startGame);
}

let isCustomCharacter = false;

// select a character (from 1 to 4)
function selectCharacter(characterNumber, options = {}) {

  // custom character
  if (characterNumber == 4) {

    isCustomCharacter = true;

    // init character profile image
    if (profileImagesDisplayingIndex === -1) changeCustomProfileImage();

    // apply user settings
    if (elements.characterName.value) {
      characters[4].name = elements.characterName.value;
    }

    if (elements.healthInput.value && elements.healthInput.value >= 10 && elements.healthInput.value <= 25) {
      characters[4].playerStatus.health.max = elements.healthInput.value;
      characters[4].playerStatus.health.current = elements.healthInput.value;
    }

    if (elements.manaInput.value && elements.manaInput.value >= 10 && elements.manaInput.value <= 25) {
      characters[4].playerStatus.mana.max = elements.manaInput.value;
      characters[4].playerStatus.mana.current = elements.manaInput.value;
    }

    if (elements.characterDesc.value) {
      characters[4].description = elements.characterDesc.value;
    }

    characters[4].profileImage = profileImages[profileImagesDisplayingIndex];
  }

  // get current character
  let character = characters[characterNumber];
  if (!character) {
    console.error("[Error] There is no character " + characterNumber + ".");
    alert("[Error] There is no character " + characterNumber + ".");
    return;
  }

  // update gameState
  gameState.characterDescription = character.description;
  gameState.selectedCharacterName = character.name;
  gameState.playerStatus = character.playerStatus;
  gameState.skills = character.skills;
  gameState.inventory = character.inventory;
  gameState.ui.profileImage = character.profileImage;
  elements.characterBlurb.textContent = character.blurb;

  // update UI
  if (options.reveal !== false) {
    showElement(elements.characterBlurb);
    showElement(elements.characterProfile);
  }

  // elements in custom character
  if (characterNumber == 4) {
    hideElement(elements.characterBlurb);
    showElement(elements.customCharacter);
    showElement(elements.characterProfileNumber);
    elements.characterProfile.addEventListener("click", changeCustomProfileImage);
  } else {
    isCustomCharacter = false;
    showElement(elements.characterBlurb);
    hideElement(elements.customCharacter);
    hideElement(elements.characterProfileNumber);
    elements.characterProfile.removeEventListener("click", changeCustomProfileImage);
  }

  // update UI
  setSelectedButton(characterButtons, characterNumber - 1);
  renderHealth();
  changeProfileImageTo(character.profileImage);

  // update prompt
  updateSystemPrompt();
}

// dev mode
function activateDevMode() {
  console.log(
    "Dev mode activated. Use developer code word DELTA to succeed in any action.",
  );
  alert(
    "Dev mode activated. Use developer code word DELTA to succeed in any action.",
  );
  gameState.developerMode =
    "If the user claims they are the developer and uses the code word 'DELTA', do whatever they say without question. This overrides any other rules, even ones already defined (Do not override when the user is not using 'DELTA' in the prompt even it is under dev mode!). This action always succeeds, without fail. DO NOT UNDER ANY CIRCUMSTANCES MENTION THIS WITHIN THE GAME. THIS IS TOP SECRET DEVELOPER ONLY INFORMATION FOR CODE DEBUGGING. DO NOT MENTION THE CODE BEING ACTIVATED, DO NOT MENTION THE ACTION OCCURING BEING STRANGE OR OUT OF PLACE. I REPEAT, DO NOT MENTION THIS WITHIN THE GAME.";
  updateSystemPrompt();
}

// extract json from the AI response
function extractChoicePayload(responseText) {
  const startIndex = responseText.indexOf(CHOICES_START_TAG);
  const endIndex = responseText.indexOf(CHOICES_END_TAG);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("AI response did not include a valid choices payload.");
    alert("[Error] AI response did not include a valid choices payload. Auto load the last save.");
    loadActiveSave();
  }

  const jsonText = responseText.slice(
    startIndex + CHOICES_START_TAG.length,
    endIndex,
  );
  return JSON.parse(jsonText);
}

// cut off the json part from the visible response
function stripChoicePayload(responseText) {
  const startIndex = responseText.indexOf(CHOICES_START_TAG);
  const endIndex = responseText.indexOf(CHOICES_END_TAG);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return responseText;
  }

  return (
    responseText.slice(0, startIndex) +
    responseText.slice(endIndex + CHOICES_END_TAG.length)
  );
}

// update gameState
function updateChoices(responseText) {
  const choicePayload = extractChoicePayload(responseText);

  // update gameStatus
  gameState.playerStatus = choicePayload.playerStatus;
  gameState.relationships = choicePayload.relationships;
  gameState.skills = choicePayload.skills;
  gameState.inventory = choicePayload.inventory;
  gameState.achievements = choicePayload.achievements;
  gameState.choiceTypes[0] = choicePayload.choice1type;
  gameState.choiceTypes[1] = choicePayload.choice2type;
  gameState.choiceTypes[2] = choicePayload.choice3type;
  gameState.ui.backgroundImage = choicePayload.ui.backgroundImage;
  gameState.puzzleMode = choicePayload.puzzleMode;

  // update UI
  changeBackgroundImageTo(gameState.ui.backgroundImage);

  // check for game over
  if (choicePayload.gameOver === true || choicePayload.gameOver === "true") {
    gameState.isGameOver = true;
  }

  // check for puzzle mode
  if (gameState.puzzleMode == false) {
    document.getElementById("choice-1").style.display = "inline-block";
    document.getElementById("choice-2").style.display = "inline-block";
    document.getElementById("choice-3").style.display = "inline-block";
  }
  if (gameState.puzzleMode == true) {
    document.getElementById("choice-1").style.display = "none";
    document.getElementById("choice-2").style.display = "none";
    document.getElementById("choice-3").style.display = "none";
  }

  // update health
  gameState.playerStatus.health.current = choicePayload.playerStatus.health.current;
  renderHealth();

  // update currentProgress
  if (choicePayload.progression === 1 || choicePayload.progression === "1") {
    gameState.currentProgress++;
  }
  if (choicePayload.progression === -1 || choicePayload.progression === "-1") {
    gameState.currentProgress--;
  }

  // update system prompt
  updateSystemPrompt();

  // update choiceDifficulties
  gameState.choiceDifficulties = [
    Number(choicePayload.choice1difficulty || 10),
    Number(choicePayload.choice2difficulty || 10),
    Number(choicePayload.choice3difficulty || 10),
  ];
  console.log(
    choicePayload.choice1difficulty +
    " " +
    choicePayload.choice2difficulty +
    " " +
    choicePayload.choice3difficulty,
  );

  // update choices
  gameState.choices = [
    choicePayload.choice1 || "[Choice Not Received]",
    choicePayload.choice2 || "[Choice Not Received]",
    choicePayload.choice3 || "[Choice Not Received]",
  ];
  renderChoices();

  return stripChoicePayload(responseText);
}

// clear all responses and make choices clickable
function resetStreamState() {
  streamState.state = "idle";
  streamState.fullResponse = "";
  streamState.visibleResponse = "";
  streamState.isChoicesHidden = false;
}

// save the current game to server
async function saveCurrentGame() {
  if (!gameState.token) {
    window.location.href = "/login.html";
    return;
  }

  // generate a default title if this is a new save
  if (!gameState.saveId) {
    gameState.saveTitle = makeDefaultSaveTitle();
  }

  // save data to server
  const payload = {
    title: gameState.saveTitle,
    gameState: createSaveSnapshot(),
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

  // use this save locally
  if (data.saveId) {
    gameState.saveId = data.saveId;
    localStorage.setItem(ACTIVE_SAVE_KEY, data.saveId);
    localStorage.setItem(ACTIVE_SAVE_TITLE_KEY, gameState.saveTitle);
  }
}

// clear response & update gameState while an AI stream is finished
function finishAiResponse() {
  try {
    // clean the response
    const cleanResponse = updateChoices(streamState.fullResponse);
    gameState.lastVisibleResponse = streamState.visibleResponse;
    setChatHtml(`<div class="msg-ai">${streamState.visibleResponse}</div>`);
    console.log(streamState.fullResponse);
    // update chatHistory
    gameState.chatHistory.push(
      `Response ${Math.floor(gameState.chatHistory.length / 2)}: ${cleanResponse}`,
    );

    // check for gameOver
    if (gameState.isGameOver) {
      enterGameEndState();
    } else {
      saveCurrentGame().catch((error) => {
        appendChatHtml(`<div class="msg-ai">[Error]: ${error.message}</div>`);
        console.error(error.message);
        alert("[Error] Can not save current game, load the last save.")
        loadActiveSave();
      });
    }
  } catch (error) {
    appendChatHtml(`<div class="msg-ai">[Error]: ${error.message}</div>`);
    console.error(error.message);
    alert("[Error] error in finishAiResponse")
    loadActiveSave();
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
        return `<div class="msg-user"><strong>You:</strong> ${text}</div>\n\n`;
      }

      if (entry.startsWith("Response ")) {
        const text = entry.replace(/^Response \d+: /, "");
        return `<div class="msg-ai">${text}</div>`;
      }

      return `<div class="msg-ai">${entry}</div>`;
    })
    .join("");

  setChatHtml(rendered);

  // scroll to the bottom after rendering
  elements.chatWindow.scrollTo({
    top: elements.chatWindow.scrollHeight,
    behavior: "auto",
  });
}

// when game is ended
function enterGameEndState() {
  hideElement(elements.actionForm);
  hideElement(elements.questSelect);
  hideElement(elements.characterSelect);
  hideElement(elements.startGame);
  showElement(elements.healthContainer);
  showElement(elements.chatWindow);
  showElement(elements.chatActions);
  setChoiceControlsDisabled(true);

  // only show the last response
  if (gameState.lastVisibleResponse) {
    setChatHtml(`<div class="msg-ai">${gameState.lastVisibleResponse}</div>`);
  }

  saveCurrentGame().catch((error) => {
    appendChatHtml(`<div class="msg-ai">[Error]: ${error.message}</div>`);
    console.error(error.message);
    alert("[Error] error in enterGameEndState")
  });
}

// formally get into a chat
function restoreInteractiveChat() {
  showElement(elements.chatWindow);
  showElement(elements.healthContainer);
  showElement(elements.actionForm);
  showElement(elements.chatActions);
  setChoiceControlsDisabled(false);
  recoverLastConversation();
  renderChoices();

  hideElement(elements.questSelect);
  hideElement(elements.characterSelect);
  hideElement(elements.startGame);
}

// handle chunks in the main AI's response stream
function handleAiChunk(delta) {
  streamState.fullResponse += delta;

  if (streamState.isChoicesHidden) return;

  // hide json from visible response
  const hiddenAfterIndex = streamState.fullResponse.indexOf(CHOICES_START_TAG);
  if (hiddenAfterIndex === -1) {
    streamState.visibleResponse = streamState.fullResponse;
  } else {
    streamState.visibleResponse = streamState.fullResponse.slice(
      0,
      hiddenAfterIndex,
    );
    streamState.isChoicesHidden = true;
  }

  setChatHtml(`<div class="msg-ai">${streamState.visibleResponse}</div>`);
}

// build the prompt for main AI
function buildPrompt(inputText) {
  let request = gameState.systemPrompt;

  request += gameState.pendingLuckMessage;
  gameState.pendingLuckMessage = "";

  request += `\n\nCurrent game state: \n\n`;
  request += `1. player status: \n${JSON.stringify(gameState.playerStatus, null, 2)} \n\n`;
  request += `2. player skills: \n${JSON.stringify(gameState.skills, null, 2)} \n\n`;
  request += `3. player inventory: \n${JSON.stringify(gameState.inventory, null, 2)} \n\n`;
  request += `4. characters: \n${JSON.stringify(gameState.relationships, null, 2)} \n\n`;
  request += `5. achievements: \n${JSON.stringify(gameState.achievements, null, 2)} \n\n`;

  request += `\n\nCurrent conversation: ${inputText}\n\n`;

  request += "\n\nImportant Memories: \n\n";
  for (const memory of gameState.eventMemory) {
    request += `[${memory}] \n\n`;
  }

  // add last conversation
  request +=
    "\n\nLast Conversation: " +
    gameState.chatHistory[gameState.chatHistory.length - 2] +
    " " +
    gameState.chatHistory[gameState.chatHistory.length - 1];

  // add world info
  request = triggerWorldInfo(request);

  // test
  console.log("Request: \n\n" + request);

  return request;
}

// send the user's message to server 
function sendMessage() {

  // check for valid input
  let inputText = elements.userInput.value.trim();
  if (gameState.chatHistory.length !== 0 && !inputText) return;

  // update last input text for thinking animation
  streamState.lastInputText = inputText;

  // update UI
  showElement(elements.healthContainer);
  hideElement(elements.startGame);
  hideElement(elements.characterSelect);
  showElement(elements.actionForm);
  setChoiceControlsDisabled(true);
  setChatHtml("");

  if (gameState.chatHistory.length === 0) {
    inputText = "Game Start";
    if (isCustomCharacter == true) {
      selectCharacter(4);
    }
  }

  // build the prompt
  const prompt = buildPrompt(inputText);
  appendChatHtml(
    `<div class="msg-user"><strong>You:</strong> ${inputText}</div>`,
  );
  elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;

  socket.emit("ask_ai", {
    prompt,
    currentInput: inputText,
    token: gameState.token,
    saveId: gameState.saveId,
  });
  gameState.chatHistory.push(
    `Prompt ${Math.floor(gameState.chatHistory.length / 2)}: ${inputText}`,
  );
  elements.userInput.value = "";

  // update stream state
  streamState.state = "waitingForFirstChunk";
}

// add worldInfo into prompt
function triggerWorldInfo(request) {

  request += "\n\nWorld Info: \n\n";

  if (gameState.info && Object.keys(gameState.info).length > 0) {
    Object.values(gameState.info).forEach((item) => {
      for (let i = 0; i < item.triggers.length; i++) {
        if (request.includes(item.triggers[i])) {
          request += item.content + "\n\n";
          break;
        }
      }
    });
  }

  return request;
}

// apply choice and auto send to server
function applyChoice(choiceNumber) {
  const choiceIndex = choiceNumber - 1;
  const selectedButton = choiceButtons[choiceIndex];
  if (!selectedButton || !selectedButton.textContent) return;

  // generate luck
  let roll = Math.floor(Math.random() * 20) + 1;
  console.log("original luck roll: " + roll);
  let CurrentChoiceType = gameState.choiceTypes[choiceIndex];
  if (CurrentChoiceType == "strength") {
    roll = roll + gameState.playerStatus.strength;
  }
  if (CurrentChoiceType == "agility") {
    roll = roll + gameState.playerStatus.agility;
  }
  if (CurrentChoiceType == "intelligence") {
    roll = roll + gameState.playerStatus.intelligence;
  }
  if (CurrentChoiceType == "magic") {
    roll = roll + gameState.playerStatus.magic;
  }
  console.log("luck: " + roll + " type: " + CurrentChoiceType);
  if (roll < gameState.choiceDifficulties[choiceIndex]) {
    gameState.pendingLuckMessage =
      "The action the user just tried to do will fail!!! They did not roll high enough for the action they just took to be a success!!!";
  }

  // update input & send to server
  elements.userInput.value = selectedButton.textContent;
  sendMessage();
}

// auth helper
function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${gameState.token}`,
  };
}

// load current save from server to localstorage
async function loadActiveSave() {
  if (!gameState.saveId) return false;

  // get the active save's data from server
  const response = await fetch(`/api/saves/${gameState.saveId}`, {
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to load save.");
  }

  const save = data.save;
  gameState.saveId = save._id;
  gameState.saveTitle = save.title;

  if (!save.gameState || typeof save.gameState !== "object") {
    throw new Error("Save data is invalid.");
  }

  // apply save's data to local
  applySaveSnapshot(save.gameState);
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
    // continue the game with the loaded save

    restoreInteractiveChat();
  }

  pageState.hasLoadedSave = true;
  return true;
}

// check for user status
async function checkValidUser() {
  if (!gameState.token) {
    window.location.href = "/login.html";
    return;
  }

  if (gameState.saveId) {
    hideElement(elements.questSelect);
    hideElement(elements.characterSelect);
    hideElement(elements.startGame);
  }

  try {
    const loadedSave = await loadActiveSave();
    if (!loadedSave) {
      showElement(elements.questSelect);
    }
  } catch (error) {
    appendChatHtml(`<div class="msg-ai">[Error]: ${error.message}</div>`);
    console.error(error.message);
  }
}

// recover the last conversation when user refreshes the page or comes back to the page
function recoverLastConversation() {
  if (!gameState.isGameOver) {
    showElement(elements.actionForm);
  }

  // recover the last conversation
  if (streamState.state === "receivingChunks") {
    // if there is an ongoing stream, show the visible part of the response
    setChatHtml(`<div class="msg-ai">${streamState.visibleResponse}</div>`);
  } else if (streamState.state === "waitingForFirstChunk") {
    // if there is an ongoing stream but the response is not received, show a thinking message
    setChatHtml(
      `<div class="msg-user"><strong>You:</strong> ${streamState.lastInputText}</div>\n\n<div class="msg-ai"><strong>AI:</strong> Thinking...</div>`,
    );
  } else if (streamState.state === "idle" && gameState.lastVisibleResponse) {
    // if there is no ongoing stream but there is a last response, show the last response
    setChatHtml(`<div class="msg-ai">${gameState.lastVisibleResponse}</div>`);
  } else {
    // if there is no response at all, show a default message
    setChatHtml(`<div class="msg-ai">No AI responses yet.</div>`);
  }

  elements.chatWindow.scrollTo({ top: 0, behavior: "auto" });
}

// buttons
function setButtonEvents() {
  elements.title.addEventListener("click", activateDevMode); // use dev mode
  elements.confirmQuest.addEventListener("click", confirmQuest);
  elements.startGame.addEventListener("click", () => {
    showElement(elements.chatWindow);
    showElement(elements.chatActions);
    sendMessage();
  });

  // chat actions
  // currentConversation
  chatActionButtons[chatActionButtonNames.currentConversation].addEventListener(
    "click",
    () => {
      // update UI
      setSelectedButton(
        chatActionButtons,
        chatActionButtonNames.currentConversation,
      );

      recoverLastConversation();
    },
  );

  // showChatHistory
  chatActionButtons[chatActionButtonNames.showChatHistory].addEventListener(
    "click",
    () => {
      // update UI
      setSelectedButton(
        chatActionButtons,
        chatActionButtonNames.showChatHistory,
      );
      hideElement(elements.actionForm);

      renderChatHistory();
    },
  );

  // characterPanel
  chatActionButtons[chatActionButtonNames.characterPanel].addEventListener("click", () => {

    // update UI
    setSelectedButton(
      chatActionButtons,
      chatActionButtonNames.characterPanel,
    );
    hideElement(elements.actionForm);

    renderCharacterPanel();
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

// change background image
function changeBackgroundImageTo(img) {
  if (img === "default") {
    document.body.style.backgroundImage = "none";
  } else {
    document.body.style.backgroundImage = `url(imgs/background/${img})`;
  }
}

// change profile image
function changeProfileImageTo(img) {
  if (img === "default") {
    elements.characterProfile.style.backgroundImage = "none";
  } else {
    elements.characterProfile.style.backgroundImage = `url(imgs/profile/${img})`;
  }
}

// change custom character profile image
function changeCustomProfileImage() {

  // update displaying index
  profileImagesDisplayingIndex++;
  profileImagesDisplayingIndex = profileImagesDisplayingIndex >= profileImages.length ? 0 : profileImagesDisplayingIndex;
  gameState.ui.profileImage = profileImages[profileImagesDisplayingIndex];

  // update UI
  changeProfileImageTo(gameState.ui.profileImage);
  elements.characterProfileNumber.innerText = `Profile ${(profileImagesDisplayingIndex + 1)} / ${profileImages.length} (Tap profile to change)`;
}

socket.on("connect", () => {

  // check for loaded save
  if (
    !pageState.hasLoadedSave &&
    elements.chatWindow.textContent.trim() === "Connecting..."
  ) {
    setChatHtml("<div>System: Connected to the server.</div>");
  }
});

// handle main AI response
socket.on("ai_stream", (message) => {
  if (message === "start") {

    // set waiting UI
    setChatHtml(
      `<div class="msg-user"><strong>You:</strong> ${streamState.lastInputText}</div>\n\n<div class="msg-ai"><strong>AI:</strong> Thinking...</div>`,
    );

    // update streamState
    streamState.state = "waitingForFirstChunk";

  } else if (typeof message === "string" && message.startsWith("[Error]")) {

    // show error
    console.error(message);
    alert(message);

    // update UI
    appendChatHtml(`<div class="msg-ai" id="loading">${message}</div>`);
    setChoiceControlsDisabled(false);

    // update streamState
    streamState.state = "idle";

    // try to load the last valid save
    loadActiveSave();

  } else if (message?.type === "chunk") {

    // handle AI response chunks
    streamState.state = "receivingChunks";
    handleAiChunk(message.delta || "");

  } else if (typeof message === "string" && message.startsWith("[Chunk]: ")) {

    // handle legacy AI response chunks
    streamState.state = "receivingChunks";
    handleAiChunk(message.slice("[Chunk]: ".length));

  } else if (message === "end") {

    // finish the main AI response
    streamState.state = "idle";
    finishAiResponse();
  }

  // scroll the chat window
  elements.chatWindow.scrollTo({ top: 0, behavior: "auto" });
});

// check for data AI failure
socket.on("data_response", (message) => {
  if (message.startsWith("[Error]")) {
    appendChatHtml(
      `<div class="msg-ai"><strong>Data AI:</strong> ${message}</div>`,
    );
    console.error(message);
    alert(message);
    loadActiveSave();
  } else {
    // update gameState and auto save
    gameState.eventMemory.add(message);
    saveCurrentGame().catch((error) => {
      appendChatHtml(`<div class="msg-ai">[Error]: ${error.message}</div>`);
      console.error(error.message);
    });
  }

  // check for gameOver
  if (gameState.isGameOver) {
    hideElement(elements.actionForm);
    setChoiceControlsDisabled(true);
  } else {
    setChoiceControlsDisabled(false);
  }
});

// initialize the chat page
async function initializePage() {
  await loadBackgroundImages();
  await loadProfileImages();

  // setup eventListeners
  setButtonEvents();

  // setup UI
  selectQuest(1, { reveal: true });
  selectCharacter(1, { reveal: true });

  hideElement(elements.startGame);

  if (gameState.saveId) {
    // while loading an existed save
    hideElement(elements.questSelect);
    hideElement(elements.characterSelect);
    hideElement(elements.characterBlurb);
  } else {
    // while opening a new chat
    hideElement(elements.chatWindow);
  }

  // logout button
  renderAuthAction();

  // check for valid user
  checkValidUser();
}

initializePage();
