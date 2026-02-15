const libraryGrid = document.getElementById("library-grid");
const searchInput = document.getElementById("search-input");
const meaningFilter = document.getElementById("meaning-filter");
const keywordFilter = document.getElementById("keyword-filter");
const favoritesOnlyInput = document.getElementById("favorites-only");
const clearFiltersButton = document.getElementById("clear-filters");
const resultsCount = document.getElementById("results-count");
const favoritesPanel = document.getElementById("favorites-panel");
const favoritesGrid = document.getElementById("favorites-grid");

let deckCache = [];

const toLower = (value) => String(value || "").toLowerCase();

const getMeaningTerms = (card, mode) => {
  if (mode === "upright") {
    return [card.title, ...(card.keywords || [])];
  }
  if (mode === "reversed") {
    return [card.title, ...(card.reversed || [])];
  }
  return [card.title, ...(card.keywords || []), ...(card.reversed || [])];
};

const matchesQuery = (card, query, mode) => {
  if (!query) {
    return true;
  }
  const haystack = getMeaningTerms(card, mode).join(" ").toLowerCase();
  return haystack.includes(query);
};

const matchesKeyword = (card, keyword, mode) => {
  if (!keyword) {
    return true;
  }

  const normalizedKeyword = toLower(keyword);
  if (mode === "upright") {
    return (card.keywords || []).some((item) => toLower(item) === normalizedKeyword);
  }
  if (mode === "reversed") {
    return (card.reversed || []).some((item) => toLower(item) === normalizedKeyword);
  }
  return (
    (card.keywords || []).some((item) => toLower(item) === normalizedKeyword) ||
    (card.reversed || []).some((item) => toLower(item) === normalizedKeyword)
  );
};

const getKeywordsForMode = (cards, mode) => {
  const keywordSet = new Set();
  cards.forEach((card) => {
    if (mode === "all" || mode === "upright") {
      (card.keywords || []).forEach((item) => keywordSet.add(item));
    }
    if (mode === "all" || mode === "reversed") {
      (card.reversed || []).forEach((item) => keywordSet.add(item));
    }
  });
  return [...keywordSet].sort((a, b) => a.localeCompare(b));
};

const populateKeywordFilter = (mode, desiredValue = "") => {
  const keywords = getKeywordsForMode(deckCache, mode);
  const nextDesired = keywords.includes(desiredValue) ? desiredValue : "";

  keywordFilter.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Any keyword";
  keywordFilter.appendChild(defaultOption);

  keywords.forEach((keyword) => {
    const option = document.createElement("option");
    option.value = keyword;
    option.textContent = keyword;
    keywordFilter.appendChild(option);
  });

  keywordFilter.value = nextDesired;
};

const renderLibrary = (cards) => {
  libraryGrid.innerHTML = "";
  if (!cards.length) {
    const empty = document.createElement("p");
    empty.className = "library-empty";
    empty.textContent = "No cards match these filters.";
    libraryGrid.appendChild(empty);
    return;
  }

  cards.forEach((card) => {
    const cardEl = oracleApp.createCardElement(card, "upright", {
      compact: true,
      showOrientation: false,
    });
    cardEl.dataset.cardId = card.id;
    libraryGrid.appendChild(cardEl);
  });
};

const renderFavoritesPanel = () => {
  if (!favoritesPanel || !favoritesGrid) {
    return;
  }

  const favoriteIds = oracleApp.getFavoriteCardIds();
  const favorites = favoriteIds
    .map((favoriteId) => deckCache.find((card) => card.id === favoriteId))
    .filter(Boolean);

  favoritesGrid.innerHTML = "";
  favoritesPanel.classList.toggle("is-hidden", favorites.length === 0);

  favorites.forEach((card) => {
    const cardEl = oracleApp.createCardElement(card, "upright", {
      compact: true,
      showOrientation: false,
    });
    cardEl.dataset.cardId = card.id;
    favoritesGrid.appendChild(cardEl);
  });
};

const updateResultsCount = (visibleCount) => {
  if (!resultsCount) {
    return;
  }

  resultsCount.textContent = `${visibleCount} of ${deckCache.length} cards`;
};

const applyFilters = () => {
  const query = toLower(searchInput.value.trim());
  const mode = meaningFilter.value;
  const keyword = keywordFilter.value;
  const favoritesOnly = favoritesOnlyInput.checked;

  const filtered = deckCache.filter((card) => {
    if (favoritesOnly && !oracleApp.isFavoriteCard(card.id)) {
      return false;
    }
    if (!matchesQuery(card, query, mode)) {
      return false;
    }
    if (!matchesKeyword(card, keyword, mode)) {
      return false;
    }
    return true;
  });

  renderLibrary(filtered);
  updateResultsCount(filtered.length);
};

const clearFilters = () => {
  searchInput.value = "";
  meaningFilter.value = "all";
  populateKeywordFilter("all");
  favoritesOnlyInput.checked = false;
  applyFilters();
};

const initLibrary = async () => {
  deckCache = await oracleApp.loadDeck();
  populateKeywordFilter("all");
  renderFavoritesPanel();
  applyFilters();
};

searchInput.addEventListener("input", applyFilters);
meaningFilter.addEventListener("change", () => {
  populateKeywordFilter(meaningFilter.value, keywordFilter.value);
  applyFilters();
});
keywordFilter.addEventListener("change", applyFilters);
favoritesOnlyInput.addEventListener("change", applyFilters);
clearFiltersButton.addEventListener("click", clearFilters);
window.addEventListener(oracleApp.FAVORITES_UPDATED_EVENT, () => {
  renderFavoritesPanel();
  applyFilters();
});

initLibrary();
