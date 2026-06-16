const visitForm = document.getElementById("visitForm");
const addressInput = document.getElementById("addressInput");
const visitBtn = document.getElementById("visitBtn");
const backBtn = document.getElementById("backBtn");
const clearBtn = document.getElementById("clearBtn");
const currentPagePanel = document.getElementById("currentPagePanel");
const currentPageText = document.getElementById("currentPageText");
const currentPageSubtext = document.getElementById("currentPageSubtext");
const historyList = document.getElementById("historyList");
const stackSizeChip = document.getElementById("stackSizeChip");
const toast = document.getElementById("toast");

let state = {
  current: null,
  history: [],
  size: 0,
  has_history: false,
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setToast(message, kind = "info") {
  toast.textContent = message;
  toast.dataset.kind = kind;
  toast.classList.add("visible");

  clearTimeout(setToast.timer);
  setToast.timer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2600);
}

function renderHistoryList(history) {
  if (!history.length) {
    historyList.innerHTML = '<div class="history-empty">History is empty</div>';
    return;
  }

  historyList.innerHTML = history
    .map((url, index) => {
      const roleText = index === 0 ? "Current" : `Depth ${index + 1}`;
      return `
        <div class="history-item ${index === 0 ? "history-item-top" : ""}">
          <span class="history-badge">${roleText}</span>
          <span class="history-url">${escapeHtml(url)}</span>
        </div>
      `;
    })
    .join("");
}

function renderCurrentPage(currentUrl) {
  if (!currentUrl) {
    currentPagePanel.classList.add("empty");
    currentPageText.textContent = "No page open";
    currentPageSubtext.textContent = "Visit a page to start the stack.";
    return;
  }

  currentPagePanel.classList.remove("empty");
  currentPageText.textContent = currentUrl;
  currentPageSubtext.textContent = "Peek operation: this URL is at the top of the stack.";
}

function renderState(nextState) {
  const history = Array.isArray(nextState.history) ? nextState.history : [];
  const current = nextState.current || history[0] || null;
  const size = Number.isInteger(nextState.size) ? nextState.size : history.length;
  const hasHistory = typeof nextState.has_history === "boolean" ? nextState.has_history : size > 0;

  state = {
    current,
    history,
    size,
    has_history: hasHistory,
  };

  renderCurrentPage(current);
  renderHistoryList(history);

  stackSizeChip.textContent = `${size} ${size === 1 ? "page" : "pages"}`;
  backBtn.disabled = size <= 1;
  clearBtn.disabled = !hasHistory;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

async function refreshState() {
  const [currentRes, historyRes, sizeRes, hasHistoryRes] = await Promise.all([
    fetchJson("/api/current"),
    fetchJson("/api/history"),
    fetchJson("/api/size"),
    fetchJson("/api/has-history"),
  ]);

  renderState({
    current: currentRes.data.current,
    history: historyRes.data.history,
    size: sizeRes.data.size,
    has_history: hasHistoryRes.data.has_history,
  });

  if (!currentRes.success && currentRes.message) {
    setToast(currentRes.message, "info");
  }
}

async function handleVisit(event) {
  event.preventDefault();

  const rawUrl = addressInput.value.trim();
  if (!rawUrl) {
    setToast("Error: URL cannot be empty", "error");
    addressInput.focus();
    return;
  }

  visitBtn.disabled = true;
  try {
    const result = await fetchJson("/api/visit", {
      method: "POST",
      body: JSON.stringify({ url: rawUrl }),
    });

    renderState(result.data || state);
    setToast(result.message, result.success ? "success" : "error");

    if (result.success) {
      addressInput.value = "";
    }
  } catch (error) {
    setToast(error.message, "error");
  } finally {
    visitBtn.disabled = false;
  }
}

async function handleBack() {
  if (backBtn.disabled) {
    return;
  }

  try {
    const result = await fetchJson("/api/back", {
      method: "POST",
      body: JSON.stringify({}),
    });

    renderState(result.data || state);
    setToast(result.message, result.success ? "success" : "error");
  } catch (error) {
    setToast(error.message, "error");
  }
}

async function handleClear() {
  if (clearBtn.disabled) {
    return;
  }

  const shouldClear = window.confirm("Clear the entire history stack?");
  if (!shouldClear) {
    return;
  }

  try {
    const result = await fetchJson("/api/clear", {
      method: "POST",
      body: JSON.stringify({}),
    });

    renderState(result.data || { current: null, history: [], size: 0, has_history: false });
    setToast(result.message, "success");
  } catch (error) {
    setToast(error.message, "error");
  }
}

visitForm.addEventListener("submit", handleVisit);
backBtn.addEventListener("click", handleBack);
clearBtn.addEventListener("click", handleClear);

refreshState().catch((error) => {
  renderState({ current: null, history: [], size: 0, has_history: false });
  setToast(error.message || "Failed to load initial state", "error");
});
