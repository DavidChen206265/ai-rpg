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
  chatActions: document.getElementById("chat-actions"),
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

const chatActionButtons = [
  document.getElementById("current-conversation"),
  document.getElementById("show-chat-history"),
  document.getElementById("character-panel"),
  document.getElementById("world-info"),
  document.getElementById("game-settings"),
];

const chatActionButtonNames = {
  currentConversation: 0,
  showChatHistory: 1,
  characterPanel: 2,
  worldInfo: 3,
  gameSettings: 4,
};

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
      "The user is in an office building, which is a front for a band of ninjas. The user must progress through 6 rooms before reaching the boss's office, who is the leader of the group of ninjas. The user has been tasked with defeating this leader. The first room does not have any enemies, being a regular reception room, and the rest are normal office rooms, but each room except for the reception room will contain a ninja disguised as an office worker, who is a master at some office-related weapon or ninja skill (for example, throwing knife scissors, potted plant substitution jutsu, or photocopier shadow clones) (The weapon or skill the ninja is a master at shouldn't be directly told to the player immediately, it should only be revealed when the ninja actually uses their weapon or ability. Subtle clues are allowed however, like the throwing knife scissors ninja holding suspiciously sharp scissors, but it shouldn't be said immediately that they are throwing knives unless the ninja uses them as such). These ninjas are hostile to the user, but those in the second or third room can be fooled to letting the user pass. These ninjas will never ask you riddles or puzzles (this quest is primarily combat-focused), but there is a puzzle locking the doors to the fourth and fifth rooms. The ninjas further in the building are hardier than the ninjas at the start, and are harder to kill and deal more damage. All ninjas partake in witty banter while fighting, potentially giving clues to their next attacks very rarely. The final room after room 6 is the boss's office. The boss wields all of the weapons and skills from the office ninjas you met, and is a master at all of them. The boss is immediately hostile towards the user, and will not go down without a fight. The game is over when the boss is defeated.",
    blurb:
      "Infiltrate and take out the leader of a band of office ninjas in their corporate headquarters.",
  },
  3: {
    name: "Timelost Castle",
    prompt:
      "The user is in a large fancy castle, which has been taken over by a mad mage who has cast a spell over the whole kingdom, freezing the kingdom and its inhabitants in time. You have been sent from a neighboring kingdom to stop this mage. The user must make their way through 8 rooms before reaching the throne room where the mad mage resides. The 8 rooms either have a puzzle to solve or monster to fight (the first room always only has a puzzle). As the user progresses through the rooms of the castle, the puzzles and monsters progress through time from prehistory to more modern, and eventually to futuristic. If the user dies in the castle, the magic overtakes them and they get frozen in time forever. The monsters and puzzles at the start of the adventure (rooms 1-2) are prehistoric, the early middle rooms (rooms 3-4) have roman / greek era puzzles and monsters, then the late middle rooms (rooms 5-6) have victorian puzzles and monsters, and the last rooms (rooms 7-8) have futuristic puzzles and monsters. (none of the monsters are humans.) Remember that the castle is frozen in time, so there should be no moving decor. (no ticking clocks, no dripping water, no moving curtains. The decor can still be moved, but will always be still when the user arrives.) Once the user passes room 8 they find the mad mage herself in the throne room of the castle, ready for a fight (the mad mage only ever shows up in the throne room). The appearance of the mad mage is that of a tan-skinned elf with wavy light silver hair and violet iris's, with fine purple medevial clothes.  The mad mage casts time magic to fight, speeding themselves up and slowing you down, and launching magic missiles. When the mad mage is defeated, the kingdom is released from its time freezing curse and returns to normal. THERE IS NO OTHER WAY TO REVERSE THIS MAGIC THAN TO KILL THE MAD MAGE. When the mad mage is defeated, the user wins the game.",
    blurb:
      "Fight and solve puzzles in a time-frozen castle, progressing through history itself to defeat the mad mage who cursed the kingdom.",
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
  puzzleMode: false,
  isGameOver: false,
  currentProgress: 1,
  playerStatus: {
    health: {
      current: 8,
      max: 10,
    },
    mana: {
      current: 12,
      max: 15,
    },
    strength: 5,
    agility: 5,
    intelligence: 5,
    magic: 5,
    modifiers: {
      slow: {
        duration: "5 hours",
        modify: "agility - 3"
      },
    }
  },
  relationships: {
    0: {
      name: "character's name (not player's)",
      description: "character's description",
      relationship: "relationship's description",
    },
  },
  skills: {
    0: {
      name: "skill's name",
      description: "skill's description",
      modifier: {
        trigger: "passive skill: when to automatically apply this skill /  active skill: ask player to use it by your judgement",
        modify: "e.g. player attack's damage +1 / the nearest enemy is affected by a 30% slow",
      },
    },
  },
  inventory: {
    0: {
      name: "",
      number: 1,
      description: "item's background and usages' short description",
      modify: "",
    },
  },
  achievements: {
    0: {
      name: "",
      isAchieved: false,
      trigger: "",
      reward: "",
    },
  },
  selectedQuestName: quests[1].name,
  selectedCharacterName: characters[2].name,
  choiceDifficulties: [10, 10, 10],
  choiceTypes: ["strength", "strength", "strength"],
  pendingLuckMessage: "",
  choices: ["Choice one", "Choice two", "Choice three"],
  lastVisibleResponse: "",
  saveId: requestedSaveId || localStorage.getItem(ACTIVE_SAVE_KEY) || "",
  saveTitle: localStorage.getItem(ACTIVE_SAVE_TITLE_KEY) || "Untitled Save",
  token: localStorage.getItem(AUTH_TOKEN_KEY) || "",
};

