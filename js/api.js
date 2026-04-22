const API_URL = "https://rbsite-backend-production.up.railway.app";

async function parseApiResponse(response) {
  const text = await response.text();

  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Resposta invalida da API: ${text}`);
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || `Erro HTTP ${response.status}`);
  }

  return data;
}

async function gerarPostAPI(tema) {
  const response = await fetch(`${API_URL}/gerar-post`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ tema })
  });

  return parseApiResponse(response);
}

async function listarPostsAPI(filters = {}) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.type && filters.type !== "all") {
    params.set("type", filters.type);
  }

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.sort) {
    params.set("sort", filters.sort);
  }

  params.set("limit", "50");

  const response = await fetch(`${API_URL}/posts?${params.toString()}`, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  });

  return parseApiResponse(response);
}

async function buscarConfigNotificacoesAPI() {
  const response = await fetch(`${API_URL}/notifications/config`, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  });

  return parseApiResponse(response);
}

async function iniciarPareamentoMobileAPI() {
  const response = await fetch(`${API_URL}/mobile/pairing/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  return parseApiResponse(response);
}

async function listarDispositivosMobileAPI() {
  const response = await fetch(`${API_URL}/mobile/devices`, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  });

  return parseApiResponse(response);
}

async function enviarTesteNotificacaoAPI(kind = "system") {
  const response = await fetch(`${API_URL}/notifications/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      kind,
      title: `Teste ${kind} RB Site`,
      body: "Seu Android recebeu um alerta de teste com QR Code seguro."
    })
  });

  return parseApiResponse(response);
}

async function concluirPareamentoMobileAPI(payload) {
  const response = await fetch(`${API_URL}/mobile/pairing/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseApiResponse(response);
}

window.gerarPostAPI = gerarPostAPI;
window.listarPostsAPI = listarPostsAPI;
window.buscarConfigNotificacoesAPI = buscarConfigNotificacoesAPI;
window.iniciarPareamentoMobileAPI = iniciarPareamentoMobileAPI;
window.listarDispositivosMobileAPI = listarDispositivosMobileAPI;
window.enviarTesteNotificacaoAPI = enviarTesteNotificacaoAPI;
window.concluirPareamentoMobileAPI = concluirPareamentoMobileAPI;
