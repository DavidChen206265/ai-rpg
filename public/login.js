const AUTH_TOKEN_KEY = "ai_rpg_token";
const AUTH_USER_KEY = "ai_rpg_user";

const elements = {
  form: document.getElementById("auth-form"),
  username: document.getElementById("auth-username"),
  password: document.getElementById("auth-password"),
  submit: document.getElementById("auth-submit"),
  message: document.getElementById("auth-message"),
  tabLogin: document.getElementById("tab-login"),
  tabRegister: document.getElementById("tab-register"),
};

let mode = "login"; // "login" "register"

const REST_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(url, options = {}, timeoutMs = REST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// set mode as login or register
function setMode(nextMode) {
  mode = nextMode;
  elements.tabLogin.classList.toggle("is-active", mode === "login");
  elements.tabRegister.classList.toggle("is-active", mode === "register");
  elements.submit.textContent = mode === "login" ? "Login" : "Register";
  elements.password.autocomplete = mode === "login" ? "current-password" : "new-password";
  elements.message.textContent = "";
}

function setMessage(text, isError = false) {
  elements.message.textContent = text;
  elements.message.classList.toggle("is-error", isError);
}

async function submitAuth(event) {
  event.preventDefault();
  const username = elements.username.value.trim();
  const password = elements.password.value.trim();

  try {
    // send username & password to server
    const response = await fetchWithTimeout(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Authentication failed.");
    }

    // get logged in
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    window.location.href = "/";
  } catch (error) {
    setMessage(error.message, true);
  }
}

elements.tabLogin.addEventListener("click", () => setMode("login"));
elements.tabRegister.addEventListener("click", () => setMode("register"));
elements.form.addEventListener("submit", submitAuth);
setMode("login");
