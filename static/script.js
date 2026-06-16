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
const stackCount = document.getElementById("stackCount");
const toast = document.getElementById("toast");
const liveStateBadge = document.getElementById("liveStateBadge");
const themeToggle = document.getElementById("themeToggle");
const stackRects = document.querySelectorAll(".animated-stack .stack-layer rect");
const stackLabels = document.querySelectorAll(".animated-stack .stack-label");
const stackGlow = document.querySelector(".stack-glow ellipse");

visitBtn.disabled = addressInput.value.trim().length === 0;
addressInput.addEventListener("input", () => {
  visitBtn.disabled = addressInput.value.trim().length === 0;
});

let state = {
  current: null,
  history: [],
  size: 0,
  has_history: false,
};

function setLoading(isLoading) {
  const controls = [visitBtn, backBtn, clearBtn, addressInput];
  controls.forEach((control) => {
    control.disabled = isLoading || (control !== addressInput && control.disabled);
  });
  currentPagePanel.classList.toggle("loading", isLoading);
  visitForm.classList.toggle("loading", isLoading);
  setLiveState(
    isLoading ? "Updating..." : `Live state: ${state.size} ${state.size === 1 ? "page" : "pages"}`,
    isLoading ? "updating" : "normal"
  );
}

function setTheme(themeName) {
  const isDark = themeName === "dark";
  document.body.classList.toggle("dark", isDark);
  if (themeToggle) {
    themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
  }
  localStorage.setItem("browserHistoryTheme", themeName);
}

function toggleTheme() {
  const currentTheme = document.body.classList.contains("dark") ? "dark" : "light";
  setTheme(currentTheme === "dark" ? "light" : "dark");
}

function setLiveState(text, kind = "normal") {
  if (!liveStateBadge) return;
  liveStateBadge.textContent = text;
  liveStateBadge.dataset.state = kind;
}

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

function animateStateUpdate() {
  currentPagePanel.classList.add("active-animate");
  historyList.classList.add("animate");

  clearTimeout(animateStateUpdate.timer);
  animateStateUpdate.timer = setTimeout(() => {
    currentPagePanel.classList.remove("active-animate");
    historyList.classList.remove("animate");
  }, 380);
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

  requestAnimationFrame(() => {
    renderCurrentPage(current);
    renderHistoryList(history);
    updateStackVisual(history);

    stackSizeChip.textContent = `${size} ${size === 1 ? "page" : "pages"}`;
    if (stackCount) {
      stackCount.textContent = `${size} ${size === 1 ? "page" : "pages"}`;
    }
    backBtn.disabled = size <= 1;
    clearBtn.disabled = !hasHistory;

    setLiveState(`Live state: ${size} ${size === 1 ? "page" : "pages"}`);
    animateStateUpdate();
  });
}

function getLabelText(url) {
  if (!url) return "";
  return String(url)
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/\?.*$/, "")
    .replace(/#.*$/, "")
    .trim();
}

function truncateText(text, maxLength = 24) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function updateStackVisual(history) {
  const activeCount = Math.min(history.length, stackRects.length);
  const visibleHistory = history.slice(0, activeCount);

  stackRects.forEach((rect, index) => {
    const isActive = index >= stackRects.length - activeCount;
    const depthIndex = stackRects.length - index;
    const visualIndex = stackRects.length - 1 - index;
    const label = stackLabels[index];

    rect.style.transition = "transform 260ms ease, opacity 260ms ease, fill 260ms ease";
    rect.style.opacity = isActive ? "1" : "0.36";
    rect.style.fill = isActive ? "url(#stackGrad)" : "url(#baseGrad)";
    rect.style.transform = isActive ? "translateY(0px)" : `translateY(${depthIndex * 1.75}px)`;

    if (label) {
      if (isActive && visualIndex < activeCount) {
        label.textContent = truncateText(getLabelText(visibleHistory[visualIndex] || ""));
        label.style.opacity = "1";
      } else {
        label.textContent = "";
        label.style.opacity = "0";
      }
    }
  });

  if (stackGlow) {
    stackGlow.style.opacity = history.length > 0 ? "0.4" : "0";
  }
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

  setLoading(true);
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
    setLoading(false);
  }
}

async function handleBack() {
  if (backBtn.disabled) {
    return;
  }

  setLoading(true);
  try {
    const result = await fetchJson("/api/back", {
      method: "POST",
      body: JSON.stringify({}),
    });

    renderState(result.data || state);
    setToast(result.message, result.success ? "success" : "error");
  } catch (error) {
    setToast(error.message, "error");
  } finally {
    setLoading(false);
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

  setLoading(true);
  try {
    const result = await fetchJson("/api/clear", {
      method: "POST",
      body: JSON.stringify({}),
    });

    renderState(result.data || { current: null, history: [], size: 0, has_history: false });
    setToast(result.message, "success");
  } catch (error) {
    setToast(error.message, "error");
  } finally {
    setLoading(false);
  }
}

visitForm.addEventListener("submit", handleVisit);
backBtn.addEventListener("click", handleBack);
clearBtn.addEventListener("click", handleClear);
if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}

const savedTheme = localStorage.getItem("browserHistoryTheme") || "light";
setTheme(savedTheme);

refreshState().catch((error) => {
  renderState({ current: null, history: [], size: 0, has_history: false });
  setToast(error.message || "Failed to load initial state", "error");
});
