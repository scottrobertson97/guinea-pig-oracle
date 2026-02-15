const spreadOutput = document.getElementById("spread-output");
const spreadChoice = document.getElementById("spread-choice");
const drawSpreadButton = document.getElementById("draw-spread");
const dealSpeedInput = document.getElementById("deal-speed");
const dealStyleInput = document.getElementById("deal-style");
const customControls = document.getElementById("custom-controls");
const customCountInput = document.getElementById("custom-count");
const customLabelsInput = document.getElementById("custom-labels");
const historyList = document.getElementById("history-list");
const clearHistoryButton = document.getElementById("clear-history");

const spreadLabels = {
  ppf: ["Past", "Present", "Future"],
  snack: ["Snack", "Nibble", "Feast"],
};

const HISTORY_TYPE = "spread";
const HISTORY_LIMIT = 12;
const MIN_CUSTOM_CARDS = 2;
const MAX_CUSTOM_CARDS = 7;
const THREE_CARD_POSITIONS = ["left", "center", "right"];
const SHARE_STATUS_RESET_MS = 1400;
const DEAL_SETTINGS_STORAGE_KEY = "oracle-deal-settings-v1";

const DEAL_SPEEDS = {
  slow: 1.45,
  normal: 1,
  fast: 0.65,
};

const DEAL_STYLES = {
  classic: {
    durationMs: 560,
    intervalMs: 120,
    easing: "cubic-bezier(0.2, 0.65, 0.2, 1)",
    startScale: 0.72,
    startRotate: -10,
    rotateRange: 6,
  },
  snappy: {
    durationMs: 360,
    intervalMs: 72,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    startScale: 0.9,
    startRotate: -5,
    rotateRange: 3,
  },
  dramatic: {
    durationMs: 760,
    intervalMs: 180,
    easing: "cubic-bezier(0.18, 0.72, 0.18, 1)",
    startScale: 0.62,
    startRotate: -14,
    rotateRange: 9,
  },
};

let isDealing = false;

const parseLabels = (raw) =>
  raw
    .split(/\n|,/)
    .map((label) => label.trim())
    .filter(Boolean);

const getCustomCount = () => {
  const rawValue = Number.parseInt(customCountInput.value, 10);
  if (Number.isNaN(rawValue)) {
    return 3;
  }
  return Math.min(Math.max(rawValue, MIN_CUSTOM_CARDS), MAX_CUSTOM_CARDS);
};

const resolveLabels = (count, labels) => {
  const resolved = [];
  for (let i = 0; i < count; i += 1) {
    resolved.push(labels[i] || `Card ${i + 1}`);
  }
  return resolved;
};

const getSpreadConfig = () => {
  let labels = spreadLabels[spreadChoice.value] || spreadLabels.ppf;
  let count = labels.length;

  if (spreadChoice.value === "custom") {
    count = getCustomCount();
    const customLabels = parseLabels(customLabelsInput.value);
    labels = resolveLabels(count, customLabels);
    customCountInput.value = count;
  }

  return { count, labels };
};

const applyLayoutMode = (count) => {
  spreadOutput.classList.toggle("is-three-card-layout", count === 3);
};

const createDeckTray = (text) => {
  const tray = document.createElement("div");
  tray.className = "deck-tray";

  const stack = document.createElement("div");
  stack.className = "deck-stack";
  stack.setAttribute("aria-hidden", "true");

  const label = document.createElement("p");
  label.className = "deck-tray-text";
  label.textContent = text;

  tray.appendChild(stack);
  tray.appendChild(label);
  return tray;
};

const createSlot = (labelText, options = {}) => {
  const { position = "", empty = false, placeholder = "" } = options;
  const slot = document.createElement("div");
  slot.className = `card-slot${empty ? " empty" : ""}`;
  if (position) {
    slot.dataset.position = position;
  }

  const label = document.createElement("span");
  label.className = "spread-label";
  label.textContent = labelText;
  slot.appendChild(label);

  if (placeholder) {
    const placeholderText = document.createElement("p");
    placeholderText.className = "card-placeholder";
    placeholderText.textContent = placeholder;
    slot.appendChild(placeholderText);
  }

  return slot;
};