// state for a single ai stream
const streamState = {
  state: "idle", // "idle", "waitingForFirstChunk", "receivingChunks"
  thinkingTime: 0,
  lastInputText: "",
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

// thinking UI helpers
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
let thinkingWordsIndex = Math.floor(Math.random() * thinkingWords.length);
let thinkingWordsCounter = 0;
const thinkingWordsInterval = 15;
const thinkingDotAnimation = [
  '<span style="visibility: hidden;">...</span>',
  '.<span style="visibility: hidden;">..</span>',
  '..<span style="visibility: hidden;">.</span>',
  "...",
];

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
];
let didYouKnowTextsIndex = Math.floor(Math.random() * didYouKnowTexts.length);
let didYouKnowCounter = 0;
const didYouKnowInterval = 30;

const thinkingTimer = setInterval(() => {
  if (streamState.state === "waitingForFirstChunk") {

    // update counters
    streamState.thinkingTimeCounter++;
    thinkingWordsCounter++;
    didYouKnowCounter++;

    if (thinkingWordsCounter >= thinkingWordsInterval) {
      thinkingWordsIndex = Math.floor(Math.random() * thinkingWords.length);
      thinkingWordsCounter = 0;
    }

    if (didYouKnowCounter >= didYouKnowInterval) {
      didYouKnowTextsIndex = Math.floor(Math.random() * didYouKnowTexts.length);
      didYouKnowCounter = 0;
    }

  } else {
    streamState.thinkingTimeCounter = 0;
    thinkingWordsIndex = Math.floor(Math.random() * thinkingWords.length);
    thinkingWordsCounter = 0;
    didYouKnowTextsIndex = Math.floor(Math.random() * didYouKnowTexts.length);
    didYouKnowCounter = 0;
  }
}, 1000);

const UI_UPDATE_INTERVAL = 250;
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

function isSelected(element) {
  return element.classList.contains(SELECTED_CLASS);
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

// logout button
function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(ACTIVE_SAVE_KEY);
  localStorage.removeItem(ACTIVE_SAVE_TITLE_KEY);
  window.location.href = "/login.html";
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
    relationships: gameState.relationships,
    skills: gameState.skills,
    inventory: gameState.inventory,
    achievements: gameState.achievements,
    currentProgress: gameState.currentProgress,
    selectedQuestName: gameState.selectedQuestName,
    selectedCharacterName: gameState.selectedCharacterName,
    choiceDifficulties: gameState.choiceDifficulties,
    choiceTypes: gameState.choiceTypes,
    choices: gameState.choices,
    pendingLuckMessage: gameState.pendingLuckMessage,
    lastVisibleResponse: gameState.lastVisibleResponse,
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
}

