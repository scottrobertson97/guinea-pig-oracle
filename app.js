const oracleApp = (() => {
  let deckCache = null;
  const HISTORY_STORAGE_KEY = "oracle-reading-history-v1";
  const HISTORY_UPDATED_EVENT = "oracle-history-updated";
  const FAVORITES_STORAGE_KEY = "oracle-favorites-v1";
  const FAVORITES_UPDATED_EVENT = "oracle-favorites-updated";
  const MAX_HISTORY_ITEMS = 50;
  const NOTE_MAX_LENGTH = 2000;

  const hasLocalStorage = (() => {
    try {
      const storage = window.localStorage;
      const probe = "__oracle_history_probe__";
      storage.setItem(probe, "1");
      storage.removeItem(probe);
      return true;
    } catch (error) {
      return false;
    }
  })();
  let memoryHistory = [];
  let memoryFavoriteIds = [];

  const loadDeck = async () => {
    if (deckCache) {
      return deckCache;
    }

    const hasEmbeddedDeck = Array.isArray(window.ORACLE_DECK) && window.ORACLE_DECK.length > 0;
    const isFileProtocol = window.location.protocol === "file:";

    if (isFileProtocol && hasEmbeddedDeck) {
      deckCache = window.ORACLE_DECK;
      return deckCache;
    }

    try {
      const response = await fetch("deck.json");
      if (!response.ok) {
        throw new Error(`Deck request failed: ${response.status}`);
      }
      const data = await response.json();
      deckCache = data;
      return data;
    } catch (error) {
      if (hasEmbeddedDeck) {
        deckCache = window.ORACLE_DECK;
        return deckCache;
      }
      throw new Error(
        "Unable to load deck data. Ensure deck-data.js is loaded before app.js."
      );
    }
  };

  const shuffle = (items) => {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const drawUnique = (items, count) => shuffle(items).slice(0, count);

  const drawOrientation = () => (Math.random() < 0.35 ? "reversed" : "upright");

  const formatKeywords = (keywords) => keywords.join(", ");

  const emitHistoryUpdated = () => {
    window.dispatchEvent(new CustomEvent(HISTORY_UPDATED_EVENT));
  };

  const emitFavoritesUpdated = () => {
    window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT));
  };

  const normalizeString = (value, fallback = "") =>
    typeof value === "string" && value.trim() ? value.trim() : fallback;

  const normalizeList = (value) =>
    Array.isArray(value)
      ? value.map((item) => String(item).trim()).filter(Boolean)
      : [];

  const normalizeArray = (value) => (Array.isArray(value) ? value : []);
  const normalizeNote = (value) =>
    typeof value === "string" ? value.slice(0, NOTE_MAX_LENGTH) : "";
  const normalizeFavoriteIds = (value) =>
    normalizeArray(value)
      .map((id) => normalizeString(id))
      .filter(Boolean)
      .filter((id, index, ids) => ids.indexOf(id) === index);

  const normalizeCardSnapshot = (card, index = 0) => {
    if (!card || typeof card !== "object") {
      return null;
    }

    return {
      id: normalizeString(card.id, `card-${index + 1}`),
      title: normalizeString(card.title, `Card ${index + 1}`),
      image: normalizeString(card.image),
      orientation: card.orientation === "reversed" ? "reversed" : "upright",
      label: normalizeString(card.label),
      keywords: normalizeList(card.keywords),
      reversed: normalizeList(card.reversed),
    };
  };

  const normalizeHistoryEntry = (entry) => {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const type = entry.type === "single" || entry.type === "spread" ? entry.type : null;
    if (!type) {
      return null;
    }

    const cards = normalizeArray(entry.cards)
      .map((card, index) => normalizeCardSnapshot(card, index))
      .filter(Boolean);

    if (!cards.length) {
      return null;
    }

    const createdAt = Number.isNaN(Date.parse(entry.createdAt))
      ? new Date().toISOString()
      : new Date(entry.createdAt).toISOString();

    return {
      id: normalizeString(
        entry.id,
        `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      ),
      type,
      createdAt,
      title: normalizeString(
        entry.title,
        type === "single" ? "Single Draw" : `${cards.length}-Card Spread`
      ),
      spreadKey: normalizeString(entry.spreadKey),
      spreadLabel: normalizeString(entry.spreadLabel),
      labels: normalizeList(entry.labels),
      note: normalizeNote(entry.note),
      cards,
    };
  };

  const readHistory = () => {
    if (!hasLocalStorage) {
      return [...memoryHistory];
    }

    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((entry) => normalizeHistoryEntry(entry))
        .filter(Boolean)
        .slice(0, MAX_HISTORY_ITEMS);
    } catch (error) {
      return [];
    }
  };

  const writeHistory = (entries) => {
    const normalized = entries
      .map((entry) => normalizeHistoryEntry(entry))
      .filter(Boolean)
      .slice(0, MAX_HISTORY_ITEMS);

    if (!hasLocalStorage) {
      memoryHistory = normalized;
      emitHistoryUpdated();
      return;
    }

    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      memoryHistory = normalized;
    }
    emitHistoryUpdated();
  };

  const createReadingCardSnapshot = (card, orientation, label = "") =>
    normalizeCardSnapshot(
      {
        id: card?.id,
        title: card?.title,
        image: card?.image,
        orientation,
        label,
        keywords: card?.keywords,
        reversed: card?.reversed,
      },
      0
    );

  const saveReading = (entry) => {
    const normalized = normalizeHistoryEntry(entry);
    if (!normalized) {
      return null;
    }

    const history = readHistory().filter((item) => item.id !== normalized.id);
    writeHistory([normalized, ...history]);
    return normalized;
  };

  const getReadingHistory = (options = {}) => {
    const { type = "", limit = MAX_HISTORY_ITEMS } = options;
    const cappedLimit = Math.max(0, limit);
    const entries = readHistory().filter((entry) => !type || entry.type === type);
    return entries.slice(0, cappedLimit);
  };

  const clearReadingHistory = (type = "") => {
    if (!type) {
      writeHistory([]);
      return;
    }
    const filtered = readHistory().filter((entry) => entry.type !== type);
    writeHistory(filtered);
  };

  const updateReadingNote = (readingId, note) => {
    const targetId = normalizeString(readingId);
    if (!targetId) {
      return null;
    }

    const normalizedNote = normalizeNote(note);
    let updatedEntry = null;
    const updatedHistory = readHistory().map((entry) => {
      if (entry.id !== targetId) {
        return entry;
      }
      updatedEntry = {
        ...entry,
        note: normalizedNote,
      };
      return updatedEntry;
    });

    if (!updatedEntry) {
      return null;
    }

    writeHistory(updatedHistory);
    return updatedEntry;
  };

  const readFavoriteIds = () => {
    if (!hasLocalStorage) {
      return [...memoryFavoriteIds];
    }

    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      return normalizeFavoriteIds(JSON.parse(raw));
    } catch (error) {
      return [];
    }
  };

  const writeFavoriteIds = (favoriteIds) => {
    const normalized = normalizeFavoriteIds(favoriteIds);
    if (!hasLocalStorage) {
      memoryFavoriteIds = normalized;
      emitFavoritesUpdated();
      return;
    }

    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      memoryFavoriteIds = normalized;
    }
    emitFavoritesUpdated();
  };

  const isFavoriteCard = (cardId) => {
    const normalizedCardId = normalizeString(cardId);
    if (!normalizedCardId) {
      return false;
    }
    return readFavoriteIds().includes(normalizedCardId);
  };

  const syncFavoriteButtons = (cardId, isFavorited) => {
    document.querySelectorAll(".favorite-toggle").forEach((button) => {
      if (button.dataset.cardId !== cardId) {
        return;
      }
      button.setAttribute("aria-pressed", isFavorited ? "true" : "false");
      button.textContent = isFavorited ? "Favorited" : "Favorite";
      button.classList.toggle("is-favorited", isFavorited);
    });
  };

  const toggleFavoriteCard = (cardId, forceState = null) => {
    const normalizedCardId = normalizeString(cardId);
    if (!normalizedCardId) {
      return false;
    }

    const currentFavoriteIds = readFavoriteIds();
    const currentlyFavorited = currentFavoriteIds.includes(normalizedCardId);
    const shouldBeFavorited =
      forceState === null ? !currentlyFavorited : Boolean(forceState);

    const nextFavoriteIds = shouldBeFavorited
      ? [...currentFavoriteIds, normalizedCardId]
      : currentFavoriteIds.filter((id) => id !== normalizedCardId);

    writeFavoriteIds(nextFavoriteIds);
    syncFavoriteButtons(normalizedCardId, shouldBeFavorited);
    return shouldBeFavorited;
  };

  const getFavoriteCardIds = () => readFavoriteIds();

  const createCardElement = (card, orientation, options = {}) => {
    const { compact = false, showOrientation = true } = options;
    const cardId = normalizeString(card.id);
    const wrapper = document.createElement("article");
    wrapper.className = `oracle-card${compact ? " is-compact" : ""}${
      orientation === "reversed" ? " is-reversed" : ""
    }`;

    const art = document.createElement("div");
    art.className = "card-art";

    const img = document.createElement("img");
    img.alt = card.title;
    img.src = card.image || "./cards/placeholder.svg";
    img.loading = "lazy";
    img.onerror = () => {
      img.remove();
    };
    art.appendChild(img);

    const content = document.createElement("div");
    content.className = "card-content";

    if (showOrientation) {
      const orientationPill = document.createElement("span");
      orientationPill.className = "orientation-pill";
      orientationPill.textContent = orientation === "reversed" ? "Reversed" : "Upright";
      content.appendChild(orientationPill);
    }

    const heading = document.createElement("div");
    heading.className = "card-heading";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = card.title;
    heading.appendChild(title);

    if (cardId) {
      const favoriteButton = document.createElement("button");
      favoriteButton.type = "button";
      favoriteButton.className = "favorite-toggle";
      favoriteButton.dataset.cardId = cardId;
      const favorited = isFavoriteCard(cardId);
      favoriteButton.setAttribute("aria-pressed", favorited ? "true" : "false");
      favoriteButton.textContent = favorited ? "Favorited" : "Favorite";
      favoriteButton.classList.toggle("is-favorited", favorited);
      heading.appendChild(favoriteButton);
    }

    const keywords = document.createElement("p");
    keywords.className = "keyword-list";
    keywords.innerHTML = `<span class="keyword-label">Keywords:</span> ${formatKeywords(
      card.keywords
    )}`;

    const reversed = document.createElement("p");
    reversed.className = "reversed-list";
    reversed.innerHTML = `<span class="keyword-label">Reversed:</span> ${formatKeywords(
      card.reversed
    )}`;

    content.appendChild(heading);
    content.appendChild(keywords);
    content.appendChild(reversed);

    wrapper.appendChild(art);
    wrapper.appendChild(content);
    return wrapper;
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const favoriteButton = target.closest(".favorite-toggle");
    if (!favoriteButton) {
      return;
    }

    const cardId = favoriteButton.dataset.cardId;
    toggleFavoriteCard(cardId);
  });

  return {
    loadDeck,
    shuffle,
    drawUnique,
    drawOrientation,
    createReadingCardSnapshot,
    saveReading,
    getReadingHistory,
    clearReadingHistory,
    updateReadingNote,
    isFavoriteCard,
    toggleFavoriteCard,
    getFavoriteCardIds,
    HISTORY_UPDATED_EVENT,
    FAVORITES_UPDATED_EVENT,
    createCardElement,
  };
})();