const updateCustomUI = () => {
  const isCustom = spreadChoice.value === "custom";
  customControls.classList.toggle("is-hidden", !isCustom);
  const { count } = getSpreadConfig();
  drawSpreadButton.textContent = `Draw ${count} Card${count === 1 ? "" : "s"}`;
};

const getDeckSize = () =>
  Array.isArray(window.ORACLE_DECK) && window.ORACLE_DECK.length > 0
    ? window.ORACLE_DECK.length
    : 44;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readDealSettings = () => {
  const defaults = {
    speed: "normal",
    style: "classic",
  };

  try {
    const raw = window.localStorage.getItem(DEAL_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw);
    const speed = parsed?.speed in DEAL_SPEEDS ? parsed.speed : defaults.speed;
    const style = parsed?.style in DEAL_STYLES ? parsed.style : defaults.style;
    return { speed, style };
  } catch (error) {
    return defaults;
  }
};

const writeDealSettings = (settings) => {
  try {
    window.localStorage.setItem(DEAL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    // Ignore settings persistence errors and continue with current session values.
  }
};

const getCurrentDealSettings = () => {
  const speed = dealSpeedInput.value in DEAL_SPEEDS ? dealSpeedInput.value : "normal";
  const style = dealStyleInput.value in DEAL_STYLES ? dealStyleInput.value : "classic";
  return { speed, style };
};

const applyDealSettingsToUI = () => {
  const settings = readDealSettings();
  dealSpeedInput.value = settings.speed;
  dealStyleInput.value = settings.style;
};

const getDealAnimationConfig = () => {
  const settings = getCurrentDealSettings();
  const style = DEAL_STYLES[settings.style];
  const speedMultiplier = DEAL_SPEEDS[settings.speed];
  const durationMs = Math.max(220, Math.round(style.durationMs * speedMultiplier));
  const intervalMs = Math.max(32, Math.round(style.intervalMs * speedMultiplier));
  return {
    durationMs,
    intervalMs,
    timeoutMs: durationMs + 260,
    easing: style.easing,
    startScale: style.startScale,
    startRotate: style.startRotate,
    rotateRange: style.rotateRange,
  };
};

const setDealControlsDisabled = (disabled) => {
  drawSpreadButton.disabled = disabled;
  spreadChoice.disabled = disabled;
  dealSpeedInput.disabled = disabled;
  dealStyleInput.disabled = disabled;
  customCountInput.disabled = disabled;
  customLabelsInput.disabled = disabled;
};

const updateTrayText = (text) => {
  const trayText = spreadOutput.querySelector(".deck-tray-text");
  if (trayText) {
    trayText.textContent = text;
  }
};

const fillSlotWithCard = (slot, card, orientation) => {
  slot.classList.remove("empty");
  const placeholder = slot.querySelector(".card-placeholder");
  if (placeholder) {
    placeholder.remove();
  }
  const cardEl = oracleApp.createCardElement(card, orientation, {
    showOrientation: true,
  });
  slot.appendChild(cardEl);
};

const animateDealToSlot = (sourceEl, slotEl, animationConfig) =>
  new Promise((resolve) => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!sourceEl || !slotEl || prefersReducedMotion) {
      resolve();
      return;
    }

    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = slotEl.getBoundingClientRect();
    const travelX = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
    const travelY = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);
    const cardWidth = Math.min(210, Math.max(130, targetRect.width * 0.55));
    const cardHeight = cardWidth * 1.45;

    const flyingCard = document.createElement("div");
    flyingCard.className = "dealing-card";
    flyingCard.style.width = `${cardWidth}px`;
    flyingCard.style.height = `${cardHeight}px`;
    flyingCard.style.left = `${sourceRect.left + sourceRect.width / 2 - cardWidth / 2}px`;
    flyingCard.style.top = `${sourceRect.top + sourceRect.height / 2 - cardHeight / 2}px`;
    flyingCard.style.transform = `translate(0, 0) rotate(${animationConfig.startRotate}deg) scale(${animationConfig.startScale})`;
    flyingCard.style.transition = `transform ${animationConfig.durationMs}ms ${animationConfig.easing}, opacity ${animationConfig.durationMs}ms ease`;

    document.body.appendChild(flyingCard);
    sourceEl.classList.add("is-dealing");

    let settled = false;
    const complete = () => {
      if (settled) {
        return;
      }
      settled = true;
      sourceEl.classList.remove("is-dealing");
      flyingCard.remove();
      resolve();
    };

    requestAnimationFrame(() => {
      const rotate = (
        Math.random() * animationConfig.rotateRange * 2 -
        animationConfig.rotateRange
      ).toFixed(2);
      flyingCard.style.transform = `translate(${travelX}px, ${travelY}px) rotate(${rotate}deg) scale(1)`;
      flyingCard.style.opacity = "1";
    });

    flyingCard.addEventListener("transitionend", complete, { once: true });
    setTimeout(complete, animationConfig.timeoutMs);
  });

