function toUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function setMobileLinkStatus(message, tone = "") {
  const status = document.getElementById("mobile-link-status");
  status.className = `mobile-status ${tone}`.trim();
  status.textContent = message;
}

async function pairDevice() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const button = document.getElementById("pair-device-button");

  if (!token) {
    setMobileLinkStatus("Token de pareamento ausente ou invalido.", "error-note");
    button.disabled = true;
    return;
  }

  try {
    button.disabled = true;
    button.textContent = "Conectando...";

    const config = await buscarConfigNotificacoesAPI();

    if (!config.pushAvailable || !config.publicKey) {
      throw new Error("As notificacoes push ainda nao foram configuradas no backend.");
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Este Android nao suporta service worker ou notificacoes push.");
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      throw new Error("Permissao de notificacoes negada no Android.");
    }

    const registration = await navigator.serviceWorker.register("/service-worker.js");
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(config.publicKey)
      });
    }

    const payload = {
      token,
      subscription: subscription.toJSON(),
      label: document.getElementById("device-label").value.trim() || "Android RB Site",
      platform: "android",
      userAgent: navigator.userAgent,
      preferences: {
        posts: document.getElementById("pref-posts").checked,
        agenda: document.getElementById("pref-agenda").checked,
        system: document.getElementById("pref-system").checked
      }
    };

    const response = await concluirPareamentoMobileAPI(payload);

    setMobileLinkStatus(
      `Pareamento concluido com sucesso para ${response.device?.label || "Android RB Site"}. Agora este celular recebera alertas do painel.`,
      "success-note"
    );
  } catch (error) {
    setMobileLinkStatus(`Falha ao concluir pareamento: ${error.message}`, "error-note");
  } finally {
    button.disabled = false;
    button.textContent = "Ativar notificacoes";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("pair-device-button");
  button.addEventListener("click", pairDevice);
  setMobileLinkStatus("Pronto para ativar notificacoes no Android.");
});
