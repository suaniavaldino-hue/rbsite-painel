const TEMA_PADRAO = "site profissional";
const ART_DEFAULT_STATE = {
  theme: TEMA_PADRAO,
  title: "Seu site pode estar afastando clientes",
  content: "Muitas empresas perdem vendas porque o site nao transmite clareza, autoridade nem conversao.",
  cta: "Fale com a RB Site",
  format: "square",
  style: "editorial",
  isSample: true
};

let notificationsConfig = null;
let latestPostData = { ...ART_DEFAULT_STATE };

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function setResultado(content, className = "result-state info-state") {
  const resultado = document.getElementById("resultado");
  resultado.className = className;
  resultado.innerHTML = content;
}

function setHistoricoStatus(message) {
  const status = document.getElementById("historico-status");
  status.textContent = message;
}

function setDevicesStatus(message, tone = "") {
  const status = document.getElementById("devices-status");
  status.className = `history-status ${tone}`.trim();
  status.textContent = message;
}

function setMobileStatus(message, tone = "") {
  const status = document.getElementById("mobile-status");
  status.className = `mobile-status ${tone}`.trim();
  status.textContent = message;
}

function setArtStatus(message, tone = "") {
  const status = document.getElementById("art-status");

  if (!status) {
    return;
  }

  status.className = `history-status ${tone}`.trim();
  status.textContent = message;
}