const renderSpreadLayout = (options) => {
  const {
    count,
    labels,
    emptySlots = false,
    placeholderText = "",
    trayText = `${getDeckSize()} cards in the deck`,
  } = options;

  applyLayoutMode(count);
  spreadOutput.innerHTML = "";

  const cardsContainer = document.createElement("div");
  cardsContainer.className = "spread-cards";

  labels.forEach((labelText, index) => {
    const slot = createSlot(labelText, {
      empty: emptySlots,
      position: count === 3 ? THREE_CARD_POSITIONS[index] : "",
      placeholder: index === 0 ? placeholderText : "",
    });
    cardsContainer.appendChild(slot);
  });

  spreadOutput.appendChild(cardsContainer);
  spreadOutput.appendChild(createDeckTray(trayText));

  return {
    slots: [...cardsContainer.querySelectorAll(".card-slot")],
    deckStack: spreadOutput.querySelector(".deck-stack"),
  };
};

const renderPlaceholderSpread = () => {
  const { count, labels } = getSpreadConfig();
  renderSpreadLayout({
    count,
    labels,
    emptySlots: true,
    placeholderText: "Draw a spread to reveal cards.",
  });
};

const saveSpreadReading = (cards, labels, orientations) => {
  const snapshots = cards
    .map((card, index) =>
      oracleApp.createReadingCardSnapshot(card, orientations[index], labels[index])
    )
    .filter(Boolean);

  if (!snapshots.length) {
    return;
  }

  const spreadLabel = spreadChoice.options[spreadChoice.selectedIndex]?.textContent?.trim();
  oracleApp.saveReading({
    type: HISTORY_TYPE,
    title: `${cards.length}-Card Spread`,
    spreadKey: spreadChoice.value,
    spreadLabel,
    labels,
    cards: snapshots,
  });
};

const renderSpread = async () => {
  if (isDealing) {
    return;
  }

  isDealing = true;
  setDealControlsDisabled(true);

  try {
    const deck = await oracleApp.loadDeck();
    const { count, labels } = getSpreadConfig();
    const cards = oracleApp.drawUnique(deck, count);
    const orientations = cards.map(() => oracleApp.drawOrientation());
    const dealAnimationConfig = getDealAnimationConfig();

    const { slots, deckStack } = renderSpreadLayout({
      count,
      labels,
      emptySlots: true,
      placeholderText: "Dealing cards...",
    });

    if (deckStack) {
      for (let index = 0; index < cards.length; index += 1) {
        await animateDealToSlot(deckStack, slots[index], dealAnimationConfig);
        fillSlotWithCard(slots[index], cards[index], orientations[index]);
        const remainingCards = Math.max(deck.length - (index + 1), 0);
        updateTrayText(`${remainingCards} cards remain in the deck`);
        await sleep(dealAnimationConfig.intervalMs);
      }
    } else {
      cards.forEach((card, index) => {
        fillSlotWithCard(slots[index], card, orientations[index]);
      });
    }

    saveSpreadReading(cards, labels, orientations);
  } finally {
    setDealControlsDisabled(false);
    isDealing = false;
  }
};

