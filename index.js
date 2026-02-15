const singleDrawSlot = document.getElementById("single-draw");
const drawButton = document.getElementById("draw-one");
const drawAgainButton = document.getElementById("draw-again");
const dailyDrawButton = document.getElementById("draw-daily");
const dailyStatus = document.getElementById("daily-status");
const historyList = document.getElementById("history-list");
const clearHistoryButton = document.getElementById("clear-history");

const HISTORY_TYPE = "single";
const HISTORY_LIMIT = 10;
const SHARE_STATUS_RESET_MS = 1400;
const DAILY_READING_PREFIX = "daily";

const toLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toReadableDate = (date = new Date()) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
  }).format(date);

const hashString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const renderSingleCard = (card, orientation) => {
  singleDrawSlot.classList.remove("empty");
  singleDrawSlot.innerHTML = "";
  singleDrawSlot.appendChild(oracleApp.createCardElement(card, orientation));
};

const restoreHistoryEntry = (entry) => {
  const snapshot = Array.isArray(entry.cards) ? entry.cards[0] : null;
  if (!snapshot) {
    return;
  }

  const card = oracleUi.toRenderableCard(snapshot, {
    index: 0,
    idPrefix: "history-card",
  });
  const orientation = snapshot.orientation === "reversed" ? "reversed" : "upright";
  renderSingleCard(card, orientation);
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
  const snapshot = Array.isArray(entry.cards) ? entry.cards[0] : null;
  if (!snapshot) {
    return null;
  }

  const orientation = snapshot.orientation === "reversed" ? "Reversed" : "Upright";
  const label = entry.title && entry.title !== "Single Draw" ? `${entry.title} | ` : "";
  const item = oracleUi.createHistoryItemElement({
    title: snapshot.title || "Saved card",
    metaLines: [`${label}${orientation} | ${oracleUi.formatHistoryTime(entry.createdAt)}`],
    actions: [
      {
        label: "Restore",
        className: "",
        onAction: () => restoreHistoryEntry(entry),
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
    emptyText: "No saved single-card readings yet.",
    createItem: (entry) => {
      const item = createHistoryItem(entry);
      return item || null;
    },
  });
};

const saveSingleReading = (card, orientation, options = {}) => {
  const {
    readingId = "",
    title = "Single Draw",
    label = title,
  } = options;
  const snapshot = oracleApp.createReadingCardSnapshot(card, orientation, label);
  if (!snapshot) {
    return;
  }

  oracleApp.saveReading({
    id: readingId,
    type: HISTORY_TYPE,
    title,
    cards: [snapshot],
  });
};

const renderSingleDraw = async () => {
  const deck = await oracleApp.loadDeck();
  const [card] = oracleApp.drawUnique(deck, 1);
  const orientation = oracleApp.drawOrientation();
  renderSingleCard(card, orientation);
  saveSingleReading(card, orientation);
  if (dailyStatus) {
    dailyStatus.textContent = "Random single-card draw saved.";
  }
};

const renderDailyDraw = async () => {
  const deck = await oracleApp.loadDeck();
  if (!deck.length) {
    return;
  }

  const today = new Date();
  const dateKey = toLocalDateKey(today);
  const indexHash = hashString(`${DAILY_READING_PREFIX}:${dateKey}:card`);
  const orientationHash = hashString(`${DAILY_READING_PREFIX}:${dateKey}:orientation`);
  const card = deck[indexHash % deck.length];
  const orientation = orientationHash % 2 === 0 ? "upright" : "reversed";

  renderSingleCard(card, orientation);
  saveSingleReading(card, orientation, {
    readingId: `${DAILY_READING_PREFIX}-${dateKey}`,
    title: "Daily Card",
    label: `Daily Card ${dateKey}`,
  });

  if (dailyStatus) {
    dailyStatus.textContent = `Daily card for ${toReadableDate(today)} loaded.`;
  }
};

drawButton.addEventListener("click", renderSingleDraw);
drawAgainButton.addEventListener("click", renderSingleDraw);
if (dailyDrawButton) {
  dailyDrawButton.addEventListener("click", renderDailyDraw);
}

if (clearHistoryButton) {
  clearHistoryButton.addEventListener("click", () => {
    oracleApp.clearReadingHistory(HISTORY_TYPE);
  });
}

window.addEventListener(oracleApp.HISTORY_UPDATED_EVENT, renderHistoryList);

renderHistoryList();
