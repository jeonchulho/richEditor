import type { FormattingRole, LineHeightOption, TableAction } from "../types";

// 에디터 UI 이벤트를 한곳에서 묶어 바인딩한다.
// ctx는 RichEditor 인스턴스의 메서드/상태를 위임받아 사용한다.
export function bindRichEditorEvents(ctx: any): void {
  const asElement = (target: EventTarget | null): HTMLElement | null => {
    if (!target) {
      return null;
    }
    if (target instanceof HTMLElement) {
      return target;
    }
    if (target instanceof Node) {
      return target.parentElement;
    }
    return null;
  };

  const isEditableTargetOutsideEditor = (target: EventTarget | null): boolean => {
    const node = asElement(target);
    if (!node) {
      return false;
    }
    if (ctx.editor.contains(node)) {
      return false;
    }
    if (node.closest("input,textarea,select")) {
      return true;
    }
    return node.isContentEditable;
  };

  const isTargetInsideDebugPanel = (target: EventTarget | null): boolean => {
    const node = target as Node | null;
    return Boolean(node && ctx.debugPanel.contains(node));
  };

  const hasExternalTextSelection = (): boolean => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return false;
    }

    const range = selection.getRangeAt(0);
    if (ctx.editor.contains(range.commonAncestorContainer)) {
      return false;
    }

    return selection.toString().trim().length > 0;
  };

  const shouldBypassGlobalClipboardFallback = (target: EventTarget | null): boolean => {
    if (isTargetInsideDebugPanel(target)) {
      return true;
    }
    if (isEditableTargetOutsideEditor(target)) {
      return true;
    }
    if (hasExternalTextSelection()) {
      return true;
    }
    return false;
  };

  // 툴바 상호작용 직전에 현재 selection을 스냅샷해,
  // 툴바 클릭으로 focus가 이동해도 편집 위치를 복원할 수 있게 한다.
  const snapshotSelectionForToolbar = (event: Event): void => {
    const target = event.target as HTMLElement;
    if (target.closest("button,select,input,label")) {
      ctx.isToolbarInteracting = true;
      ctx.captureSelection();
      const activeRange = ctx.getActiveEditorRange();
      // Prefer current editor range even when collapsed; fallback to last expanded only when missing.
      if (activeRange) {
        ctx.toolbarInteractionRange = activeRange.cloneRange();
      } else if (ctx.lastExpandedRange && ctx.editor.contains(ctx.lastExpandedRange.commonAncestorContainer)) {
        ctx.toolbarInteractionRange = ctx.lastExpandedRange.cloneRange();
      } else {
        ctx.toolbarInteractionRange = null;
      }
      const targetInfo = target.tagName.toLowerCase();
      const activeCell = ctx.getSelectedCell?.();
      const cellInfo = activeCell ? ctx.describeCell(activeCell) : "none";
      ctx.debugLog(`toolbar snapshot target=${targetInfo} range=${ctx.describeRange(ctx.toolbarInteractionRange)} cell=${cellInfo}`);
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
      const beforeRange = ctx.getActiveEditorRange?.() ?? null;
      const beforeCell = ctx.getSelectedCell?.() as HTMLTableCellElement | null;
      ctx.debugLog(
        `toolbar table action start action=${tableAction} selectedCells=${ctx.selectedCells.size} anchor=${ctx.keyboardAnchorCell ? ctx.describeCell(ctx.keyboardAnchorCell) : "none"} focus=${ctx.keyboardFocusCell ? ctx.describeCell(ctx.keyboardFocusCell) : "none"} beforeCell=${beforeCell ? ctx.describeCell(beforeCell) : "none"} beforeRange=${ctx.describeRange(beforeRange)}`,
      );

      if (tableAction === "insert") {
        // insert는 picker를 여는 단계이므로 여기서 selection을 강제 복원하면
        // 이전 caret 위치(예: 첫 줄)로 되돌아가 삽입 지점이 어긋날 수 있다.
        ctx.handleTableAction(tableAction);
        ctx.updateToolbarState();
        return;
      }

      // 표 액션은 이전 expanded 범위로 되돌아가면 다른 표를 수정할 수 있어 fallback을 끈다.
      ctx.restoreSelection(false);
      const restoredCell = ctx.getSelectedCell?.() as HTMLTableCellElement | null;
      ctx.debugLog(
        `toolbar table action restored action=${tableAction} restoredCell=${restoredCell ? ctx.describeCell(restoredCell) : "none"} restoredRange=${ctx.describeRange(ctx.getActiveEditorRange?.() ?? null)}`,
      );
      ctx.handleTableAction(tableAction);
      ctx.updateToolbarState();
      return;
    }

    if (action === "emoji") {
      event.stopPropagation();
      const activeRange = ctx.getActiveEditorRange();
      const activeCell = ctx.getSelectedCell?.();
      ctx.debugLog(`emoji toolbar click range=${ctx.describeRange(activeRange)} cell=${activeCell ? ctx.describeCell(activeCell) : "none"}`);
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

    if (action === "insertWeeklyReportTemplate") {
      ctx.restoreSelection(false);
      ctx.insertWeeklyReportTemplate?.();
      ctx.updateToolbarState();
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

  ctx.root.addEventListener("click", (event: Event) => {
    const target = event.target as HTMLElement;
    const button = target.closest("button[data-action]") as HTMLButtonElement | null;
    if (!button) {
      return;
    }

    event.preventDefault();
    if (button.dataset.action === "clearDebugLog") {
      ctx.clearDebugLogText();
      return;
    }

    if (button.dataset.action === "copyDebugLog") {
      void ctx.copyDebugLogText();
      return;
    }

    if (button.dataset.action === "cancelTableProps") {
      ctx.cancelTablePropsDialog?.();
      return;
    }

    if (button.dataset.action === "resetTableProps") {
      ctx.resetTablePropsDialogInputs?.();
      return;
    }

    if (button.dataset.action === "toggleTablePropsCollapse") {
      ctx.toggleTablePropsDialogCollapsed?.();
      return;
    }

    if (button.dataset.action === "applyTableProps") {
      ctx.applyTablePropsDialog?.();
      if (!ctx.tablePropsDialog?.hidden && ctx.tablePropsValidation?.hidden) {
        ctx.hideTablePropsDialog?.();
        ctx.clearTablePropsSession?.();
      }
      return;
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

    if (role === "headerPasteMode") {
      ctx.syncHeaderPasteModeFromUi();
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
    // 색상 버튼 클릭 시 에디터 selection이 날아가지 않도록 기본 포커스 이동을 막는다.
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

    // 이미지 삽입은 현재 caret 위치를 그대로 써야 하므로,
    // lastExpandedRange fallback(기본 true)을 끄고 정확한 위치만 복원한다.
    ctx.restoreSelection(false);
    await ctx.insertImageFromFile(file);
    ctx.imageInput.value = "";
  });

  ctx.tableContextMenu.addEventListener("mousedown", (event: MouseEvent) => {
    event.preventDefault();
  });

  let tablePropsDragState: { offsetX: number; offsetY: number; shellRect: DOMRect } | null = null;

  ctx.tablePropsDragHandle?.addEventListener("mousedown", (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('button[data-action="toggleTablePropsCollapse"]')) {
      return;
    }

    const shell = ctx.root.querySelector(".re-shell") as HTMLElement | null;
    if (!shell || ctx.tablePropsDialog.hidden) {
      return;
    }

    const dialogRect = ctx.tablePropsDialog.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    tablePropsDragState = {
      offsetX: event.clientX - dialogRect.left,
      offsetY: event.clientY - dialogRect.top,
      shellRect,
    };
    ctx.tablePropsDialog.classList.add("is-dragging");
    event.preventDefault();
  });

  document.addEventListener("mousemove", (event: MouseEvent) => {
    if (!tablePropsDragState || ctx.tablePropsDialog.hidden) {
      return;
    }

    const dialogWidth = ctx.tablePropsDialog.offsetWidth;
    const dialogHeight = ctx.tablePropsDialog.offsetHeight;
    const rawLeft = event.clientX - tablePropsDragState.shellRect.left - tablePropsDragState.offsetX;
    const rawTop = event.clientY - tablePropsDragState.shellRect.top - tablePropsDragState.offsetY;
    const next = ctx.clampTablePropsDialogPosition?.(
      rawLeft,
      rawTop,
      tablePropsDragState.shellRect,
      dialogWidth,
      dialogHeight,
    ) ?? { left: Math.round(rawLeft), top: Math.round(rawTop) };

    ctx.tablePropsDialog.style.left = `${next.left}px`;
    ctx.tablePropsDialog.style.top = `${next.top}px`;
    ctx.cacheTablePropsDialogPosition?.(next.left, next.top);
  });

  document.addEventListener("mouseup", () => {
    if (!tablePropsDragState) {
      return;
    }

    tablePropsDragState = null;
    ctx.tablePropsDialog.classList.remove("is-dragging");
  });

  ctx.tablePropsBackdrop?.addEventListener("click", () => {
    ctx.cancelTablePropsDialog?.();
  });

  ctx.tablePropsDialog?.addEventListener("mousedown", (event: MouseEvent) => {
    event.stopPropagation();
  });

  ctx.tablePropsDialog?.addEventListener("click", (event: Event) => {
    const target = event.target as HTMLElement;
    const tabButton = target.closest("button[data-table-props-mode]") as HTMLButtonElement | null;
    if (tabButton) {
      const mode = tabButton.dataset.tablePropsMode as "table" | "row" | "cell" | "col" | undefined;
      if (!mode) {
        return;
      }

      ctx.switchTablePropsMode?.(mode);
      return;
    }

    const recentButton = target.closest("button[data-table-props-recent-color]") as HTMLButtonElement | null;
    if (recentButton?.dataset.tablePropsRecentColor) {
      ctx.applyRecentTablePropsColor?.(recentButton.dataset.tablePropsRecentColor);
      ctx.previewTablePropsDialog?.();
      return;
    }

    const paddingPresetButton = target.closest("button[data-table-props-cell-padding]") as HTMLButtonElement | null;
    if (paddingPresetButton?.dataset.tablePropsCellPadding) {
      const value = paddingPresetButton.dataset.tablePropsCellPadding;
      if (ctx.tablePropsCellPaddingInput) {
        ctx.tablePropsCellPaddingInput.value = value;
      }
      if (ctx.tablePropsCellPaddingRange) {
        ctx.tablePropsCellPaddingRange.value = value;
      }
      ctx.previewTablePropsDialog?.();
    }
  });

  ctx.tablePropsDialog?.addEventListener("focusin", (event: Event) => {
    const target = event.target as HTMLElement;
    const role = target.getAttribute?.("data-role") ?? "";
    if (role.startsWith("tableProps") && role.toLowerCase().includes("color")) {
      ctx.setActiveTablePropsColorFieldFromRole?.(role);
    }
  });

  ctx.tablePropsDialog?.addEventListener("input", () => {
    const active = document.activeElement as HTMLElement | null;
    const role = active?.getAttribute?.("data-role") ?? "";
    if (role === "tablePropsCellPadding") {
      const next = ctx.tablePropsCellPaddingInput?.value ?? "";
      if (next.length > 0 && ctx.tablePropsCellPaddingRange) {
        ctx.tablePropsCellPaddingRange.value = next;
      }
    } else if (role === "tablePropsCellPaddingRange") {
      if (ctx.tablePropsCellPaddingInput && ctx.tablePropsCellPaddingRange) {
        ctx.tablePropsCellPaddingInput.value = ctx.tablePropsCellPaddingRange.value;
      }
    }

    if (role === "tablePropsBorderColorPicker") {
      ctx.setActiveTablePropsColorFieldFromRole?.(role);
      ctx.syncTablePropsColorPair?.("tableBorder", "picker");
      ctx.pushRecentTablePropColor?.(ctx.tablePropsBorderColorInput?.value ?? "");
    } else if (role === "tablePropsBgColorPicker") {
      ctx.setActiveTablePropsColorFieldFromRole?.(role);
      ctx.syncTablePropsColorPair?.("tableBg", "picker");
      ctx.pushRecentTablePropColor?.(ctx.tablePropsBgColorInput?.value ?? "");
    } else if (role === "tablePropsRowBgColorPicker") {
      ctx.setActiveTablePropsColorFieldFromRole?.(role);
      ctx.syncTablePropsColorPair?.("rowBg", "picker");
      ctx.pushRecentTablePropColor?.(ctx.tablePropsRowBgColorInput?.value ?? "");
    } else if (role === "tablePropsCellBorderColorPicker") {
      ctx.setActiveTablePropsColorFieldFromRole?.(role);
      ctx.syncTablePropsColorPair?.("cellBorder", "picker");
      ctx.pushRecentTablePropColor?.(ctx.tablePropsCellBorderColorInput?.value ?? "");
    } else if (role === "tablePropsCellTextColorPicker") {
      ctx.setActiveTablePropsColorFieldFromRole?.(role);
      ctx.syncTablePropsColorPair?.("cellText", "picker");
      ctx.pushRecentTablePropColor?.(ctx.tablePropsCellTextColorInput?.value ?? "");
    } else if (role === "tablePropsCellBgColorPicker") {
      ctx.setActiveTablePropsColorFieldFromRole?.(role);
      ctx.syncTablePropsColorPair?.("cellBg", "picker");
      ctx.pushRecentTablePropColor?.(ctx.tablePropsCellBgColorInput?.value ?? "");
    } else if (role === "tablePropsColBgColorPicker") {
      ctx.setActiveTablePropsColorFieldFromRole?.(role);
      ctx.syncTablePropsColorPair?.("colBg", "picker");
      ctx.pushRecentTablePropColor?.(ctx.tablePropsColBgColorInput?.value ?? "");
    } else if (role === "tablePropsBorderColor") {
      ctx.setActiveTablePropsColorFieldFromRole?.(role);
      ctx.syncTablePropsColorPair?.("tableBorder", "text");
    } else if (role === "tablePropsBgColor") {
      ctx.setActiveTablePropsColorFieldFromRole?.(role);
      ctx.syncTablePropsColorPair?.("tableBg", "text");
    } else if (role === "tablePropsRowBgColor") {
      ctx.setActiveTablePropsColorFieldFromRole?.(role);
      ctx.syncTablePropsColorPair?.("rowBg", "text");
    } else if (role === "tablePropsCellBorderColor") {
      ctx.setActiveTablePropsColorFieldFromRole?.(role);
      ctx.syncTablePropsColorPair?.("cellBorder", "text");
    } else if (role === "tablePropsCellTextColor") {
      ctx.setActiveTablePropsColorFieldFromRole?.(role);
      ctx.syncTablePropsColorPair?.("cellText", "text");
    } else if (role === "tablePropsCellBgColor") {
      ctx.setActiveTablePropsColorFieldFromRole?.(role);
      ctx.syncTablePropsColorPair?.("cellBg", "text");
    } else if (role === "tablePropsColBgColor") {
      ctx.setActiveTablePropsColorFieldFromRole?.(role);
      ctx.syncTablePropsColorPair?.("colBg", "text");
    }
    ctx.previewTablePropsDialog?.();
  });

  ctx.tablePropsDialog?.addEventListener("change", () => {
    ctx.previewTablePropsDialog?.();
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

    if (!(action === "cellProps" && ctx.selectedCells.size > 0)) {
      ctx.restoreSelection();
    }
    ctx.handleTableAction(action);
    ctx.updateToolbarState();
    ctx.hideTableContextMenu();
  });

  ctx.editor.addEventListener("keyup", () => {
    ctx.syncActiveImageWithCaret?.();
    ctx.captureSelection();
    ctx.updateToolbarState();
  });
  ctx.editor.addEventListener("mouseup", () => {
    ctx.syncActiveImageWithCaret?.();
    ctx.captureSelection();
    ctx.updateToolbarState();
  });
  ctx.editor.addEventListener("focus", () => {
    ctx.syncActiveImageWithCaret?.();
    ctx.captureSelection();
    ctx.updateToolbarState();
  });

  ctx.editor.addEventListener("input", () => {
    const skipNormalize = ctx.consumeSkipNormalizeOnNextInput?.() as boolean | undefined;
    if (!skipNormalize) {
      ctx.normalizeTopLevelParagraphs?.();
    }
    ctx.debouncedSave();
    ctx.normalizeInlineCaretMarkerAtSelection?.();
    ctx.syncActiveImageWithCaret?.();
    ctx.captureSelection();
    ctx.updateToolbarState();
  });

  ctx.editor.addEventListener("compositionstart", () => {
    ctx.isComposing = true;
  });

  ctx.editor.addEventListener("compositionend", () => {
    ctx.isComposing = false;
    ctx.normalizeTopLevelParagraphs?.();
    ctx.normalizeInlineCaretMarkerAtSelection?.();
    ctx.syncActiveImageWithCaret?.();
    ctx.captureSelection();
    ctx.updateToolbarState();
  });

  ctx.editor.addEventListener("click", (event: Event) => {
    const mouseEvent = event as MouseEvent;
    const target = event.target as HTMLElement;
    ctx.hideTableContextMenu();

    const imageWrap = target.closest(".re-image-wrap") as HTMLElement | null;
    if (imageWrap) {
      ctx.setActiveImageWrapper(imageWrap);
      ctx.setActiveTableElement(null);
      ctx.clearSelectedCells();
      ctx.keyboardAnchorCell = null;
      ctx.keyboardFocusCell = null;
      ctx.lastTableAnchorCell = null;
      ctx.debugLog("image click active wrapper selected");
      return;
    }

    if (ctx.activeImageWrapper) {
      ctx.setActiveImageWrapper(null);
    }

    if (ctx.didDragSelectCells) {
      ctx.debugLog("editor click ignored after drag-cell-selection");
      ctx.didDragSelectCells = false;
      event.preventDefault();
      return;
    }

    const cell = (event.target as HTMLElement).closest("td,th");
    if (!cell) {
      const table = target.closest("table");
      if (table) {
        ctx.setActiveTableElement(table as HTMLTableElement);
        ctx.debugLog("editor click inside table (non-cell target) -> keep selected cells");
        return;
      }

      ctx.setActiveTableElement(null);
      ctx.debugLog("editor click outside table cell -> clear selected cells");
      ctx.clearSelectedCells();
      ctx.keyboardAnchorCell = null;
      ctx.keyboardFocusCell = null;
      ctx.lastTableAnchorCell = null;
      if (ctx.isEmptyEditorClickTarget(target)) {
        ctx.resetTypingColorToDefault();
      }
      return;
    }

    // 클릭 조합 규칙:
    // - Shift: 범위/토글 선택 확장
    // - Ctrl/Meta: 다중 선택 토글
    // - 일반 클릭: 기존 선택 해제 후 현재 셀 기준으로 anchor/focus 설정
    if (mouseEvent.shiftKey) {
      ctx.toggleCellSelection(cell as HTMLTableCellElement);
      ctx.lastTableAnchorCell = cell as HTMLTableCellElement;
      ctx.debugLog(`cell click shift toggle cell=${ctx.describeCell(cell as HTMLTableCellElement)} selected=${ctx.selectedCells.size}`);
    } else if (mouseEvent.metaKey || mouseEvent.ctrlKey) {
      ctx.toggleCellSelection(cell as HTMLTableCellElement);
      ctx.keyboardFocusCell = cell as HTMLTableCellElement;
      ctx.lastTableAnchorCell = cell as HTMLTableCellElement;
      ctx.debugLog(`cell click multi toggle cell=${ctx.describeCell(cell as HTMLTableCellElement)} selected=${ctx.selectedCells.size}`);
    } else {
      ctx.clearSelectedCells();
      ctx.keyboardAnchorCell = cell as HTMLTableCellElement;
      ctx.keyboardFocusCell = cell as HTMLTableCellElement;
      ctx.lastTableAnchorCell = cell as HTMLTableCellElement;
      ctx.debugLog(`cell click single focus cell=${ctx.describeCell(cell as HTMLTableCellElement)}`);
    }

    ctx.setActiveTableElement((cell as HTMLTableCellElement).closest("table") as HTMLTableElement | null);

    ctx.updateMergePreview();
  });

  ctx.editor.addEventListener("contextmenu", (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.closest(".re-col-handle") || target.closest(".re-row-handle") || target.closest(".re-image-handle")) {
      return;
    }

    const cell = target.closest("td,th") as HTMLTableCellElement | null;
    if (!cell) {
      ctx.setActiveTableElement(null);
      ctx.hideTableContextMenu();
      return;
    }

    // 셀 우클릭 시 해당 셀을 활성화하고 컨텍스트 메뉴를 연다.
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
    ctx.setActiveTableElement(cell.closest("table") as HTMLTableElement | null);
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
      ctx.debugLog("cell drag reset: no target cell or non-left button");
      ctx.isCellDragSelecting = false;
      ctx.didDragSelectCells = false;
      ctx.dragAnchorCell = null;
      return;
    }

    ctx.didDragSelectCells = false;

    if (!(event as MouseEvent).shiftKey) {
      // 기본 드래그는 같은 셀 안에서 브라우저 텍스트 선택을 그대로 허용한다.
      // 다른 셀로 진입하는 순간 mousemove에서 셀 선택 모드로 승격한다.
      ctx.isCellDragSelecting = false;
      ctx.dragAnchorCell = cell;
      ctx.lastTableAnchorCell = cell;
      ctx.debugLog(`cell drag armed text-mode anchor=${ctx.describeCell(cell)}`);
      return;
    }

    // Shift + 드래그로 직사각형 셀 선택을 시작한다.
    ctx.isCellDragSelecting = true;
    ctx.dragAnchorCell = cell;
    ctx.clearSelectedCells();
    ctx.selectedCells.add(cell);
    cell.classList.add("re-cell-selected");
    ctx.keyboardAnchorCell = cell;
    ctx.keyboardFocusCell = cell;
    ctx.lastTableAnchorCell = cell;
    ctx.didDragSelectCells = true;
    ctx.updateMergePreview();
    ctx.debugLog(`cell drag start rectangle-mode anchor=${ctx.describeCell(cell)} selected=${ctx.selectedCells.size}`);
    (event as MouseEvent).preventDefault();
  });

  ctx.editor.addEventListener("mousemove", (event: Event) => {
    if (!ctx.dragAnchorCell) {
      return;
    }

    const target = event.target as HTMLElement;
    const cell = target.closest("td,th") as HTMLTableCellElement | null;
    if (!cell) {
      return;
    }

    if (!ctx.isCellDragSelecting && cell !== ctx.dragAnchorCell) {
      // 같은 셀을 벗어나면 텍스트 선택 모드에서 셀 범위 선택 모드로 전환한다.
      ctx.isCellDragSelecting = true;
      ctx.didDragSelectCells = true;
      const selection = window.getSelection();
      selection?.removeAllRanges();

      ctx.clearSelectedCells();
      ctx.selectedCells.add(ctx.dragAnchorCell);
      ctx.dragAnchorCell.classList.add("re-cell-selected");
      ctx.keyboardAnchorCell = ctx.dragAnchorCell;
      ctx.keyboardFocusCell = cell;
      ctx.lastTableAnchorCell = cell;
      ctx.updateMergePreview();
      ctx.debugLog(`cell drag promoted to rectangle-mode anchor=${ctx.describeCell(ctx.dragAnchorCell)} focus=${ctx.describeCell(cell)}`);
    }

    if (!ctx.isCellDragSelecting) {
      return;
    }

    ctx.selectCellRectangle(ctx.dragAnchorCell, cell);
    ctx.lastTableAnchorCell = cell;
    ctx.debugLog(`cell drag rectangle update anchor=${ctx.describeCell(ctx.dragAnchorCell)} focus=${ctx.describeCell(cell)} selected=${ctx.selectedCells.size}`);
  });

  document.addEventListener("mouseup", () => {
    if (ctx.dragAnchorCell) {
      ctx.debugLog(
        `cell drag end mode=${ctx.isCellDragSelecting ? "rectangle" : "text"} anchor=${ctx.describeCell(ctx.dragAnchorCell)} selected=${ctx.selectedCells.size}`,
      );
    }
    ctx.isCellDragSelecting = false;
    ctx.dragAnchorCell = null;
    ctx.tableGridSelecting = false;
  });

  ctx.editor.addEventListener("paste", (event: ClipboardEvent) => ctx.handlePaste(event));
  ctx.editor.addEventListener("copy", (event: ClipboardEvent) => ctx.handleCopy(event));
  ctx.editor.addEventListener("cut", (event: ClipboardEvent) => ctx.handleCut(event));

  // 드래그 선택 직후 포커스가 editor 엘리먼트가 아닐 때도
  // 선택 셀 기반 copy/cut/paste 처리가 누락되지 않도록 전역 폴백을 둔다.
  document.addEventListener("copy", (event: ClipboardEvent) => {
    const target = event.target as Node | null;
    if ((target && ctx.editor.contains(target)) || event.defaultPrevented) {
      return;
    }
    if (shouldBypassGlobalClipboardFallback(target)) {
      return;
    }
    if (ctx.selectedCells.size === 0) {
      return;
    }

    ctx.debugLog(`global copy fallback selected=${ctx.selectedCells.size}`);
    ctx.handleCopy(event);
  });

  document.addEventListener("cut", (event: ClipboardEvent) => {
    const target = event.target as Node | null;
    if ((target && ctx.editor.contains(target)) || event.defaultPrevented) {
      return;
    }
    if (shouldBypassGlobalClipboardFallback(target)) {
      return;
    }
    if (ctx.selectedCells.size === 0) {
      return;
    }

    ctx.debugLog(`global cut fallback selected=${ctx.selectedCells.size}`);
    ctx.handleCut(event);
  });

  document.addEventListener("paste", (event: ClipboardEvent) => {
    const target = event.target as Node | null;
    if ((target && ctx.editor.contains(target)) || event.defaultPrevented) {
      return;
    }
    if (shouldBypassGlobalClipboardFallback(target)) {
      return;
    }
    if (ctx.selectedCells.size === 0) {
      return;
    }

    ctx.debugLog(`global paste fallback selected=${ctx.selectedCells.size}`);
    ctx.handlePaste(event);
  });

  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape" && !ctx.tablePropsDialog.hidden) {
      event.preventDefault();
      ctx.cancelTablePropsDialog?.();
      return;
    }

    const mod = event.ctrlKey || event.metaKey;
    if (!mod || event.altKey) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key !== "c" && key !== "x" && key !== "v") {
      return;
    }

    const target = event.target as Node | null;
    if ((target && ctx.editor.contains(target)) || shouldBypassGlobalClipboardFallback(target)) {
      return;
    }

    if (ctx.selectedCells.size === 0) {
      return;
    }

    ctx.debugLog(`clipboard hotkey reroute key=${key} selected=${ctx.selectedCells.size}`);
    ctx.focusEditor();

    const anchor = ctx.keyboardAnchorCell ?? Array.from(ctx.selectedCells)[0] ?? null;
    if (anchor) {
      ctx.placeCaretInCell(anchor, "start");
      ctx.debugLog(`clipboard hotkey anchor restored cell=${ctx.describeCell(anchor)}`);
    }
  });

  ctx.editor.addEventListener("keydown", (event: KeyboardEvent) => ctx.handleKeydown(event));

  document.addEventListener("selectionchange", () => {
    // 툴바 복원 중/툴바 상호작용 중에는 selection 변경 감시를 잠시 무시한다.
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
    ctx.syncActiveImageWithCaret?.();
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

    if (!ctx.tablePropsDialog.hidden && !ctx.tablePropsDialog.contains(target) && !ctx.tableContextMenu.contains(target)) {
      ctx.cancelTablePropsDialog?.();
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
