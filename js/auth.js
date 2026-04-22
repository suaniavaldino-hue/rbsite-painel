function setLoginStatus(message, tone = "") {
  const status = document.getElementById("login-status");

  if (!status) {
    return;
  }

  status.className = `login-status ${tone}`.trim();
  status.textContent = message;
}

function login() {
  const emailField = document.getElementById("email");
  const passwordField = document.getElementById("senha");
  const button = document.querySelector(".login-button");

  const email = emailField?.value.trim() || "";
  const senha = passwordField?.value || "";

  if (!email || !senha) {
    setLoginStatus("Preencha email e senha para entrar no painel.", "error-note");
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Entrando...";
  }

  setLoginStatus("Validando acesso...", "");

  window.setTimeout(() => {
    localStorage.setItem("user", email);
    setLoginStatus("Acesso liberado. Redirecionando para o dashboard...", "success-note");
    window.location.href = "dashboard.html";
  }, 250);
}

document.addEventListener("DOMContentLoaded", () => {
  const emailField = document.getElementById("email");
  const passwordField = document.getElementById("senha");

  [emailField, passwordField].forEach((field) => {
    field?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        login();
      }
    });
  });
});
