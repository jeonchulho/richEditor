import type { FormattingRole, LineHeightOption, TableAction } from "../types";

export function bindRichEditorEvents(ctx: any): void {
  const snapshotSelectionForToolbar = (event: Event): void => {
    const target = event.target as HTMLElement;
    if (target.closest("button,select,input,label")) {
      ctx.isToolbarInteracting = true;
      ctx.captureSelection();
      const activeRange = ctx.getActiveEditorRange();
      if (activeRange && !activeRange.collapsed) {
        ctx.toolbarInteractionRange = activeRange.cloneRange();
      } else if (ctx.lastExpandedRange && ctx.editor.contains(ctx.lastExpandedRange.commonAncestorContainer)) {
        ctx.toolbarInteractionRange = ctx.lastExpandedRange.cloneRange();
      } else {
        ctx.toolbarInteractionRange = activeRange ? activeRange.cloneRange() : null;
      }
      ctx.debugLog(`toolbar snapshot: ${ctx.describeRange(ctx.toolbarInteractionRange)}`);
    }
  };

  ctx.toolbar.addEventListener("pointerdown", snapshotSelectionForToolbar, true);
  ctx.toolbar.addEventListener("mousedown", snapshotSelectionForToolbar, true);

  ctx.toolbar.addEventListener("click", (event: Event) => {
    const target = event.target as HTMLElement;
    const button = target.closest("button");
    if (!button) {
      return;
    }

    const cmd = button.dataset.cmd;
    const tableAction = button.dataset.table as TableAction | undefined;
    const action = button.dataset.action;

    if (cmd) {
      ctx.restoreSelection();
      ctx.exec(cmd);
      ctx.updateToolbarState();
      return;
    }

    if (tableAction) {
      ctx.restoreSelection();
      ctx.handleTableAction(tableAction);
      ctx.updateToolbarState();
      return;
    }

    if (action === "emoji") {
      event.stopPropagation();
      ctx.toggleEmojiPicker();
      return;
    }

    if (action === "colorPalette") {
      event.stopPropagation();
      ctx.captureSelection();
      const activeRange = ctx.getActiveEditorRange();
      ctx.toolbarInteractionRange = activeRange ? activeRange.cloneRange() : ctx.lastExpandedRange?.cloneRange() ?? null;
      ctx.isToolbarInteracting = true;
      ctx.toggleColorPalette();
      return;
    }

    if (action === "image") {
      ctx.imageInput.click();
      return;
    }

    if (action === "save") {
      ctx.save();
      return;
    }

    if (action === "toggleDebug") {
      ctx.setDebugPanelVisible(!ctx.debugPanelVisible);
      ctx.saveUiPrefs();
    }
  });

  ctx.toolbar.addEventListener("change", (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const role = target.dataset.role;
    if (!role) {
      return;
    }

    const selectedValue = target.value;

    if (role === "unmergeMode") {
      ctx.saveUiPrefs();
      return;
    }

    if (role === "flashIntensity") {
      ctx.saveUiPrefs();
      return;
    }

    if (role === "fontName" || role === "fontSize") {
      ctx.applyFormattingRoleChange(role, selectedValue, "change");
      return;
    }

    if (role === "lineHeight") {
      ctx.restoreSelection();
      ctx.applyLineHeightToSelection(selectedValue as LineHeightOption);
      ctx.updateToolbarState();
    }
  });

  ctx.toolbar.addEventListener("input", (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const role = target.dataset.role;
    void role;
    void target;
  });

  ctx.toolbar.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (ctx.toolbar.matches(":focus-within")) {
        return;
      }
      if (!ctx.colorPalette.hidden) {
        return;
      }
      ctx.endToolbarInteraction();
    }, 0);
  });

  ctx.colorPalette.addEventListener("mousedown", (event: MouseEvent) => {
    event.preventDefault();
  });

  ctx.colorPalette.addEventListener("click", (event: Event) => {
    const target = event.target as HTMLElement;
    const swatch = target.closest("button[data-color-role]") as HTMLButtonElement | null;
    if (swatch) {
      const role = swatch.dataset.colorRole as FormattingRole | undefined;
      const value = swatch.dataset.colorValue;
      if ((role === "foreColor" || role === "hiliteColor") && value) {
        ctx.applyFormattingRoleChange(role, value, "palette");
        ctx.updateToolbarState();
      }
      return;
    }

    const actionButton = target.closest("button[data-action]") as HTMLButtonElement | null;
    if (actionButton?.dataset.action === "resetColors") {
      ctx.applyFormattingRoleChange("foreColor", "#0f172a", "palette");
      ctx.applyFormattingRoleChange("hiliteColor", "transparent", "palette");
      ctx.updateToolbarState();
    }
  });

  ctx.mergePreviewBadge.addEventListener("click", () => {
    if (!ctx.pendingExpandedMerge) {
      return;
    }
    ctx.clearSelectedCells();
    ctx.showSaveStatus("Merge preview canceled");
  });

  ctx.mergeRangeBadge.addEventListener("click", () => {
    if (!ctx.pendingExpandedMerge) {
      return;
    }
    ctx.flashPendingMergeArea();
  });

  ctx.imageInput.addEventListener("change", async () => {
    const file = ctx.imageInput.files?.[0];
    if (!file) {
      return;
    }
    ctx.restoreSelection();
    await ctx.insertImageFromFile(file);
    ctx.imageInput.value = "";
  });

  ctx.tableContextMenu.addEventListener("mousedown", (event: MouseEvent) => {
    event.preventDefault();
  });

  ctx.tableContextMenu.addEventListener("click", (event: Event) => {
    const target = event.target as HTMLElement;
    const button = target.closest("button[data-table-action]") as HTMLButtonElement | null;
    if (!button) {
      return;
    }

    const action = button.dataset.tableAction as TableAction | undefined;
    if (!action) {
      return;
    }

    ctx.restoreSelection();
    ctx.handleTableAction(action);
    ctx.updateToolbarState();
    ctx.hideTableContextMenu();
  });

  ctx.editor.addEventListener("keyup", () => {
    ctx.captureSelection();
    ctx.updateToolbarState();
  });
  ctx.editor.addEventListener("mouseup", () => {
    ctx.captureSelection();
    ctx.updateToolbarState();
  });
  ctx.editor.addEventListener("focus", () => {
    ctx.captureSelection();
    ctx.updateToolbarState();
  });

  ctx.editor.addEventListener("input", () => {
    ctx.debouncedSave();
    ctx.captureSelection();
    ctx.updateToolbarState();
  });

  ctx.editor.addEventListener("click", (event: Event) => {
    const mouseEvent = event as MouseEvent;
    const target = event.target as HTMLElement;
    ctx.hideTableContextMenu();
    const cell = (event.target as HTMLElement).closest("td,th");
    if (!cell) {
      ctx.clearSelectedCells();
      ctx.keyboardAnchorCell = null;
      ctx.keyboardFocusCell = null;
      if (ctx.isEmptyEditorClickTarget(target)) {
        ctx.resetTypingColorToDefault();
      }
      return;
    }

    if (mouseEvent.shiftKey) {
      ctx.toggleCellSelection(cell as HTMLTableCellElement);
    } else if (mouseEvent.metaKey || mouseEvent.ctrlKey) {
      ctx.toggleCellSelection(cell as HTMLTableCellElement);
      ctx.keyboardFocusCell = cell as HTMLTableCellElement;
    } else {
      ctx.clearSelectedCells();
      ctx.keyboardAnchorCell = cell as HTMLTableCellElement;
      ctx.keyboardFocusCell = cell as HTMLTableCellElement;
    }

    ctx.updateMergePreview();
  });

  ctx.editor.addEventListener("contextmenu", (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.closest(".re-col-handle") || target.closest(".re-row-handle") || target.closest(".re-image-handle")) {
      return;
    }

    const cell = target.closest("td,th") as HTMLTableCellElement | null;
    if (!cell) {
      ctx.hideTableContextMenu();
      return;
    }

    event.preventDefault();
    ctx.focusEditor();
    ctx.placeCaretInCell(cell, "start");

    if (!ctx.selectedCells.has(cell)) {
      ctx.clearSelectedCells();
      ctx.selectedCells.add(cell);
      cell.classList.add("re-cell-selected");
    }

    ctx.keyboardAnchorCell = cell;
    ctx.keyboardFocusCell = cell;
    ctx.updateMergePreview();
    ctx.showTableContextMenu((event as MouseEvent).clientX, (event as MouseEvent).clientY);
  });

  ctx.editor.addEventListener("mousedown", (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.closest(".re-col-handle") || target.closest(".re-row-handle") || target.closest(".re-image-handle")) {
      return;
    }

    const cell = target.closest("td,th") as HTMLTableCellElement | null;
    if (!cell || (event as MouseEvent).button !== 0) {
      ctx.isCellDragSelecting = false;
      ctx.dragAnchorCell = null;
      return;
    }

    if (!(event as MouseEvent).shiftKey) {
      ctx.isCellDragSelecting = false;
      ctx.dragAnchorCell = null;
      return;
    }

    ctx.isCellDragSelecting = true;
    ctx.dragAnchorCell = cell;
    ctx.clearSelectedCells();
    ctx.selectedCells.add(cell);
    cell.classList.add("re-cell-selected");
    ctx.keyboardAnchorCell = cell;
    ctx.keyboardFocusCell = cell;
    ctx.updateMergePreview();
    (event as MouseEvent).preventDefault();
  });

  ctx.editor.addEventListener("mousemove", (event: Event) => {
    if (!ctx.isCellDragSelecting || !ctx.dragAnchorCell) {
      return;
    }

    const target = event.target as HTMLElement;
    const cell = target.closest("td,th") as HTMLTableCellElement | null;
    if (!cell) {
      return;
    }

    ctx.selectCellRectangle(ctx.dragAnchorCell, cell);
  });

  document.addEventListener("mouseup", () => {
    ctx.isCellDragSelecting = false;
    ctx.dragAnchorCell = null;
    ctx.tableGridSelecting = false;
  });

  ctx.editor.addEventListener("paste", (event: ClipboardEvent) => ctx.handlePaste(event));

  ctx.editor.addEventListener("keydown", (event: KeyboardEvent) => ctx.handleKeydown(event));

  document.addEventListener("selectionchange", () => {
    if (ctx.isRestoringSelection) {
      return;
    }
    if (ctx.isToolbarInteracting) {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!ctx.editor.contains(range.commonAncestorContainer)) {
      return;
    }

    ctx.syncSelectedCellsWithCaret();
    ctx.captureSelection();
    ctx.updateToolbarState();
  });

  document.addEventListener("click", (event: Event) => {
    const target = event.target as Node;
    if (!ctx.emojiPicker.hidden && !ctx.emojiPicker.contains(target) && !ctx.emojiButton.contains(target)) {
      ctx.emojiPicker.hidden = true;
    }

    if (!ctx.colorPalette.hidden && !ctx.colorPalette.contains(target) && !ctx.colorPaletteButton.contains(target)) {
      ctx.colorPalette.hidden = true;
      ctx.endToolbarInteraction();
    }

    if (!ctx.tableSizePicker.hidden && !ctx.tableSizePicker.contains(target) && !ctx.tableInsertButton.contains(target)) {
      ctx.hideTableSizePicker();
    }

    if (!ctx.tableContextMenu.hidden && !ctx.tableContextMenu.contains(target)) {
      ctx.hideTableContextMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (!ctx.emojiPicker.hidden) {
      ctx.positionEmojiPicker();
    }
    if (!ctx.colorPalette.hidden) {
      ctx.positionColorPalette();
    }
    if (!ctx.tableSizePicker.hidden) {
      ctx.positionTableSizePicker();
    }
    if (!ctx.tableContextMenu.hidden) {
      ctx.hideTableContextMenu();
    }
  });
}