function setStat(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function updateStats(items) {
  const total = items.length;
  const drafts = items.filter((item) => (item.status || "").toLowerCase() === "draft").length;
  const withDate = items.filter((item) => item.created_at).length;
  const latestItem = items.find((item) => item.created_at);

  setStat("stat-total", String(total));
  setStat("stat-draft", String(drafts));
  setStat("stat-dated", String(withDate));
  setStat("stat-latest", latestItem ? formatDate(latestItem.created_at) : "Sem data");
}

function getElementValue(id, fallback = "") {
  const element = document.getElementById(id);

  if (!element) {
    return fallback;
  }

  return String(element.value ?? fallback).trim() || fallback;
}

function buildArtPayload(overrides = {}) {
  return {
    theme: overrides.theme || latestPostData.theme || getElementValue("tema-input", TEMA_PADRAO),
    title: overrides.title || latestPostData.title || ART_DEFAULT_STATE.title,
    content: overrides.content || latestPostData.content || ART_DEFAULT_STATE.content,
    cta: overrides.cta || getElementValue("art-cta", latestPostData.cta || ART_DEFAULT_STATE.cta),
    format: overrides.format || getElementValue("art-format", latestPostData.format || ART_DEFAULT_STATE.format),
    style: overrides.style || getElementValue("art-style", latestPostData.style || ART_DEFAULT_STATE.style),
    eyebrow: "RB Site Social Automation",
    footer: "rbsite.com.br  •  sites, SEO e conversao"
  };
}

function seedArtFromHistory(items) {
  if (!latestPostData.isSample || !Array.isArray(items) || items.length === 0) {
    return;
  }

  latestPostData = {
    ...latestPostData,
    title: items[0].title || latestPostData.title,
    content: items[0].content || latestPostData.content,
    theme: getElementValue("tema-input", latestPostData.theme),
    isSample: false
  };

  renderCurrentArt();
}

function renderCurrentArt(overrides = {}) {
  if (!window.RBSiteArtGenerator) {
    setArtStatus("Motor de arte indisponivel no navegador.", "error-note");
    return null;
  }

  const payload = buildArtPayload(overrides);
  latestPostData = {
    ...latestPostData,
    ...payload,
    isSample: false
  };

  const rendered = window.RBSiteArtGenerator.render(payload);
  const formatConfig = window.RBSiteArtGenerator.getFormatConfig(payload.format);
  setArtStatus(`Arte ${formatConfig.label} pronta para preview e download.`, "success-note");
  return rendered;
}

function gerarArteManual() {
  renderCurrentArt({
    theme: getElementValue("tema-input", latestPostData.theme)
  });
}

async function baixarArtePng() {
  if (!window.RBSiteArtGenerator) {
    setArtStatus("Motor de arte indisponivel no navegador.", "error-note");
    return;
  }

  try {
    setArtStatus("Exportando PNG da arte...", "");
    const payload = buildArtPayload();
    await window.RBSiteArtGenerator.downloadPng(payload);
    setArtStatus("PNG exportado com sucesso.", "success-note");
  } catch (error) {
    setArtStatus(`Falha ao exportar PNG: ${error.message}`, "error-note");
  }
}

function baixarArteSvg() {
  if (!window.RBSiteArtGenerator) {
    setArtStatus("Motor de arte indisponivel no navegador.", "error-note");
    return;
  }

  try {
    const payload = buildArtPayload();
    window.RBSiteArtGenerator.downloadSvg(payload);
    setArtStatus("SVG exportado com sucesso.", "success-note");
  } catch (error) {
    setArtStatus(`Falha ao exportar SVG: ${error.message}`, "error-note");
  }
}

function renderHistorico(items) {
  const historico = document.getElementById("historico");
  updateStats(items);

  if (!Array.isArray(items) || items.length === 0) {
    historico.innerHTML = `
      <div class="empty-state">
        Nenhum post encontrado com os filtros atuais.
      </div>
    `;
    setHistoricoStatus("Nenhum post encontrado no historico.");
    return;
  }

  setHistoricoStatus(`${items.length} post(s) carregado(s) do Supabase.`);

  historico.innerHTML = items
    .map((item) => {
      return `
        <article class="history-card">
          <div class="history-card-top">
            <span class="history-badge">${escapeHtml(item.type || "post")}</span>
            <span class="history-status-badge">${escapeHtml(item.status || "draft")}</span>
          </div>

          <h3>${escapeHtml(item.title || "Sem titulo")}</h3>
          <p>${escapeHtml(item.content || "Sem conteudo")}</p>

          <div class="history-footer">
            <span class="history-date">${escapeHtml(formatDate(item.created_at))}</span>
            <span class="history-meta">ID: ${escapeHtml(item.id || "-")}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDevices(items) {
  const devicesGrid = document.getElementById("devices-grid");

  if (!Array.isArray(items) || items.length === 0) {
    devicesGrid.innerHTML = `
      <div class="empty-state">
        Nenhum Android conectado ainda. Gere um QR Code e conclua o pareamento pelo celular.
      </div>
    `;
    setDevicesStatus("Nenhum dispositivo pareado no momento.");
    return;
  }

  setDevicesStatus(`${items.length} dispositivo(s) ativo(s) conectado(s).`, "success-note");

  devicesGrid.innerHTML = items
    .map((item) => {
      const preferences = item.preferences || {};
      const preferenceLabels = [
        preferences.posts ? "posts" : null,
        preferences.agenda ? "agenda" : null,
        preferences.system ? "sistema" : null
      ]
        .filter(Boolean)
        .join(", ");

      return `
        <article class="device-card">
          <div class="device-card-top">
            <strong>${escapeHtml(item.label || "Android RB Site")}</strong>
            <span class="history-status-badge">${escapeHtml(item.status || "active")}</span>
          </div>
          <p class="device-platform">${escapeHtml(item.platform || "android")}</p>
          <p>Preferencias: ${escapeHtml(preferenceLabels || "padrao")}</p>
          <div class="device-meta">
            <span>Pareado em ${escapeHtml(formatDate(item.pairedAt))}</span>
            <span>Ultimo sinal ${escapeHtml(formatDate(item.lastSeenAt))}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function readFilters() {
  return {
    q: getElementValue("search-input"),
    type: getElementValue("type-filter"),
    status: getElementValue("status-filter"),
    sort: getElementValue("sort-filter")
  };
}

async function carregarHistorico() {
  try {
    setHistoricoStatus("Atualizando historico...");
    const data = await listarPostsAPI(readFilters());
    const items = data.items || [];
    renderHistorico(items);
    seedArtFromHistory(items);
  } catch (error) {
    document.getElementById("historico").innerHTML = "";
    updateStats([]);
    setHistoricoStatus(`Erro ao carregar historico: ${error.message}`);
  }
}

async function carregarDispositivosMobile() {
  try {
    setDevicesStatus("Atualizando dispositivos...");
    const data = await listarDispositivosMobileAPI();
    renderDevices(data.items || []);
  } catch (error) {
    document.getElementById("devices-grid").innerHTML = "";
    setDevicesStatus(`Erro ao carregar dispositivos: ${error.message}`, "error-note");
  }
}

async function carregarCentroMobile() {
  const qrShell = document.getElementById("qr-shell");

  try {
    notificationsConfig = await buscarConfigNotificacoesAPI();

    if (!notificationsConfig.pushAvailable || !notificationsConfig.pairingAvailable) {
      qrShell.innerHTML = `
        <div class="empty-state">
          Configure no Railway as variaveis <strong>WEB_PUSH_VAPID_PUBLIC_KEY</strong>,
          <strong>WEB_PUSH_VAPID_PRIVATE_KEY</strong>, <strong>WEB_PUSH_VAPID_SUBJECT</strong>
          e <strong>MOBILE_PAIRING_SECRET</strong>.
        </div>
      `;
      setMobileStatus("Pareamento mobile ainda nao configurado no backend.", "error-note");
      return;
    }

    qrShell.innerHTML = `
      <div class="qr-placeholder">
        Clique em <strong>Gerar QR Seguro</strong> para criar um token temporario de pareamento.
      </div>
    `;
    setMobileStatus("Backend pronto para parear Android com notificacoes push.", "success-note");
  } catch (error) {
    qrShell.innerHTML = `
      <div class="empty-state">
        Nao foi possivel carregar a configuracao do pareamento mobile.
      </div>
    `;
    setMobileStatus(`Erro ao verificar configuracao mobile: ${error.message}`, "error-note");
  }
}

async function gerarPareamentoMobile() {
  const qrShell = document.getElementById("qr-shell");
  const pairingLink = document.getElementById("pairing-link");

  try {
    qrShell.innerHTML = `<div class="qr-placeholder">Gerando QR temporario...</div>`;
    pairingLink.classList.add("hidden");
    setMobileStatus("Gerando token seguro de pareamento...", "");

    const data = await iniciarPareamentoMobileAPI();

    qrShell.innerHTML = data.qrSvg;
    pairingLink.href = data.pairingUrl;
    pairingLink.classList.remove("hidden");

    setMobileStatus(`QR Code pronto. Expira em ${formatDate(data.expiresAt)}.`, "success-note");
  } catch (error) {
    qrShell.innerHTML = `
      <div class="empty-state">
        Falha ao gerar QR Code de pareamento.
      </div>
    `;
    pairingLink.classList.add("hidden");
    setMobileStatus(`Erro ao gerar QR: ${error.message}`, "error-note");
  }
}

async function enviarTesteNotificacao() {
  try {
    const kind = getElementValue("notification-kind", "system");
    setMobileStatus("Enviando notificacao de teste para os celulares ativos...", "");
    const data = await enviarTesteNotificacaoAPI(kind);
    const delivered = data?.result?.delivered ?? 0;
    setMobileStatus(`Teste ${kind} enviado. Entregues: ${delivered}.`, "success-note");
    await carregarDispositivosMobile();
  } catch (error) {
    setMobileStatus(`Falha ao enviar teste: ${error.message}`, "error-note");
  }
}

async function gerarPost() {
  const botao = document.getElementById("gerar-post-button");
  const temaInput = document.getElementById("tema-input");
  const tema = temaInput.value.trim() || TEMA_PADRAO;

  if (!temaInput.value.trim()) {
    temaInput.value = tema;
  }

  try {
    botao.disabled = true;
    botao.textContent = "Gerando...";

    setResultado("Gerando novo post...", "result-state loading-state");
    setArtStatus("Gerando texto e preparando a arte premium...", "");

    const data = await gerarPostAPI(tema);
    const delivered = data?.notifications?.delivered ?? 0;

    latestPostData = {
      ...latestPostData,
      theme: tema,
      title: data.title,
      content: data.content,
      isSample: false
    };

    setResultado(
      `
        <span class="result-kicker">Post gerado com sucesso</span>
        <h3>${escapeHtml(data.title)}</h3>
        <p>${escapeHtml(data.content)}</p>
        <div class="result-meta">Notificacoes entregues: ${escapeHtml(String(delivered))}</div>
      `,
      "result-state success-state"
    );

    renderCurrentArt({
      theme: tema,
      title: data.title,
      content: data.content
    });

    await Promise.all([carregarHistorico(), carregarDispositivosMobile()]);
  } catch (error) {
    console.error("ERRO NO FRONT:", error);

    setResultado(
      `Erro ao gerar post: ${escapeHtml(error.message)}`,
      "result-state error-state"
    );
    setArtStatus(`Falha ao montar a arte: ${error.message}`, "error-note");
  } finally {
    botao.disabled = false;
    botao.textContent = "Gerar Post";
  }
}

function bindFilterEvents() {
  const searchInput = document.getElementById("search-input");
  const typeFilter = document.getElementById("type-filter");
  const statusFilter = document.getElementById("status-filter");
  const sortFilter = document.getElementById("sort-filter");

  let searchTimer = null;

  searchInput.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      carregarHistorico();
    }, 250);
  });

  [typeFilter, statusFilter, sortFilter].forEach((element) => {
    element.addEventListener("change", () => {
      carregarHistorico();
    });
  });
}

function bindArtStudioEvents() {
  const artFormat = document.getElementById("art-format");
  const artStyle = document.getElementById("art-style");
  const artCta = document.getElementById("art-cta");

  [artFormat, artStyle].forEach((element) => {
    element?.addEventListener("change", () => {
      renderCurrentArt();
    });
  });

  artCta?.addEventListener("input", () => {
    renderCurrentArt();
  });
}

function initializeArtStudio() {
  if (!window.RBSiteArtGenerator) {
    setArtStatus("Motor de arte nao carregado.", "error-note");
    return;
  }

  renderCurrentArt();
}

document.addEventListener("DOMContentLoaded", () => {
  bindFilterEvents();
  bindArtStudioEvents();
  initializeArtStudio();
  carregarCentroMobile();
  carregarDispositivosMobile();
  carregarHistorico();
});

window.gerarArteManual = gerarArteManual;
window.baixarArtePng = baixarArtePng;
window.baixarArteSvg = baixarArteSvg;
window.gerarPareamentoMobile = gerarPareamentoMobile;
window.enviarTesteNotificacao = enviarTesteNotificacao;
window.gerarPost = gerarPost;
