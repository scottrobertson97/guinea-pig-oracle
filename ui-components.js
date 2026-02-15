const oracleUi = (() => {
  const formatHistoryTime = (isoTimestamp) => {
    const timestamp = new Date(isoTimestamp);
    if (Number.isNaN(timestamp.getTime())) {
      return "Unknown time";
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(timestamp);
  };

  const toRenderableCard = (cardSnapshot, options = {}) => {
    const { index = 0, idPrefix = "history-card" } = options;
    return {
      id: cardSnapshot?.id || `${idPrefix}-${index + 1}`,
      title: cardSnapshot?.title || `Card ${index + 1}`,
      image: cardSnapshot?.image || "./cards/placeholder.svg",
      keywords: Array.isArray(cardSnapshot?.keywords) ? cardSnapshot.keywords : [],
      reversed: Array.isArray(cardSnapshot?.reversed) ? cardSnapshot.reversed : [],
    };
  };

  const toShareTitle = (entry) => {
    if (entry?.spreadLabel) {
      return `Guinea Pig Oracle | ${entry.spreadLabel}`;
    }
    if (entry?.title) {
      return `Guinea Pig Oracle | ${entry.title}`;
    }
    return "Guinea Pig Oracle Reading";
  };

  const toShareText = (entry) => {
    const cards = Array.isArray(entry?.cards) ? entry.cards : [];
    const lines = [toShareTitle(entry)];
    lines.push(`Saved: ${formatHistoryTime(entry?.createdAt)}`);

    if (entry?.type === "single" && cards[0]) {
      const card = cards[0];
      const orientation = card.orientation === "reversed" ? "Reversed" : "Upright";
      lines.push(`Card: ${card.title || "Card 1"} (${orientation})`);
    } else if (cards.length) {
      lines.push("Cards:");
      cards.forEach((card, index) => {
        const orientation = card.orientation === "reversed" ? "Reversed" : "Upright";
        const label = card.label || `Card ${index + 1}`;
        lines.push(`- ${label}: ${card.title || `Card ${index + 1}`} (${orientation})`);
      });
    }

    const note = typeof entry?.note === "string" ? entry.note.trim() : "";
    if (note) {
      lines.push("");
      lines.push("Note:");
      lines.push(note);
    }

    return lines.join("\n");
  };

  const toPrimaryImageUrl = (entry) => {
    const firstCard = Array.isArray(entry?.cards) ? entry.cards[0] : null;
    const imagePath = firstCard?.image;
    if (!imagePath) {
      return "";
    }
    try {
      return new URL(imagePath, window.location.href).href;
    } catch (error) {
      return "";
    }
  };

  const writeClipboardText = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const probe = document.createElement("textarea");
    probe.value = text;
    probe.setAttribute("readonly", "true");
    probe.style.position = "fixed";
    probe.style.opacity = "0";
    document.body.appendChild(probe);
    probe.focus();
    probe.select();

    const success = document.execCommand("copy");
    document.body.removeChild(probe);

    if (!success) {
      throw new Error("Clipboard copy failed");
    }
  };

  const shareReadingEntry = async (entry) => {
    const title = toShareTitle(entry);
    const text = toShareText(entry);
    const imageUrl = toPrimaryImageUrl(entry);
    const sharePayload = {
      title,
      text,
    };
    if (imageUrl) {
      sharePayload.url = imageUrl;
    }

    if (navigator.share) {
      try {
        await navigator.share(sharePayload);
        return {
          ok: true,
          method: "native",
        };
      } catch (error) {
        if (error?.name === "AbortError") {
          return {
            ok: false,
            reason: "cancelled",
          };
        }
      }
    }

    try {
      const clipboardPayload = imageUrl ? `${text}\n${imageUrl}` : text;
      await writeClipboardText(clipboardPayload);
      return {
        ok: true,
        method: "clipboard",
      };
    } catch (error) {
      return {
        ok: false,
        reason: "unavailable",
      };
    }
  };

  const createHistoryItemElement = (options) => {
    const {
      title = "Saved reading",
      metaLines = [],
      actions = [],
      actionText = "Restore",
      onAction = () => {},
    } = options;

    const item = document.createElement("article");
    item.className = "history-item";

    const body = document.createElement("div");
    body.className = "history-item-body";
    const titleEl = document.createElement("h3");
    titleEl.className = "history-item-title";
    titleEl.textContent = title;
    body.appendChild(titleEl);

    metaLines
      .map((line) => String(line).trim())
      .filter(Boolean)
      .forEach((line) => {
        const meta = document.createElement("p");
        meta.className = "history-item-meta";
        meta.textContent = line;
        body.appendChild(meta);
      });

    const actionItems =
      Array.isArray(actions) && actions.length
        ? actions
        : [
            {
              label: actionText,
              onAction,
              className: "",
            },
          ];

    const actionsWrap = document.createElement("div");
    actionsWrap.className = "history-item-actions";

    actionItems.forEach((action) => {
      const actionButton = document.createElement("button");
      actionButton.type = "button";
      actionButton.className = `history-action${action.className ? ` ${action.className}` : ""}`;
      actionButton.textContent = action.label || "Action";
      actionButton.addEventListener("click", action.onAction || (() => {}));
      actionsWrap.appendChild(actionButton);
    });

    item.appendChild(body);
    item.appendChild(actionsWrap);
    return item;
  };

  const renderHistoryList = (options) => {
    const {
      listElement,
      entries,
      emptyText = "No saved readings yet.",
      createItem,
    } = options;

    if (!listElement) {
      return;
    }

    listElement.innerHTML = "";
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "history-empty";
      empty.textContent = emptyText;
      listElement.appendChild(empty);
      return;
    }

    entries.forEach((entry) => {
      const item = createItem(entry);
      if (item) {
        listElement.appendChild(item);
      }
    });
  };

  const createHistoryNoteEditor = (options) => {
    const {
      note = "",
      placeholder = "Add a note about this reading...",
      maxLength = 2000,
      saveLabel = "Save Note",
      onSave = () => {},
    } = options;

    let committedValue = typeof note === "string" ? note : "";

    const wrapper = document.createElement("div");
    wrapper.className = "history-note";

    const input = document.createElement("textarea");
    input.className = "history-note-input";
    input.rows = 3;
    input.maxLength = maxLength;
    input.placeholder = placeholder;
    input.value = committedValue;

    const actions = document.createElement("div");
    actions.className = "history-note-actions";

    const status = document.createElement("span");
    status.className = "history-note-status";
    status.textContent = committedValue ? "Saved" : "";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "history-note-save";
    saveButton.textContent = saveLabel;
    saveButton.disabled = true;

    const setDirtyState = () => {
      const isDirty = input.value !== committedValue;
      saveButton.disabled = !isDirty;
      if (isDirty) {
        status.textContent = "Unsaved";
      }
    };

    const saveNote = () => {
      if (input.value === committedValue) {
        return;
      }

      const saved = onSave(input.value);
      if (saved === false) {
        status.textContent = "Could not save";
        return;
      }

      committedValue = input.value;
      saveButton.disabled = true;
      status.textContent = committedValue ? "Saved" : "";
    };

    saveButton.addEventListener("click", saveNote);
    input.addEventListener("input", setDirtyState);
    input.addEventListener("blur", saveNote);

    actions.appendChild(status);
    actions.appendChild(saveButton);

    wrapper.appendChild(input);
    wrapper.appendChild(actions);
    return wrapper;
  };

  return {
    formatHistoryTime,
    toRenderableCard,
    shareReadingEntry,
    createHistoryItemElement,
    createHistoryNoteEditor,
    renderHistoryList,
  };
})();