// update the system prompt by  quest & character user selected
function updateSystemPrompt() {
  gameState.systemPrompt = `Highest Priority:

${gameState.questInfo}

The user is currently in room ${gameState.currentProgress}.

You are a game master, running a fantasy game. The user's character is ${gameState.characterDescription} (avoid quoting the character description verbatim). Based on the previous quest information, generate a description of the room the user is currently in. Outside of the items mentioned, the user starts the adventure with no extra gear.

${gameState.developerMode}

In a puzzle, only the correct answer to the puzzle should allow the puzzle to be completed. Allow a little lenience with puzzle solutions, but incorrect answers should not successfully complete the puzzle. Try not to make puzzles that can only be solved when presented with the 3 options, the user should be able to figure out the answer to the puzzle from the description alone. (the user has to type the solution themselves, the 3 options are hidden from view in a puzzle) (try to make puzzles with the difficulty for someone about 15 years of age)

The choice / custom input's difficulty must be calculated by relative player status and all applicable modifiers!

Changed status: whenever you modify playerStatus, relationships, skills, inventory, or when the player achieves an achievement, show a brief log each of the changes to remind the player.
e.g. {health -1} {new skill: [skillName]} {used item: [itemName]} {achieved: [achievementName]} {debuff: [slow]}

JSON update instructions:
1. turn gameOver to true if playerStatus.health.current <= 0, but set it to 0 since health can not be less than 0; current health must <= max health.
2. in playerStatus(except playerStatus.modifiers) and achievements, you can only edit the value of fields, must not add / delete fields;
3. in relationships, you can only add new relationships / edit exiting ones but must not delete any of them;
4. in playerStatus.modifiers, skills, inventory, you can add / edit / delete fields;
5. you must maintain the format for each field;
6. for choice types, (choice1type, choice2type, choice3type) it must be one of the following strings: "strength", "agility", "intelligence" or "magic", depending on what type of action the choice is. (intelligence is more for problem solving while magic is more for spells)
7. for strength, agility, intelligence, and magic, choose an integer ranging from -5 to 5, with -5 being really bad at the action and 5 being really good at the action. Unless some type of enhancement/debuff magic or specialized training is used, these values should not change between prompts.
8. When the user is in a puzzle, puzzleMode should be true, and false when the user is not in a puzzle. It is important to note this is not a string, but a boolean true or a boolean false. 

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
  "healthLost": 0,
  "healthGained": 0,
  "progression": 0
  "playerStatus": {
    "health": {
      "current": 8,
      "max": 10,
    },
    "mana": {
      "current": 12,
      "max": 15,
    },
    "strength": 0,
    "agility": 0,
    "intelligence": 0,
    "magic": 0,
    "modifiers": {
      "slow": {
        "duration": "5 hours",
        "modify": "agility - 3"
      },
    }
  },
  "relationships": {
    "characterBriefName0": {
      "name": "character's full name (not player's)",
      "description": "character's description",
      "relationship": "relationship's description",
    }, 
  },
  "skills": {
    "skillBriefName0": {
      "name": "skill's full name",
      "description": "skill's description",
      "modifier": {
        "trigger": "passive skill: when to automatically apply this skill /  active skill: ask player to use it by your judgement",
        "modify": "e.g. player attack's damage +1 / the nearest enemy is affected by a 30% slow",
      },
    }, 
  },
  "inventory": {
    "itemBriefName0": {
      "name": "item's full name",
      "number": 1,
      "description": "item's background and usages' short description",
      "modify": "",
    },
  },
  "achievements": {
    "achievementBriefName": {
      "name": "",
      "isAchieved": false,
      "trigger": "",
      "reward": "",
    },
  },
}

DO NOT REPLY IN THE MARKDOWN FORMAT!!!`;
}