const restoreSpreadReading = (entry) => {
  const snapshots = Array.isArray(entry.cards) ? entry.cards : [];
  if (!snapshots.length) {
    return;
  }

  const baseLabels =
    Array.isArray(entry.labels) && entry.labels.length
      ? entry.labels
      : snapshots.map((snapshot, index) => snapshot.label || `Card ${index + 1}`);
  const labels = resolveLabels(snapshots.length, baseLabels);

  const { slots } = renderSpreadLayout({
    count: snapshots.length,
    labels,
    emptySlots: false,
    trayText: `Restored reading | ${oracleUi.formatHistoryTime(entry.createdAt)}`,
  });

  snapshots.forEach((snapshot, index) => {
    const card = oracleUi.toRenderableCard(snapshot, {
      index,
      idPrefix: "history-spread-card",
    });
    const orientation = snapshot.orientation === "reversed" ? "reversed" : "upright";
    fillSlotWithCard(slots[index], card, orientation);
  });
};

const runShareAction = async (entry, buttonEl) => {
  if (!buttonEl) {
    return;
  }

  const originalLabel = buttonEl.textContent;
  buttonEl.disabled = true;
  buttonEl.textContent = "Sharing...";

  const result = await oracleUi.shareReadingEntry(entry);
  if (result.ok && result.method === "native") {
    buttonEl.textContent = "Shared";
  } else if (result.ok && result.method === "clipboard") {
    buttonEl.textContent = "Copied";
  } else if (result.reason === "cancelled") {
    buttonEl.textContent = originalLabel;
  } else {
    buttonEl.textContent = "Unavailable";
  }

  window.setTimeout(() => {
    buttonEl.textContent = originalLabel;
    buttonEl.disabled = false;
  }, SHARE_STATUS_RESET_MS);
};

const createHistoryItem = (entry) => {
  const title = entry.spreadLabel || entry.title || `${entry.cards.length}-Card Spread`;
  const metaLine = `${entry.cards.length} cards | ${oracleUi.formatHistoryTime(
    entry.createdAt
  )}`;
  const labelsPreview = document.createElement("p");
  labelsPreview.className = "history-item-meta";
  labelsPreview.textContent = entry.labels?.length
    ? entry.labels.join(" | ")
    : "Custom spread";

  const item = oracleUi.createHistoryItemElement({
    title,
    metaLines: [metaLine],
    actions: [
      {
        label: "Restore",
        className: "",
        onAction: () => restoreSpreadReading(entry),
      },
      {
        label: "Share",
        className: "history-action-secondary",
        onAction: (event) => runShareAction(entry, event.currentTarget),
      },
    ],
  });

  const body = item.querySelector(".history-item-body");
  if (body) {
    body.appendChild(labelsPreview);
    body.appendChild(
      oracleUi.createHistoryNoteEditor({
        note: entry.note || "",
        onSave: (nextNote) => {
          return Boolean(oracleApp.updateReadingNote(entry.id, nextNote));
        },
      })
    );
  }
  return item;
};

const renderHistoryList = () => {
  if (!historyList) {
    return;
  }

  const entries = oracleApp.getReadingHistory({
    type: HISTORY_TYPE,
    limit: HISTORY_LIMIT,
  });

  oracleUi.renderHistoryList({
    listElement: historyList,
    entries,
    emptyText: "No saved spreads yet.",
    createItem: (entry) => createHistoryItem(entry),
  });
};

const handleSpreadConfigChange = () => {
  if (isDealing) {
    return;
  }
  updateCustomUI();
  renderPlaceholderSpread();
};

drawSpreadButton.addEventListener("click", renderSpread);
spreadChoice.addEventListener("change", handleSpreadConfigChange);
customCountInput.addEventListener("input", handleSpreadConfigChange);
customLabelsInput.addEventListener("input", handleSpreadConfigChange);
dealSpeedInput.addEventListener("change", () => {
  writeDealSettings(getCurrentDealSettings());
});
dealStyleInput.addEventListener("change", () => {
  writeDealSettings(getCurrentDealSettings());
});

if (clearHistoryButton) {
  clearHistoryButton.addEventListener("click", () => {
    oracleApp.clearReadingHistory(HISTORY_TYPE);
  });
}

window.addEventListener(oracleApp.HISTORY_UPDATED_EVENT, renderHistoryList);

applyDealSettingsToUI();
updateCustomUI();
renderPlaceholderSpread();
renderHistoryList();
