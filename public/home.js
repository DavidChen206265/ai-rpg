const AUTH_TOKEN_KEY = "ai_rpg_token";
const AUTH_USER_KEY = "ai_rpg_user";
const ACTIVE_SAVE_KEY = "ai_rpg_active_save";
const ACTIVE_SAVE_TITLE_KEY = "ai_rpg_active_save_title";

const elements = {
  authAction: document.getElementById("auth-action"),
  newChat: document.getElementById("new-chat"),
  refresh: document.getElementById("refresh-saves"),
  saveList: document.getElementById("save-list"),
};

// get the auth token for request headers
function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem(AUTH_TOKEN_KEY) || ""}`,
  };
}

// clear all local data while logout
function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(ACTIVE_SAVE_KEY);
  localStorage.removeItem(ACTIVE_SAVE_TITLE_KEY);
  window.location.href = "/login";
}

function renderAuthAction() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return;

  elements.authAction.textContent = "Logout";
  elements.authAction.href = "#";
  elements.authAction.addEventListener("click", (event) => {
    event.preventDefault();
    clearSession();
  });
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || "Unexpected response from server." };
  }
}

// save actions
async function renameSave(saveId, currentTitle) {
  const title = prompt("Rename save", currentTitle);
  if (!title || title.trim() === currentTitle) return;

  const response = await fetch(`/api/saves/${saveId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ title: title.trim() }),
  });
  const data = safeJsonParse(await response.text());
  if (!response.ok) throw new Error(data.error || "Failed to rename save.");
  await loadSaves();
}

async function deleteSave(saveId) {
  if (!confirm("Delete this save?")) return;

  const response = await fetch(`/api/saves/${saveId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = safeJsonParse(await response.text());
  if (!response.ok) throw new Error(data.error || "Failed to delete save.");

  if (localStorage.getItem(ACTIVE_SAVE_KEY) === saveId) {
    localStorage.removeItem(ACTIVE_SAVE_KEY);
    localStorage.removeItem(ACTIVE_SAVE_TITLE_KEY);
  }

  await loadSaves();
}

// show all saves
async function loadSaves() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    elements.saveList.innerHTML =
      '<p class="empty-state">Please <a href="/login">log in</a> to view saves.</p>';
    return;
  }

  // get all saves for the current user
  const response = await fetch("/api/saves", { headers: authHeaders() });
  const data = safeJsonParse(await response.text());
  if (!response.ok) {
    throw new Error(data.error || "Failed to load saves.");
  }

  // display all saves
  const saves = data.saves || [];
  if (saves.length === 0) {
    elements.saveList.innerHTML = '<p class="empty-state">No saves yet.</p>';
    return;
  }

  elements.saveList.innerHTML = saves
    .map(
      (save) => `
        <div class="save-card">
          <button class="save-main" type="button" data-open-save="${save._id}" data-save-title="${save.title}">
            <strong>${save.title}</strong>
            <span>Last conversation: ${formatDate(save.updatedAt || save.createdAt)}</span>
          </button>
          <div class="save-actions">
            <button type="button" data-rename-save="${save._id}" data-save-title="${save.title}">Rename</button>
            <button type="button" data-delete-save="${save._id}">Delete</button>
          </div>
        </div>
      `
    )
    .join("");

  // display save actions
  elements.saveList.querySelectorAll("[data-open-save]").forEach((button) => {
    button.addEventListener("click", () => {

      // load a save
      const saveId = button.dataset.openSave;
      localStorage.setItem(ACTIVE_SAVE_KEY, saveId);
      localStorage.setItem(ACTIVE_SAVE_TITLE_KEY, button.dataset.saveTitle || "Untitled Save");

      // jump to chat page with the saveId
      window.location.href = `/chat?save=${encodeURIComponent(saveId)}`; 
    });
  });

  elements.saveList.querySelectorAll("[data-rename-save]").forEach((button) => {
    button.addEventListener("click", () => {
      renameSave(button.dataset.renameSave, button.dataset.saveTitle).catch((error) => {
        elements.saveList.innerHTML = `<p class="empty-state">${error.message}</p>`;
      });
    });
  });

  elements.saveList.querySelectorAll("[data-delete-save]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteSave(button.dataset.deleteSave).catch((error) => {
        elements.saveList.innerHTML = `<p class="empty-state">${error.message}</p>`;
      });
    });
  });
}

// refresh saves list
elements.refresh.addEventListener("click", () => {
  loadSaves().catch((error) => {
    elements.saveList.innerHTML = `<p class="empty-state">${error.message}</p>`;
  });
});

// create a new chat
elements.newChat.addEventListener("click", () => {

  // remove the current save's keys
  localStorage.removeItem(ACTIVE_SAVE_KEY);
  localStorage.removeItem(ACTIVE_SAVE_TITLE_KEY);
});

loadSaves().catch((error) => {
  elements.saveList.innerHTML = `<p class="empty-state">${error.message}</p>`;
});

renderAuthAction();