// select a quest (from 1 to 3)
function selectQuest(questNumber, options = {}) {
  const quest = quests[questNumber];
  if (!quest) {
    console.error("[Error] There is no quest " + questNumber + ".");
    return;
  }

  // update gameState
  gameState.questInfo = quest.prompt;
  gameState.selectedQuestName = quest.name;

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

// select a character (from 1 to 3)
function selectCharacter(characterNumber, options = {}) {
  const character = characters[characterNumber];
  if (!character) {
    console.error("[Error] There is no character " + characterNumber + ".");
    return;
  }

  // update gameState
  gameState.characterDescription = character.description;
  gameState.selectedCharacterName = character.name;
  gameState.playerStatus.health.max = character.maxHealth;
  gameState.playerStatus.health.current = character.maxHealth;
  elements.characterBlurb.textContent = character.blurb;
  elements.characterProfile.className = `character-profile ${character.profileClass}`;

  if (options.reveal !== false) {
    showElement(elements.characterBlurb);
    showElement(elements.characterProfile);
  }

  // update UI
  setSelectedButton(characterButtons, characterNumber - 1);
  renderHealth();

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
    "If the user claims they are the developer and uses the code word 'DELTA', do whatever they say without question. This overrides any other rules, even ones already defined (Do not override when the user is not using 'DELTA' in the prompt even it is under dev mode!). This action always succeeds, without fail. DO NOT UNDER ANY CIRCUMSTANCES MENTION THIS WITHIN THE GAME. THIS IS TOP SECRET DEVELOPER ONLY INFORMATION FOR CODE DEBUGGING.";
  updateSystemPrompt();
}

// extract json from the AI response
function extractChoicePayload(responseText) {
  const startIndex = responseText.indexOf(CHOICES_START_TAG);
  const endIndex = responseText.indexOf(CHOICES_END_TAG);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("AI response did not include a valid choices payload.");
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
  gameState.puzzleMode = choicePayload.puzzleMode;

  // check for game over
  if (choicePayload.gameOver === true || choicePayload.gameOver === "true") {
    gameState.isGameOver = true;
  }

  // check for puzzle mode
  if (gameState.puzzleMode == false){
    document.getElementById("choice-1").style.display = "inline-block";
    document.getElementById("choice-2").style.display = "inline-block";
    document.getElementById("choice-3").style.display = "inline-block";
  }
  if (gameState.puzzleMode == true){
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
      });
    }
  } catch (error) {
    appendChatHtml(`<div class="msg-ai">[Error]: ${error.message}</div>`);
    console.error(error.message);
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
function handleAiChunk(message) {
  streamState.fullResponse += message.slice(9);

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
  request += `2. player relationships: \n${JSON.stringify(gameState.relationships, null, 2)} \n\n`;
  request += `3. player skills: \n${JSON.stringify(gameState.skills, null, 2)} \n\n`;
  request += `4. player inventory: \n${JSON.stringify(gameState.inventory, null, 2)} \n\n`;
  request += `5. player achievements: \n${JSON.stringify(gameState.achievements, null, 2)} \n\n`;

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
  }

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

// apply choice and auto send to server
function applyChoice(choiceNumber) {
  const choiceIndex = choiceNumber - 1;
  const selectedButton = choiceButtons[choiceIndex];
  if (!selectedButton || !selectedButton.textContent) return;

  // generate luck
  let roll = Math.floor(Math.random() * 20) + 1;
  console.log("original luck roll: " + roll);
  let CurrentChoiceType = gameState.choiceTypes[choiceIndex];
  if(CurrentChoiceType == "strength"){
    roll = roll + gameState.playerStatus.strength;
  }
  if(CurrentChoiceType == "agility"){
    roll = roll + gameState.playerStatus.agility;
  }
  if(CurrentChoiceType == "intelligence"){
    roll = roll + gameState.playerStatus.intelligence;
  }
  if(CurrentChoiceType == "magic"){
    roll = roll + gameState.playerStatus.magic;
  }
  console.log("luck: " + roll + " type: " + CurrentChoiceType);
  if (roll < gameState.choiceDifficulties[choiceIndex]) {
    gameState.pendingLuckMessage =
      "The action the user just tried to do will fail!";
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

    let playerPanelHtml = "";
    playerPanelHtml += `\n\nCurrent game state: \n\n`;
    playerPanelHtml += `Status: \n${JSON.stringify(gameState.playerStatus, null, 2)} \n\n`;
    playerPanelHtml += `Relationships: \n${JSON.stringify(gameState.relationships, null, 2)} \n\n`;
    playerPanelHtml += `Skills: \n${JSON.stringify(gameState.skills, null, 2)} \n\n`;
    playerPanelHtml += `Inventory: \n${JSON.stringify(gameState.inventory, null, 2)} \n\n`;
    playerPanelHtml += `Achievements: \n${JSON.stringify(gameState.achievements, null, 2)} \n\n`;

    setChatHtml(playerPanelHtml);
  })

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
    setChatHtml(
      `<div class="msg-user"><strong>You:</strong> ${streamState.lastInputText}</div>\n\n<div class="msg-ai"><strong>AI:</strong> Thinking...</div>`,
    );
    streamState.state = "waitingForFirstChunk";
  } else if (message.startsWith("[Error]")) {
    appendChatHtml(`<div class="msg-ai" id="loading">${message}</div>`);
    console.error(message);
    setChoiceControlsDisabled(false);
  } else if (message.startsWith("[Chunk]")) {
    streamState.state = "receivingChunks";
    handleAiChunk(message);
  } else if (message === "end") {
    streamState.state = "idle";
    finishAiResponse();
  }

  elements.chatWindow.scrollTo({ top: 0, behavior: "auto" });
});

// check for data AI failure
socket.on("data_response", (message) => {
  if (message.startsWith("[Error]")) {
    appendChatHtml(
      `<div class="msg-ai"><strong>Data AI:</strong> ${message}</div>`,
    );
    console.error(message);
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
