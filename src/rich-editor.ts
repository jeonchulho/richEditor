import { cleanPasteHtml, cleanPasteText } from "./clean-paste";
import { bindRichEditorEvents } from "./rich-editor/components/event-bindings";
import {
  buildTableMatrix as buildTableMatrixHelper,
  collectCellsInRect as collectCellsInRectHelper,
  getAdjacentCell as getAdjacentCellHelper,
  getWrappedHorizontalCell as getWrappedHorizontalCellHelper,
  getWrappedVerticalCell as getWrappedVerticalCellHelper,
  normalizeRectForSpans as normalizeRectForSpansHelper,
} from "./rich-editor/components/table-helpers";
import {
  addCol as addColOp,
  addRow as addRowOp,
  deleteCol as deleteColOp,
  deleteRow as deleteRowOp,
  deleteTable as deleteTableOp,
  mergeCells as mergeCellsOp,
  unmergeCell as unmergeCellOp,
} from "./rich-editor/components/table-ops";
import { handleTableNavigationKeydown as handleTableNavigationKeydownHelper } from "./rich-editor/components/table-navigation";
import {
  clearSelectedCells as clearSelectedCellsHelper,
  handleTableSelectionKeydown as handleTableSelectionKeydownHelper,
  selectCellRectangle as selectCellRectangleHelper,
  toggleCellSelection as toggleCellSelectionHelper,
} from "./rich-editor/components/table-selection";
import {
  positionPopupAtPoint,
  positionPopupNearAnchor,
  renderColorSwatches,
  renderEmojiButtons,
  renderTableSizeGrid,
  updateTableSizeGridPreview,
} from "./rich-editor/components/popup-components";
import { DEFAULT_AUTOSAVE_DELAY, DEFAULT_STORAGE_KEY } from "./rich-editor/constants";
import { INITIAL_EDITOR_HTML, RICH_EDITOR_TEMPLATE } from "./rich-editor/template";
import type {
  CellAnchor,
  CommandState,
  EditorUiPrefs,
  FlashIntensity,
  FormattingRole,
  InlineCommand,
  LineHeightOption,
  ListCommand,
  RichEditorOptions,
  TableAction,
  TableMatrix,
  UnmergeContentMode,
} from "./rich-editor/types";

export class RichEditor {
  private readonly root: HTMLElement;
  private readonly options: Required<RichEditorOptions>;
  private toolbar!: HTMLDivElement;
  private editor!: HTMLDivElement;
  private colorPalette!: HTMLDivElement;
  private colorPaletteButton!: HTMLButtonElement;
  private textColorChip!: HTMLSpanElement;
  private bgColorChip!: HTMLSpanElement;
  private emojiPicker!: HTMLDivElement;
  private emojiButton!: HTMLButtonElement;
  private tableInsertButton!: HTMLButtonElement;
  private tableSizePicker!: HTMLDivElement;
  private tableSizeInfo!: HTMLDivElement;
  private tableContextMenu!: HTMLDivElement;
  private tableGridSelecting = false;
  private tableGridInsertedByDrag = false;
  private tableHoverRows = 0;
  private tableHoverCols = 0;
  private unmergeModeSelect!: HTMLSelectElement;
  private flashIntensitySelect!: HTMLSelectElement;
  private mergeButton!: HTMLButtonElement;
  private mergePreviewBadge!: HTMLSpanElement;
  private mergeRangeBadge!: HTMLSpanElement;
  private imageInput!: HTMLInputElement;
  private saveStatus!: HTMLSpanElement;
  private debugToggleButton!: HTMLButtonElement;
  private debugPanel!: HTMLDivElement;
  private debugPanelVisible = false;
  private savedRange: Range | null = null;
  private lastExpandedRange: Range | null = null;
  private toolbarInteractionRange: Range | null = null;
  private isRestoringSelection = false;
  private isToolbarInteracting = false;
  private debugSeq = 0;
  private readonly debouncedSave: () => void;
  private readonly selectedCells = new Set<HTMLTableCellElement>();
  private readonly previewCells = new Set<HTMLTableCellElement>();
  private isCellDragSelecting = false;
  private dragAnchorCell: HTMLTableCellElement | null = null;
  private keyboardAnchorCell: HTMLTableCellElement | null = null;
  private keyboardFocusCell: HTMLTableCellElement | null = null;
  private pendingExpandedMerge = false;
  private readonly uiPrefsKey: string;

  constructor(root: HTMLElement, options: RichEditorOptions = {}) {
    this.root = root;
    this.options = {
      storageKey: options.storageKey ?? DEFAULT_STORAGE_KEY,
      autosaveDelay: options.autosaveDelay ?? DEFAULT_AUTOSAVE_DELAY,
    };
    this.uiPrefsKey = `${this.options.storageKey}:ui-prefs`;

    this.debouncedSave = this.debounce(() => this.save(), this.options.autosaveDelay);
    this.render();
    this.restoreUiPrefs();
    this.bindEvents();
    this.restore();
    this.captureSelection();
    this.updateToolbarState();
  }

  private render(): void {
    this.root.innerHTML = RICH_EDITOR_TEMPLATE;

    this.toolbar = this.root.querySelector(".re-toolbar") as HTMLDivElement;
    this.editor = this.root.querySelector(".re-editor") as HTMLDivElement;
    this.colorPalette = this.root.querySelector('[data-role="colorPalette"]') as HTMLDivElement;
    this.colorPaletteButton = this.root.querySelector('[data-action="colorPalette"]') as HTMLButtonElement;
    this.textColorChip = this.root.querySelector('[data-role="textColorChip"]') as HTMLSpanElement;
    this.bgColorChip = this.root.querySelector('[data-role="bgColorChip"]') as HTMLSpanElement;
    this.emojiPicker = this.root.querySelector(".re-emoji-picker") as HTMLDivElement;
    this.emojiButton = this.root.querySelector('[data-action="emoji"]') as HTMLButtonElement;
    this.tableInsertButton = this.root.querySelector('[data-table="insert"]') as HTMLButtonElement;
    this.tableSizePicker = this.root.querySelector('.re-table-size-picker') as HTMLDivElement;
    this.tableSizeInfo = this.root.querySelector('[data-role="tableSizeInfo"]') as HTMLDivElement;
    this.tableContextMenu = this.root.querySelector('[data-role="tableContextMenu"]') as HTMLDivElement;
    this.unmergeModeSelect = this.root.querySelector('[data-role="unmergeMode"]') as HTMLSelectElement;
    this.flashIntensitySelect = this.root.querySelector('[data-role="flashIntensity"]') as HTMLSelectElement;
    this.mergeButton = this.root.querySelector('[data-table="mergeCells"]') as HTMLButtonElement;
    this.mergePreviewBadge = this.root.querySelector('[data-role="mergePreviewBadge"]') as HTMLSpanElement;
    this.mergeRangeBadge = this.root.querySelector('[data-role="mergeRangeBadge"]') as HTMLSpanElement;
    this.imageInput = this.root.querySelector('[data-role="imageInput"]') as HTMLInputElement;
    this.saveStatus = this.root.querySelector('[data-role="saveStatus"]') as HTMLSpanElement;
    this.debugToggleButton = this.root.querySelector('[data-action="toggleDebug"]') as HTMLButtonElement;
    this.debugPanel = this.root.querySelector('[data-role="debugPanel"]') as HTMLDivElement;
    this.setDebugPanelVisible(false);

    this.updateMergeActionUi(0, 0, 0);

    this.renderEmojiPicker();
    this.renderColorPalette();
    this.renderTableSizePicker();

    this.editor.innerHTML = INITIAL_EDITOR_HTML;
  }

  private bindEvents(): void {
    bindRichEditorEvents(this as unknown as Record<string, unknown>);
  }

  private showTableContextMenu(clientX: number, clientY: number): void {
    const shell = this.root.querySelector(".re-shell") as HTMLElement | null;
    if (!shell) {
      return;
    }

    this.tableContextMenu.hidden = false;
    this.tableContextMenu.style.visibility = "hidden";

    positionPopupAtPoint(shell, this.tableContextMenu, clientX, clientY);
    this.tableContextMenu.style.visibility = "";
  }

  private hideTableContextMenu(): void {
    this.tableContextMenu.hidden = true;
  }

  private exec(command: string, value?: string): void {
    this.focusEditor();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, value);
    this.captureSelection();
    this.debouncedSave();
    this.updateToolbarState();
  }

  private focusEditor(): void {
    if (document.activeElement !== this.editor) {
      this.editor.focus();
    }
  }

  private captureSelection(): void {
    if (this.isRestoringSelection) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!this.editor.contains(range.commonAncestorContainer)) {
      return;
    }

    this.savedRange = range.cloneRange();
    if (!range.collapsed) {
      this.lastExpandedRange = range.cloneRange();
    }
  }

  private restoreSelection(): void {
    let sourceRange = this.toolbarInteractionRange?.cloneRange() ?? this.savedRange?.cloneRange() ?? null;
    if (
      sourceRange
      && sourceRange.collapsed
      && this.lastExpandedRange
      && this.editor.contains(this.lastExpandedRange.commonAncestorContainer)
    ) {
      sourceRange = this.lastExpandedRange.cloneRange();
      this.debugLog(`restoreSelection fallback expanded: ${this.describeRange(sourceRange)}`);
    }
    if (!sourceRange) {
      this.debugLog("restoreSelection skipped: no sourceRange");
      return;
    }
    if (!this.editor.contains(sourceRange.commonAncestorContainer)) {
      this.debugLog("restoreSelection skipped: sourceRange outside editor");
      return;
    }

    this.isRestoringSelection = true;
    try {
      this.focusEditor();
      const selection = window.getSelection();
      if (!selection) {
        return;
      }

      selection.removeAllRanges();
      selection.addRange(sourceRange);
      this.savedRange = sourceRange.cloneRange();
      this.debugLog(`restoreSelection applied: ${this.describeRange(sourceRange)}`);
    } finally {
      this.isRestoringSelection = false;
    }
  }

  private getActiveEditorRange(): Range | null {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const current = selection.getRangeAt(0);
      if (this.editor.contains(current.commonAncestorContainer)) {
        return current;
      }
    }

    if (this.savedRange && this.editor.contains(this.savedRange.commonAncestorContainer)) {
      return this.savedRange.cloneRange();
    }

    return null;
  }

  private applyStyleToSelection(
    styleProp: "fontSize" | "fontFamily" | "color" | "backgroundColor",
    value: string,
  ): void {
    const selection = window.getSelection();
    const range = this.getActiveEditorRange();
    if (!selection || !range) {
      this.debugLog(`applyStyleToSelection skipped: missing selection/range prop=${styleProp} value=${value}`);
      return;
    }

    this.debugLog(`applyStyleToSelection start prop=${styleProp} value=${value} range=${this.describeRange(range)}`);

    selection.removeAllRanges();
    selection.addRange(range);

    if (range.collapsed) {
      const span = document.createElement("span");
      this.setStylePriority(span, styleProp, value);
      span.textContent = "\u200B";
      range.insertNode(span);
      range.setStart(span.firstChild as Text, 1);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      this.captureSelection();
      this.debouncedSave();
      this.updateToolbarState();
      this.debugLog(`applyStyleToSelection collapsed applied prop=${styleProp}`);
      return;
    }

    const fragment = range.extractContents();
    const span = document.createElement("span");
    this.setStylePriority(span, styleProp, value);
    span.appendChild(fragment);
    range.insertNode(span);
    range.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(range);

    this.captureSelection();
    this.debouncedSave();
    this.updateToolbarState();
    const computed = window.getComputedStyle(span);
    const appliedValue = styleProp === "fontSize"
      ? computed.fontSize
      : styleProp === "fontFamily"
        ? computed.fontFamily
        : styleProp === "backgroundColor"
          ? computed.backgroundColor
          : computed.color;
    this.debugLog(`applyStyleToSelection applied prop=${styleProp} resolved=${appliedValue} text='${(span.textContent ?? "").slice(0, 40)}'`);
  }

  private applyLineHeightToSelection(value: LineHeightOption): void {
    const range = this.getActiveEditorRange();
    if (!range) {
      return;
    }

    const blocks = range.collapsed ? [this.getSelectionBlock()] : this.getSelectedBlocks(range);
    const targets = blocks.filter((block): block is HTMLElement => Boolean(block));

    if (targets.length === 0) {
      return;
    }

    for (const block of targets) {
      block.style.lineHeight = value;
    }

    this.captureSelection();
    this.debouncedSave();
  }

  private getSelectionBlock(): HTMLElement | null {
    const element = this.getSelectionElement();
    if (!element) {
      return null;
    }
    return (element.closest("li,p,div,h1,h2,h3,h4,h5,h6,blockquote,td,th") ?? element) as HTMLElement;
  }

  private applyFormattingRoleChange(
    role: FormattingRole,
    selectedValue: string,
    source: "change" | "input" | "palette",
  ): void {
    const isColorRole = role === "foreColor" || role === "hiliteColor";

    try {
      this.restoreSelection();
      let activeRange = this.getActiveEditorRange();

      if (
        isColorRole
        && activeRange?.collapsed
        && this.lastExpandedRange
        && this.editor.contains(this.lastExpandedRange.commonAncestorContainer)
      ) {
        this.toolbarInteractionRange = this.lastExpandedRange.cloneRange();
        this.restoreSelection();
        activeRange = this.getActiveEditorRange();
      }

      this.debugLog(`toolbar ${source} role=${role} value=${selectedValue} restored=${this.describeRange(activeRange ?? null)}`);

      const allowCollapsedColor = source === "palette";
      if (isColorRole && (!activeRange || (activeRange.collapsed && !allowCollapsedColor))) {
        this.debugLog(`toolbar ${source} skip color apply: collapsed range`);
        return;
      }

      if (role === "fontName") {
        if (!this.applyStyleToTableSelection("fontFamily", selectedValue)) {
          this.applyStyleToSelection("fontFamily", selectedValue);
        }
      } else if (role === "fontSize") {
        if (!this.applyStyleToTableSelection("fontSize", selectedValue)) {
          this.applyStyleToSelection("fontSize", selectedValue);
        }
      } else if (role === "foreColor") {
        if (!this.applyStyleToTableSelection("color", selectedValue)) {
          this.applyStyleToSelection("color", selectedValue);
        }
      } else if (!this.applyStyleToTableSelection("backgroundColor", selectedValue)) {
        this.applyStyleToSelection("backgroundColor", selectedValue);
      }

      this.updateToolbarState();
    } finally {
      if (source === "change" && !isColorRole) {
        this.endToolbarInteraction();
      }
    }
  }

  private endToolbarInteraction(): void {
    this.isToolbarInteracting = false;
    this.toolbarInteractionRange = null;
    this.colorPaletteButton.classList.remove("re-active");
  }

  private applyStyleToTableSelection(
    styleProp: "fontSize" | "fontFamily" | "color" | "backgroundColor",
    value: string,
  ): boolean {
    if (this.selectedCells.size < 2) {
      this.debugLog(`table style skip: selectedCells=${this.selectedCells.size}`);
      return false;
    }

    const activeCell = this.getSelectedCell();
    if (!activeCell || !this.selectedCells.has(activeCell)) {
      this.debugLog("table style skip: activeCell not in selectedCells");
      return false;
    }

    const activeRange = this.getActiveEditorRange();
    if (!activeRange || !activeCell.contains(activeRange.commonAncestorContainer)) {
      this.debugLog("table style skip: activeRange outside activeCell");
      return false;
    }

    const targets = Array.from(this.selectedCells);
    if (targets.length < 2) {
      return false;
    }

    for (const cell of targets) {
      this.setStylePriority(cell, styleProp, value);
      if (styleProp === "fontSize") {
        const fontSize = Number.parseFloat(value);
        const safeFontSize = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 16;
        const verticalPadding = Math.max(4, Math.round(safeFontSize * 0.2));
        const rowHeight = Math.max(28, Math.round(safeFontSize * 1.35 + verticalPadding * 2));
        cell.style.padding = `${verticalPadding}px 8px`;
        cell.style.height = `${rowHeight}px`;
        cell.style.lineHeight = "1.35";
        cell.style.verticalAlign = "top";
      }
    }

    const table = targets[0].closest("table") as HTMLTableElement | null;
    if (table) {
      this.updateTableResizeHandleLayout(table);
    }

    this.debouncedSave();
    this.debugLog(`table style applied prop=${styleProp} value=${value} cells=${targets.length}`);
    return true;
  }

  private setStylePriority(
    element: HTMLElement,
    styleProp: "fontSize" | "fontFamily" | "color" | "backgroundColor",
    value: string,
  ): void {
    const cssProp = styleProp === "fontSize"
      ? "font-size"
      : styleProp === "fontFamily"
        ? "font-family"
        : styleProp === "backgroundColor"
          ? "background-color"
          : "color";
    element.style.setProperty(cssProp, value, "important");
  }

  private describeRange(range: Range | null): string {
    if (!range) {
      return "null";
    }
    const text = range.toString().replace(/\s+/g, " ").trim();
    const normalized = text.length > 30 ? `${text.slice(0, 30)}...` : text;
    return `collapsed=${range.collapsed}, len=${range.toString().length}, text='${normalized}'`;
  }

  private debugLog(message: string): void {
    this.debugSeq += 1;
    const ts = new Date().toISOString().slice(11, 23);
    const line = `${this.debugSeq.toString().padStart(4, "0")} ${ts} ${message}`;
    const current = this.debugPanel.textContent ?? "";
    const next = current ? `${line}\n${current}` : line;
    this.debugPanel.textContent = next.split("\n").slice(0, 18).join("\n");
  }

  private handleTableAction(action: TableAction): void {
    if (action === "insert") {
      this.toggleTableSizePicker();
      return;
    }

    if (action === "addRow") {
      this.addRow();
      return;
    }

    if (action === "addCol") {
      this.addCol();
      return;
    }

    if (action === "deleteRow") {
      this.deleteRow();
      return;
    }

    if (action === "deleteCol") {
      this.deleteCol();
      return;
    }

    if (action === "mergeCells") {
      this.mergeCells();
      return;
    }

    if (action === "unmergeCell") {
      this.unmergeCell();
      return;
    }

    if (action === "deleteTable") {
      this.deleteTable();
    }
  }

  private insertTable(rows: number, cols: number): void {
    const table = document.createElement("table");
    table.className = "re-table";

    for (let r = 0; r < rows; r += 1) {
      const tr = document.createElement("tr");
      for (let c = 0; c < cols; c += 1) {
        const cell = document.createElement("td");
        cell.contentEditable = "true";
        cell.style.minWidth = "80px";
        this.applyBodyCellTypography(cell as HTMLTableCellElement);
        if (r === 0) {
          cell.classList.add("re-table-header-cell");
          cell.textContent = `Header ${c + 1}`;
        } else {
          cell.innerHTML = "<br>";
        }
        tr.appendChild(cell);
      }
      table.appendChild(tr);
    }

    this.insertNodeAtCaret(table);
    this.insertNodeAtCaret(document.createElement("p"));
    this.enableTableColumnResize(table);
    this.debouncedSave();
  }

  private getSelectedCell(): HTMLTableCellElement | null {
    const range = this.getActiveEditorRange();
    if (!range) {
      return null;
    }
    const node = range.startContainer;
    const element = node instanceof HTMLElement ? node : node.parentElement;
    if (!element) {
      return null;
    }
    return element.closest("td, th") as HTMLTableCellElement | null;
  }

  private addRow(): void {
    addRowOp(this as unknown as Record<string, unknown>);
  }

  private addCol(): void {
    addColOp(this as unknown as Record<string, unknown>);
  }

  private deleteRow(): void {
    deleteRowOp(this as unknown as Record<string, unknown>);
  }

  private deleteCol(): void {
    deleteColOp(this as unknown as Record<string, unknown>);
  }

  private deleteTable(): void {
    deleteTableOp(this as unknown as Record<string, unknown>);
  }

  private mergeRightCell(): void {
    const cell = this.getSelectedCell();
    if (!cell) {
      return;
    }

    const right = cell.nextElementSibling as HTMLTableCellElement | null;
    if (!right) {
      return;
    }

    const currentColspan = Number.parseInt(cell.getAttribute("colspan") ?? "1", 10);
    const rightColspan = Number.parseInt(right.getAttribute("colspan") ?? "1", 10);
    cell.colSpan = currentColspan + rightColspan;
    cell.innerHTML = `${cell.innerHTML} ${right.innerHTML}`.trim();
    right.remove();

    const table = cell.closest("table");
    if (table) {
      this.enableTableColumnResize(table as HTMLTableElement);
    }
    this.debouncedSave();
  }

  private mergeCells(): void {
    mergeCellsOp(this as unknown as Record<string, unknown>);
  }

  private toggleCellSelection(cell: HTMLTableCellElement): void {
    toggleCellSelectionHelper(this as unknown as Record<string, unknown>, cell);
  }

  private selectCellRectangle(startCell: HTMLTableCellElement, endCell: HTMLTableCellElement): void {
    selectCellRectangleHelper(this as unknown as Record<string, unknown>, startCell, endCell);
  }

  private clearSelectedCells(): void {
    clearSelectedCellsHelper(this as unknown as Record<string, unknown>);
  }

  private isEmptyEditorClickTarget(target: HTMLElement): boolean {
    if (!this.editor.contains(target) || target.closest("td,th")) {
      return false;
    }

    if (target === this.editor) {
      return true;
    }

    const block = target.closest("p,div") as HTMLElement | null;
    if (!block || !this.editor.contains(block)) {
      return false;
    }

    const text = (block.textContent ?? "").replace(/\u200B/g, "").trim();
    const hasEmbedded = Boolean(block.querySelector("img,table"));
    return text.length === 0 && !hasEmbedded;
  }

  private resetTypingColorToDefault(): void {
    const activeRange = this.getActiveEditorRange();
    if (!activeRange || !activeRange.collapsed) {
      return;
    }

    // Sync collapsed typing style to current toolbar settings on empty-area click.
    const fontNameSelect = this.toolbar.querySelector('[data-role="fontName"]') as HTMLSelectElement | null;
    const fontSizeSelect = this.toolbar.querySelector('[data-role="fontSize"]') as HTMLSelectElement | null;

    const textColor = this.textColorChip.style.background || "#0f172a";
    const bgStyle = this.bgColorChip.style.background || "";
    const hasNoFillPattern = bgStyle.includes("linear-gradient");
    const bgColor = hasNoFillPattern ? "transparent" : (this.normalizeColorToHex(bgStyle) ?? "transparent");

    if (fontNameSelect?.value) {
      this.exec("fontName", fontNameSelect.value);
    }
    if (fontSizeSelect?.value) {
      this.applyStyleToSelection("fontSize", fontSizeSelect.value);
    }

    this.exec("foreColor", textColor);
    this.exec("hiliteColor", bgColor);
  }

  private syncSelectedCellsWithCaret(): void {
    if (this.selectedCells.size === 0) {
      return;
    }

    const activeCell = this.getSelectedCell();
    if (activeCell && this.selectedCells.has(activeCell)) {
      return;
    }

    this.clearSelectedCells();
    this.keyboardAnchorCell = activeCell;
    this.keyboardFocusCell = activeCell;
  }

  private mergeSelectedCellBlock(): void {
    const selected = Array.from(this.selectedCells);
    if (selected.length < 2) {
      return;
    }

    const table = selected[0].closest("table") as HTMLTableElement | null;
    if (!table) {
      this.clearSelectedCells();
      return;
    }

    const tableData = this.buildTableMatrix(table);
    const anchors = selected.map((cell) => tableData.anchors.get(cell)).filter((item): item is CellAnchor => Boolean(item));
    if (anchors.length !== selected.length) {
      this.clearSelectedCells();
      return;
    }

    const minRow = Math.min(...anchors.map((item) => item.row));
    const maxRow = Math.max(...anchors.map((item) => item.row));
    const minCol = Math.min(...anchors.map((item) => item.col));
    const maxCol = Math.max(...anchors.map((item) => item.col));

    const normalized = this.normalizeRectForSpans(tableData, minRow, maxRow, minCol, maxCol);

    const normalizedCells = this.collectCellsInRect(tableData, normalized.minRow, normalized.maxRow, normalized.minCol, normalized.maxCol);
    const uncovered = normalizedCells.filter((cell) => !this.selectedCells.has(cell));

    if (uncovered.length > 0 && !this.pendingExpandedMerge) {
      this.setPendingExpandedMerge(true);
      this.updateMergePreview();
      this.showSaveStatus("Preview ready. Press Merge again to include expanded area.");
      return;
    }

    if (uncovered.length > 0 && this.pendingExpandedMerge) {
      for (const cell of normalizedCells) {
        this.selectedCells.add(cell);
        cell.classList.add("re-cell-selected");
      }
      this.showSaveStatus("Merged with expanded area");
    }

    const blockCells: HTMLTableCellElement[] = [];

    for (let r = normalized.minRow; r <= normalized.maxRow; r += 1) {
      for (let c = normalized.minCol; c <= normalized.maxCol; c += 1) {
        const cell = tableData.matrix[r]?.[c] ?? null;
        if (!cell) {
          this.clearSelectedCells();
          this.showSaveStatus("Cannot merge: invalid table selection");
          return;
        }
        if (!blockCells.includes(cell)) {
          blockCells.push(cell);
        }
      }
    }

    const master = tableData.matrix[normalized.minRow]?.[normalized.minCol] ?? null;
    if (!master) {
      this.clearSelectedCells();
      this.showSaveStatus("Cannot merge: missing anchor cell");
      return;
    }
    const mergedTexts = blockCells
      .map((cell) => cell.textContent?.trim() ?? "")
      .filter((text) => text.length > 0)
      .join("\n");

    master.rowSpan = normalized.maxRow - normalized.minRow + 1;
    master.colSpan = normalized.maxCol - normalized.minCol + 1;
    if (mergedTexts) {
      master.textContent = mergedTexts;
    }

    const removable = blockCells.filter((cell) => cell !== master);
    for (const cell of removable) {
      cell.remove();
    }

    this.clearSelectedCells();
    this.enableTableColumnResize(table);
    this.debouncedSave();
  }

  private unmergeCell(): void {
    unmergeCellOp(this as unknown as Record<string, unknown>);
  }

  private getUnmergeContentMode(): UnmergeContentMode {
    const value = this.unmergeModeSelect.value as UnmergeContentMode;
    if (value === "duplicateAll" || value === "clearAll" || value === "keepFirst" || value === "splitLines") {
      return value;
    }
    return "keepFirst";
  }

  private applyBodyCellTypography(cell: HTMLTableCellElement): void {
    const selected = this.getSelectionElement() ?? this.editor;
    const style = window.getComputedStyle(selected);
    const fontSizeSelect = this.toolbar.querySelector('[data-role="fontSize"]') as HTMLSelectElement | null;
    const fontNameSelect = this.toolbar.querySelector('[data-role="fontName"]') as HTMLSelectElement | null;

    const toolbarFontSize = Number.parseFloat(fontSizeSelect?.value ?? "");
    const computedFontSize = Number.parseFloat(style.fontSize);
    const safeFontSize = Number.isFinite(toolbarFontSize) && toolbarFontSize > 0
      ? toolbarFontSize
      : (Number.isFinite(computedFontSize) && computedFontSize > 0 ? computedFontSize : 16);

    const safeFontFamily = (fontNameSelect?.value ?? "").trim() || style.fontFamily;

    const verticalPadding = Math.max(4, Math.round(safeFontSize * 0.2));
    const rowHeight = Math.max(28, Math.round(safeFontSize * 1.35 + verticalPadding * 2));

    cell.style.fontSize = `${Math.round(safeFontSize)}px`;
    cell.style.fontFamily = safeFontFamily;
    cell.style.padding = `${verticalPadding}px 8px`;
    cell.style.height = `${rowHeight}px`;
    cell.style.lineHeight = "1.35";
    cell.style.verticalAlign = "top";
  }

  private distributeLinesAcrossCells(text: string, cells: HTMLTableCellElement[]): void {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      for (const cell of cells) {
        cell.textContent = "";
      }
      return;
    }

    for (let i = 0; i < cells.length; i += 1) {
      cells[i].textContent = lines[i] ?? "";
    }
  }

  private handleTableSelectionKeydown(event: KeyboardEvent): boolean {
    return handleTableSelectionKeydownHelper(this as unknown as Record<string, unknown>, event);
  }

  private getAdjacentCell(cell: HTMLTableCellElement, arrowKey: string): HTMLTableCellElement | null {
    const table = cell.closest("table") as HTMLTableElement | null;
    if (!table) {
      return null;
    }

    return getAdjacentCellHelper(table, cell, arrowKey);
  }

  private getWrappedHorizontalCell(cell: HTMLTableCellElement, arrowKey: "ArrowLeft" | "ArrowRight"): HTMLTableCellElement | null {
    const table = cell.closest("table") as HTMLTableElement | null;
    if (!table) {
      return null;
    }

    return getWrappedHorizontalCellHelper(table, cell, arrowKey);
  }

  private getWrappedVerticalCell(cell: HTMLTableCellElement, arrowKey: "ArrowUp" | "ArrowDown"): HTMLTableCellElement | null {
    const table = cell.closest("table") as HTMLTableElement | null;
    if (!table) {
      return null;
    }

    return getWrappedVerticalCellHelper(table, cell, arrowKey);
  }

  private placeCaretInCell(cell: HTMLTableCellElement, edge: "start" | "end" = "start"): void {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const effectiveEdge = edge === "end" && !this.cellHasMeaningfulEditableText(cell) ? "start" : edge;
    const contentRange = this.getCellEditableContentRange(cell);
    const range = document.createRange();
    if (effectiveEdge === "start") {
      range.setStart(contentRange.startContainer, contentRange.startOffset);
    } else {
      range.setStart(contentRange.endContainer, contentRange.endOffset);
    }
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    this.debugLog(`table caret placed cell=${this.describeCell(cell)} requested=${edge} effective=${effectiveEdge} range=${this.describeRange(range)}`);
    this.captureSelection();
  }

  private describeCell(cell: HTMLTableCellElement): string {
    const row = cell.parentElement as HTMLTableRowElement | null;
    const table = cell.closest("table") as HTMLTableElement | null;
    if (!row || !table) {
      return "unknown";
    }

    const colIndex = Array.from(row.cells).indexOf(cell);
    const text = (cell.textContent ?? "").replace(/[\s\u200B\u200C\u200D\uFEFF]/g, "").slice(0, 20);
    return `r${row.rowIndex}c${colIndex} text='${text}'`;
  }

  private cellHasMeaningfulEditableText(cell: HTMLTableCellElement): boolean {
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (
          parent
          && (
            parent.contentEditable === "false"
            || parent.classList.contains("re-col-handle")
            || parent.classList.contains("re-row-handle")
          )
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        return this.isMeaningfulEditableText(node.textContent ?? "")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });

    return Boolean(walker.nextNode());
  }

  private isMeaningfulEditableText(value: string): boolean {
    // Ignore whitespace and zero-width formatting markers when deciding caret edges.
    return value.replace(/[\s\u200B\u200C\u200D\uFEFF]/g, "").length > 0;
  }

  private findAdjacentCellByOrder(cell: HTMLTableCellElement, direction: -1 | 1): HTMLTableCellElement | null {
    const table = cell.closest("table") as HTMLTableElement | null;
    if (!table) {
      return null;
    }

    const cells = Array.from(table.querySelectorAll("td,th")).filter((item): item is HTMLTableCellElement => item instanceof HTMLTableCellElement);
    const index = cells.indexOf(cell);
    if (index < 0) {
      return null;
    }

    return cells[index + direction] ?? null;
  }

  private isCaretAtCellBoundary(cell: HTMLTableCellElement, boundary: "start" | "end"): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return true;
    }

    if (!this.cellHasMeaningfulEditableText(cell)) {
      return true;
    }

    const range = selection.getRangeAt(0);
    if (!cell.contains(range.startContainer)) {
      return false;
    }

    const contentRange = this.getCellEditableContentRange(cell);
    const caret = range.cloneRange();
    caret.collapse(true);

    // Robust boundary check: compare remaining meaningful text before/after caret
    // so DOM container differences at the same visual position do not break detection.
    if (boundary === "start") {
      const before = contentRange.cloneRange();
      try {
        before.setEnd(caret.startContainer, caret.startOffset);
      } catch {
        return false;
      }
      return !this.isMeaningfulEditableText(before.toString());
    }

    const after = contentRange.cloneRange();
    try {
      after.setStart(caret.startContainer, caret.startOffset);
    } catch {
      return false;
    }
    return !this.isMeaningfulEditableText(after.toString());
  }

  private getCellEditableContentRange(cell: HTMLTableCellElement): Range {
    const range = document.createRange();
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (
          node instanceof HTMLElement
          && (
            node.contentEditable === "false"
            || node.classList.contains("re-col-handle")
            || node.classList.contains("re-row-handle")
          )
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const candidates: Node[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node === cell) {
        continue;
      }
      if (node.nodeType === Node.TEXT_NODE && this.isMeaningfulEditableText(node.textContent ?? "")) {
        candidates.push(node);
        continue;
      }
      if (node instanceof HTMLBRElement) {
        candidates.push(node);
      }
    }

    if (candidates.length === 0) {
      const fallbackBr = this.ensureCellEditableBreak(cell);
      range.setStartBefore(fallbackBr);
      range.setEndAfter(fallbackBr);
      return range;
    }

    const first = candidates[0];
    const last = candidates[candidates.length - 1];

    if (first.nodeType === Node.TEXT_NODE) {
      range.setStart(first, 0);
    } else {
      range.setStartBefore(first);
    }

    if (last.nodeType === Node.TEXT_NODE) {
      range.setEnd(last, (last.textContent ?? "").length);
    } else {
      range.setEndAfter(last);
    }

    return range;
  }

  private ensureCellEditableBreak(cell: HTMLTableCellElement): HTMLBRElement {
    const existing = Array.from(cell.querySelectorAll("br")).find((br) => {
      const parent = br.parentElement;
      return !parent || (!parent.classList.contains("re-col-handle") && !parent.classList.contains("re-row-handle"));
    }) as HTMLBRElement | undefined;
    if (existing) {
      return existing;
    }

    const br = document.createElement("br");
    const firstHandle = cell.querySelector(".re-col-handle, .re-row-handle");
    if (firstHandle) {
      cell.insertBefore(br, firstHandle);
    } else {
      cell.appendChild(br);
    }
    return br;
  }

  private appendRowAtTableEnd(referenceCell: HTMLTableCellElement): HTMLTableCellElement | null {
    const table = referenceCell.closest("table") as HTMLTableElement | null;
    if (!table) {
      return null;
    }

    const row = document.createElement("tr");
    const columnCount = Math.max(1, table.rows[0]?.cells.length ?? 1);
    for (let i = 0; i < columnCount; i += 1) {
      const cell = document.createElement("td");
      cell.contentEditable = "true";
      cell.style.minWidth = "80px";
      this.applyBodyCellTypography(cell);
      row.appendChild(cell);
    }

    table.appendChild(row);
    this.enableTableColumnResize(table);
    this.debouncedSave();
    return row.cells[0] as HTMLTableCellElement | null;
  }

  private buildTableMatrix(table: HTMLTableElement): TableMatrix {
    return buildTableMatrixHelper(table);
  }

  private normalizeRectForSpans(
    tableData: TableMatrix,
    startMinRow: number,
    startMaxRow: number,
    startMinCol: number,
    startMaxCol: number,
  ): { minRow: number; maxRow: number; minCol: number; maxCol: number } {
    return normalizeRectForSpansHelper(tableData, startMinRow, startMaxRow, startMinCol, startMaxCol);
  }

  private collectCellsInRect(
    tableData: TableMatrix,
    minRow: number,
    maxRow: number,
    minCol: number,
    maxCol: number,
  ): HTMLTableCellElement[] {
    return collectCellsInRectHelper(tableData, minRow, maxRow, minCol, maxCol);
  }

  private clearMergePreview(): void {
    for (const cell of this.previewCells) {
      cell.classList.remove("re-cell-preview");
    }
    this.previewCells.clear();
  }

  private updateMergePreview(): void {
    this.clearMergePreview();
    if (this.selectedCells.size < 2) {
      if (!this.pendingExpandedMerge) {
        this.updateMergeActionUi(0, 0, 0);
      }
      return;
    }

    const selected = Array.from(this.selectedCells);
    const table = selected[0].closest("table") as HTMLTableElement | null;
    if (!table) {
      return;
    }

    const tableData = this.buildTableMatrix(table);
    const anchors = selected
      .map((cell) => tableData.anchors.get(cell))
      .filter((item): item is CellAnchor => Boolean(item));

    if (anchors.length !== selected.length) {
      return;
    }

    const minRow = Math.min(...anchors.map((item) => item.row));
    const maxRow = Math.max(...anchors.map((item) => item.row));
    const minCol = Math.min(...anchors.map((item) => item.col));
    const maxCol = Math.max(...anchors.map((item) => item.col));
    const normalized = this.normalizeRectForSpans(tableData, minRow, maxRow, minCol, maxCol);
    const cells = this.collectCellsInRect(tableData, normalized.minRow, normalized.maxRow, normalized.minCol, normalized.maxCol);

    for (const cell of cells) {
      if (this.selectedCells.has(cell)) {
        continue;
      }
      this.previewCells.add(cell);
      cell.classList.add("re-cell-preview");
    }

    const rows = normalized.maxRow - normalized.minRow + 1;
    const cols = normalized.maxCol - normalized.minCol + 1;
    this.updateMergeActionUi(this.previewCells.size, rows, cols);
  }

  private setPendingExpandedMerge(next: boolean): void {
    this.pendingExpandedMerge = next;
    if (!next) {
      this.updateMergeActionUi(0, 0, 0);
      return;
    }
    this.updateMergePreview();
  }

  private updateMergeActionUi(previewCount: number, rows: number, cols: number): void {
    if (this.pendingExpandedMerge) {
      this.mergeButton.textContent = "Confirm ✓";
      this.mergeButton.title = "Confirm Expanded Merge (Enter)";
      this.mergeButton.classList.add("re-active");
      this.mergeButton.classList.add("re-confirm");
      this.mergePreviewBadge.hidden = false;
      this.mergePreviewBadge.textContent = `+${previewCount} preview`;
      this.mergeRangeBadge.hidden = false;
      this.mergeRangeBadge.textContent = `${rows}x${cols}`;
      this.mergeRangeBadge.title = `Merge range: ${rows} rows x ${cols} cols`;
      return;
    }

    this.mergeButton.textContent = "Merge";
    this.mergeButton.title = "Merge Selected Cells (Shift+Click)";
    this.mergeButton.classList.remove("re-active");
    this.mergeButton.classList.remove("re-confirm");
    this.mergePreviewBadge.hidden = true;
    this.mergePreviewBadge.textContent = "Preview";
    this.mergeRangeBadge.hidden = true;
    this.mergeRangeBadge.textContent = "0x0";
    this.mergeRangeBadge.title = "Merge range";
  }

  private flashPendingMergeArea(): void {
    const cells = new Set<HTMLTableCellElement>();
    for (const cell of this.selectedCells) {
      cells.add(cell);
    }
    for (const cell of this.previewCells) {
      cells.add(cell);
    }

    for (const cell of cells) {
      cell.classList.remove("re-cell-flash");
      cell.classList.remove("re-cell-flash-soft");
      cell.classList.remove("re-cell-flash-strong");
      void cell.offsetWidth;
      cell.classList.add("re-cell-flash");
      const mode = this.getFlashIntensity();
      if (mode === "soft") {
        cell.classList.add("re-cell-flash-soft");
      }
      if (mode === "strong") {
        cell.classList.add("re-cell-flash-strong");
      }

      const duration = mode === "soft" ? 360 : mode === "strong" ? 680 : 520;
      window.setTimeout(() => {
        cell.classList.remove("re-cell-flash");
        cell.classList.remove("re-cell-flash-soft");
        cell.classList.remove("re-cell-flash-strong");
      }, duration);
    }
  }

  private getFlashIntensity(): FlashIntensity {
    const value = this.flashIntensitySelect.value as FlashIntensity;
    if (value === "soft" || value === "normal" || value === "strong") {
      return value;
    }
    return "normal";
  }

  private saveUiPrefs(): void {
    const prefs: EditorUiPrefs = {
      flashIntensity: this.getFlashIntensity(),
      unmergeMode: this.getUnmergeContentMode(),
      debugPanelVisible: this.debugPanelVisible,
    };
    localStorage.setItem(this.uiPrefsKey, JSON.stringify(prefs));
  }

  private restoreUiPrefs(): void {
    const raw = localStorage.getItem(this.uiPrefsKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<EditorUiPrefs>;
      if (parsed.flashIntensity === "soft" || parsed.flashIntensity === "normal" || parsed.flashIntensity === "strong") {
        this.flashIntensitySelect.value = parsed.flashIntensity;
      }

      if (
        parsed.unmergeMode === "keepFirst"
        || parsed.unmergeMode === "duplicateAll"
        || parsed.unmergeMode === "clearAll"
        || parsed.unmergeMode === "splitLines"
      ) {
        this.unmergeModeSelect.value = parsed.unmergeMode;
      }

      this.setDebugPanelVisible(parsed.debugPanelVisible === true);
    } catch {
      // Ignore malformed localStorage data and keep defaults.
    }
  }

  private setDebugPanelVisible(next: boolean): void {
    this.debugPanelVisible = next;
    this.debugPanel.classList.toggle("is-visible", next);
    this.debugToggleButton.textContent = next ? "Debug On" : "Debug Off";
    this.debugToggleButton.setAttribute("aria-pressed", next ? "true" : "false");

    if (next) {
      if (!(this.debugPanel.textContent ?? "").trim()) {
        this.debugLog("debug panel enabled");
      }
      requestAnimationFrame(() => {
        this.debugPanel.scrollIntoView({ block: "nearest" });
      });
    }
  }

  private enableTableColumnResize(table: HTMLTableElement): void {
    if (table.rows.length === 0) {
      return;
    }

    for (const oldHandle of Array.from(table.querySelectorAll(".re-col-handle, .re-row-handle"))) {
      oldHandle.remove();
    }

    Array.from(table.rows).forEach((row) => {
      Array.from(row.cells).forEach((cell, colIndex) => {
        const el = cell as HTMLElement;
        el.style.position = "relative";

        const colHandle = document.createElement("span");
        colHandle.className = "re-col-handle";
        colHandle.contentEditable = "false";

        colHandle.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();

          const startX = event.clientX;
          const widths = Array.from(table.rows).map((r) => {
            const targetCell = r.cells[colIndex] as HTMLElement | undefined;
            return targetCell?.getBoundingClientRect().width ?? 0;
          });

          const onMove = (moveEvent: MouseEvent): void => {
            const delta = moveEvent.clientX - startX;
            Array.from(table.rows).forEach((r, rowIndex) => {
              const targetCell = r.cells[colIndex] as HTMLElement | undefined;
              if (!targetCell) {
                return;
              }
              const nextWidth = Math.max(40, widths[rowIndex] + delta);
              targetCell.style.width = `${nextWidth}px`;
            });
          };

          const onUp = (): void => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            this.updateTableResizeHandleLayout(table);
            this.debouncedSave();
          };

          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        });

        el.appendChild(colHandle);

        const rowHandle = document.createElement("span");
        rowHandle.className = "re-row-handle";
        rowHandle.contentEditable = "false";

        rowHandle.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();

          const startY = event.clientY;
          const cells = Array.from(row.cells) as HTMLElement[];
          const heights = cells.map((currentCell) => currentCell.getBoundingClientRect().height);

          const onMove = (moveEvent: MouseEvent): void => {
            const delta = moveEvent.clientY - startY;
            cells.forEach((currentCell, index) => {
              const nextHeight = Math.max(24, heights[index] + delta);
              currentCell.style.height = `${Math.round(nextHeight)}px`;
            });
          };

          const onUp = (): void => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            this.debouncedSave();
          };

          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        });

        el.appendChild(rowHandle);
      });
    });

    this.updateTableResizeHandleLayout(table);
  }

  private updateTableResizeHandleLayout(table: HTMLTableElement): void {
    if (table.rows.length === 0) {
      return;
    }

    const colThickness = 8;
    const rowThickness = 8;
    const halfCol = colThickness / 2;
    const halfRow = rowThickness / 2;

    Array.from(table.rows).forEach((row) => {
      Array.from(row.cells).forEach((cell) => {
        const el = cell as HTMLElement;

        const colHandle = el.querySelector(".re-col-handle") as HTMLElement | null;
        if (colHandle) {
          const rect = el.getBoundingClientRect();
          colHandle.style.width = `${colThickness}px`;
          colHandle.style.height = `${rect.height}px`;
          colHandle.style.right = `${-halfCol}px`;
          colHandle.style.top = "0";
        }

        const rowHandle = el.querySelector(".re-row-handle") as HTMLElement | null;
        if (rowHandle) {
          const rect = el.getBoundingClientRect();
          rowHandle.style.width = `${rect.width}px`;
          rowHandle.style.height = `${rowThickness}px`;
          rowHandle.style.left = "0";
          rowHandle.style.bottom = `${-halfRow}px`;
        }
      });
    });
  }

  private async insertImageFromFile(file: File): Promise<void> {
    const dataUrl = await this.fileToDataUrl(file);
    const wrapper = document.createElement("span");
    wrapper.className = "re-image-wrap";
    wrapper.contentEditable = "false";

    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = file.name;
    img.style.width = "260px";
    img.style.height = "auto";
    wrapper.appendChild(img);

    this.attachImageResizer(wrapper, img);
    this.insertNodeAtCaret(wrapper);
    this.insertNodeAtCaret(document.createElement("p"));
    this.debouncedSave();
  }

  private attachImageResizer(wrapper: HTMLElement, img: HTMLImageElement): void {
    const points: Array<"nw" | "ne" | "sw" | "se"> = ["nw", "ne", "sw", "se"];

    for (const key of points) {
      const handle = document.createElement("span");
      handle.className = `re-image-handle re-image-handle-${key}`;
      handle.contentEditable = "false";

      handle.addEventListener("mousedown", (event) => {
        event.preventDefault();
        const rect = img.getBoundingClientRect();
        const ratio = rect.width / rect.height;
        const startX = event.clientX;
        const startWidth = rect.width;

        const onMove = (moveEvent: MouseEvent): void => {
          const delta = moveEvent.clientX - startX;
          const direction = key.includes("w") ? -1 : 1;
          const nextWidth = Math.max(80, startWidth + delta * direction);
          img.style.width = `${nextWidth}px`;
          img.style.height = `${Math.round(nextWidth / ratio)}px`;
        };

        const onUp = (): void => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          this.debouncedSave();
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      });

      wrapper.appendChild(handle);
    }
  }

  private insertNodeAtCaret(node: Node): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.editor.appendChild(node);
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    this.captureSelection();
  }

  private renderEmojiPicker(): void {
    renderEmojiButtons(this.emojiPicker, (emoji) => {
      this.restoreSelection();
      this.insertTextAtCaret(emoji);
      this.emojiPicker.hidden = true;
      this.captureSelection();
    });
  }

  private renderColorPalette(): void {
    renderColorSwatches(this.root);
  }

  private toggleColorPalette(): void {
    if (this.colorPalette.hidden) {
      this.updateToolbarState();
      this.colorPalette.hidden = false;
      this.colorPalette.style.visibility = "hidden";
      this.positionColorPalette();
      this.colorPalette.style.visibility = "";
      this.colorPaletteButton.classList.add("re-active");
      return;
    }

    this.colorPalette.hidden = true;
    this.colorPaletteButton.classList.remove("re-active");
    this.endToolbarInteraction();
  }

  private positionColorPalette(): void {
    const shell = this.root.querySelector(".re-shell") as HTMLElement | null;
    if (!shell) {
      return;
    }

    positionPopupNearAnchor(shell, this.colorPaletteButton, this.colorPalette);
  }

  private renderTableSizePicker(): void {
    const grid = this.root.querySelector('[data-role="tableSizeGrid"]') as HTMLDivElement;
    renderTableSizeGrid(grid, {
      onHover: (row, col) => {
        this.tableHoverRows = row;
        this.tableHoverCols = col;
        this.updateTableSizePreview();
      },
      onMouseDown: (row, col, event) => {
        if (event.button !== 0) {
          return;
        }
        this.tableGridSelecting = true;
        this.tableGridInsertedByDrag = false;
        this.tableHoverRows = row;
        this.tableHoverCols = col;
        this.updateTableSizePreview();
        event.preventDefault();
      },
      onMouseUp: (row, col, event) => {
        if (event.button !== 0 || !this.tableGridSelecting) {
          return;
        }
        this.applyTableSizeSelection(row, col);
        this.tableGridInsertedByDrag = true;
      },
      onClick: (row, col) => {
        if (this.tableGridInsertedByDrag) {
          this.tableGridInsertedByDrag = false;
          return;
        }
        this.applyTableSizeSelection(row, col);
      },
    });

    this.tableHoverRows = 0;
    this.tableHoverCols = 0;
    this.updateTableSizePreview();
  }

  private toggleTableSizePicker(): void {
    if (this.tableSizePicker.hidden) {
      this.captureSelection();
      this.tableSizePicker.hidden = false;
      this.tableSizePicker.style.visibility = "hidden";
      this.positionTableSizePicker();
      this.tableSizePicker.style.visibility = "";
      return;
    }

    this.hideTableSizePicker();
  }

  private hideTableSizePicker(): void {
    this.tableSizePicker.hidden = true;
    this.tableGridSelecting = false;
    this.tableGridInsertedByDrag = false;
    this.tableHoverRows = 0;
    this.tableHoverCols = 0;
    this.updateTableSizePreview();
  }

  private applyTableSizeSelection(rows: number, cols: number): void {
    this.restoreSelection();
    this.insertTable(rows, cols);
    this.hideTableSizePicker();
  }

  private positionTableSizePicker(): void {
    const shell = this.root.querySelector(".re-shell") as HTMLElement | null;
    if (!shell) {
      return;
    }

    positionPopupNearAnchor(shell, this.tableInsertButton, this.tableSizePicker);
  }

  private updateTableSizePreview(): void {
    updateTableSizeGridPreview(this.tableSizeInfo, this.tableSizePicker, this.tableHoverRows, this.tableHoverCols);
  }

  private toggleEmojiPicker(): void {
    this.captureSelection();
    if (this.emojiPicker.hidden) {
      this.emojiPicker.hidden = false;
      this.emojiPicker.style.visibility = "hidden";
      this.positionEmojiPicker();
      this.emojiPicker.style.visibility = "";
      return;
    }

    this.emojiPicker.hidden = true;
  }

  private positionEmojiPicker(): void {
    const shell = this.root.querySelector(".re-shell") as HTMLElement | null;
    if (!shell) {
      return;
    }

    positionPopupNearAnchor(shell, this.emojiButton, this.emojiPicker, { centerAnchor: true });
  }

  private insertTextAtCaret(text: string): void {
    this.exec("insertText", text);
  }

  private handlePaste(event: ClipboardEvent): void {
    event.preventDefault();

    const html = event.clipboardData?.getData("text/html")?.trim();
    const plain = event.clipboardData?.getData("text/plain") ?? "";

    if (html) {
      const clean = cleanPasteHtml(html);

      this.exec("insertHTML", clean);
      this.decorateSpecialNodes();
      return;
    }

    this.exec("insertText", cleanPasteText(plain));
  }

  private decorateSpecialNodes(): void {
    for (const table of Array.from(this.editor.querySelectorAll("table"))) {
      this.enableTableColumnResize(table as HTMLTableElement);
    }

    for (const image of Array.from(this.editor.querySelectorAll("img"))) {
      if (image.closest(".re-image-wrap")) {
        continue;
      }

      const wrapper = document.createElement("span");
      wrapper.className = "re-image-wrap";
      wrapper.contentEditable = "false";
      image.replaceWith(wrapper);
      wrapper.appendChild(image);
      this.attachImageResizer(wrapper, image as HTMLImageElement);
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (this.handleMergePreviewKeydown(event)) {
      return;
    }

    if (this.handleTableSelectionKeydown(event)) {
      return;
    }

    if (this.handleTableNavigationKeydown(event)) {
      return;
    }

    const mod = event.ctrlKey || event.metaKey;
    if (!mod) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === "s") {
      event.preventDefault();
      this.save();
      return;
    }

    if (key === "z" && !event.shiftKey) {
      event.preventDefault();
      this.exec("undo");
      return;
    }

    if ((key === "y") || (key === "z" && event.shiftKey)) {
      event.preventDefault();
      this.exec("redo");
    }
  }

  private handleTableNavigationKeydown(event: KeyboardEvent): boolean {
    return handleTableNavigationKeydownHelper(this as unknown as Record<string, unknown>, event);
  }

  private handleMergePreviewKeydown(event: KeyboardEvent): boolean {
    if (!this.pendingExpandedMerge) {
      return false;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      this.mergeSelectedCellBlock();
      return true;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.clearSelectedCells();
      this.showSaveStatus("Merge preview canceled");
      return true;
    }

    return false;
  }

  private updateToolbarState(): void {
    const range = this.getActiveEditorRange();
    if (!range) {
      this.clearToolbarState();
      this.applyToolbarDefaults();
      return;
    }

    this.applyButtonState("bold", this.getInlineCommandState("bold"));
    this.applyButtonState("italic", this.getInlineCommandState("italic"));
    this.applyButtonState("underline", this.getInlineCommandState("underline"));
    this.applyButtonState("strikeThrough", this.getInlineCommandState("strikeThrough"));
    this.applyButtonState("insertUnorderedList", this.getListCommandState("insertUnorderedList"));
    this.applyButtonState("insertOrderedList", this.getListCommandState("insertOrderedList"));

    const fontNameSelect = this.toolbar.querySelector('[data-role="fontName"]') as HTMLSelectElement | null;
    if (fontNameSelect) {
      const selectedElement = this.getSelectionElement();
      const fontStyle = window.getComputedStyle(selectedElement ?? this.editor);
      const primaryFont = this.getPrimaryFontName(fontStyle.fontFamily);
      const matching = Array.from(fontNameSelect.options).find((option) => this.getPrimaryFontName(option.value) === primaryFont);
      if (matching) {
        fontNameSelect.value = matching.value;
      }

      const style = fontStyle;

      const fontSizeSelect = this.toolbar.querySelector('[data-role="fontSize"]') as HTMLSelectElement | null;
      if (fontSizeSelect) {
        const size = style.fontSize;
        const option = Array.from(fontSizeSelect.options).find((item) => item.value === size);
        if (option) {
          fontSizeSelect.value = option.value;
        }
      }

      const lineHeightSelect = this.toolbar.querySelector('[data-role="lineHeight"]') as HTMLSelectElement | null;
      if (lineHeightSelect) {
        const normalized = this.normalizeLineHeightOption(style, selectedElement ?? this.editor);
        const option = Array.from(lineHeightSelect.options).find((item) => item.value === normalized);
        if (option) {
          lineHeightSelect.value = option.value;
        }
      }

      this.updateColorTriggerChips(style.color, style.backgroundColor);
      this.updateColorPaletteSelection(style.color, style.backgroundColor);
    }
  }

  private normalizeLineHeightOption(style: CSSStyleDeclaration, baseElement: HTMLElement): LineHeightOption {
    const value = style.lineHeight;
    if (value === "normal" || !value) {
      return "1.4";
    }

    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return "1.4";
    }

    let ratio = numeric;
    if (value.endsWith("px")) {
      const fontSize = Number.parseFloat(window.getComputedStyle(baseElement).fontSize);
      if (Number.isFinite(fontSize) && fontSize > 0) {
        ratio = numeric / fontSize;
      }
    }

    const options: LineHeightOption[] = ["1.2", "1.4", "1.6", "1.8"];
    let closest: LineHeightOption = "1.4";
    let minDiff = Number.POSITIVE_INFINITY;
    for (const option of options) {
      const diff = Math.abs(Number.parseFloat(option) - ratio);
      if (diff < minDiff) {
        minDiff = diff;
        closest = option;
      }
    }
    return closest;
  }

  private applyToolbarDefaults(): void {
    const fontNameSelect = this.toolbar.querySelector('[data-role="fontName"]') as HTMLSelectElement | null;
    if (fontNameSelect && fontNameSelect.options.length > 0) {
      fontNameSelect.value = fontNameSelect.options[0].value;
    }

    const fontSizeSelect = this.toolbar.querySelector('[data-role="fontSize"]') as HTMLSelectElement | null;
    if (fontSizeSelect) {
      const option = Array.from(fontSizeSelect.options).find((item) => item.value === "12px");
      if (option) {
        fontSizeSelect.value = option.value;
      }
    }

    const lineHeightSelect = this.toolbar.querySelector('[data-role="lineHeight"]') as HTMLSelectElement | null;
    if (lineHeightSelect) {
      const option = Array.from(lineHeightSelect.options).find((item) => item.value === "1.4");
      if (option) {
        lineHeightSelect.value = option.value;
      }
    }

    this.updateColorTriggerChips("#0f172a", "transparent");
    this.updateColorPaletteSelection("#0f172a", "transparent");
  }

  private updateColorTriggerChips(textColor: string, backgroundColor: string): void {
    const text = this.normalizeColorToHex(textColor) ?? "#0f172a";
    this.textColorChip.style.background = text;

    const normalizedBg = this.normalizeColorToHex(backgroundColor);
    if (!normalizedBg || backgroundColor === "transparent" || backgroundColor.includes("0)")) {
      this.bgColorChip.style.background = "linear-gradient(135deg, #ffffff 0%, #ffffff 48%, #ef4444 48%, #ef4444 52%, #ffffff 52%, #ffffff 100%)";
      return;
    }

    this.bgColorChip.style.background = normalizedBg;
  }

  private updateColorPaletteSelection(textColor: string, backgroundColor: string): void {
    const normalizedText = this.normalizeColorToHex(textColor);
    const normalizedBg = this.normalizeColorToHex(backgroundColor);
    const isTransparentBg = !normalizedBg || backgroundColor === "transparent" || backgroundColor.includes("0)");

    for (const node of Array.from(this.colorPalette.querySelectorAll("button[data-color-role]"))) {
      const button = node as HTMLButtonElement;
      const role = button.dataset.colorRole as FormattingRole | undefined;
      const value = button.dataset.colorValue?.toLowerCase() ?? "";
      let selected = false;

      if (role === "foreColor" && normalizedText) {
        selected = normalizedText.toLowerCase() === value;
      }

      if (role === "hiliteColor") {
        if (value === "transparent") {
          selected = isTransparentBg;
        } else if (normalizedBg) {
          selected = normalizedBg.toLowerCase() === value;
        }
      }

      button.classList.toggle("re-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    }
  }

  private getPrimaryFontName(fontFamily: string): string {
    const first = fontFamily.split(",")[0] ?? "";
    return first.trim().replaceAll('"', "").replaceAll("'", "").toLowerCase();
  }

  private clearToolbarState(): void {
    for (const active of Array.from(this.toolbar.querySelectorAll("button.re-active"))) {
      active.classList.remove("re-active");
    }
    for (const mixed of Array.from(this.toolbar.querySelectorAll("button.re-mixed"))) {
      mixed.classList.remove("re-mixed");
    }
    for (const mixedColor of Array.from(this.toolbar.querySelectorAll(".re-color-label.re-mixed"))) {
      mixedColor.classList.remove("re-mixed");
    }
  }

  private applyButtonState(command: string, state: CommandState): void {
    const button = this.toolbar.querySelector(`[data-cmd="${command}"]`) as HTMLButtonElement | null;
    if (!button) {
      return;
    }

    button.classList.toggle("re-active", state === "on");
    button.classList.toggle("re-mixed", state === "mixed");
    button.setAttribute("aria-pressed", state === "on" ? "true" : "false");
    if (state === "mixed") {
      button.setAttribute("data-state", "mixed");
    } else {
      button.removeAttribute("data-state");
    }
  }

  private getSimpleCommandState(command: ListCommand): CommandState {
    try {
      return document.queryCommandState(command) ? "on" : "off";
    } catch {
      return "off";
    }
  }

  private getListCommandState(command: ListCommand): CommandState {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return "off";
    }

    const range = selection.getRangeAt(0);
    if (!this.editor.contains(range.commonAncestorContainer)) {
      return "off";
    }

    if (range.collapsed) {
      return this.getSimpleCommandState(command);
    }

    const blocks = this.getSelectedBlocks(range);
    if (blocks.length === 0) {
      return this.getSimpleCommandState(command);
    }

    const listTag = command === "insertUnorderedList" ? "ul" : "ol";
    const inList = blocks.map((block) => {
      const li = block.closest("li");
      if (!li) {
        return false;
      }
      const list = li.closest("ul,ol");
      return Boolean(list && list.tagName.toLowerCase() === listTag);
    });

    const hasTrue = inList.some(Boolean);
    const hasFalse = inList.some((item) => !item);
    if (hasTrue && hasFalse) {
      return "mixed";
    }
    return hasTrue ? "on" : "off";
  }

  private getInlineCommandState(command: InlineCommand): CommandState {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return "off";
    }

    const range = selection.getRangeAt(0);
    if (!this.editor.contains(range.commonAncestorContainer)) {
      return "off";
    }

    if (range.collapsed) {
      try {
        return document.queryCommandState(command) ? "on" : "off";
      } catch {
        return "off";
      }
    }

    const container = range.commonAncestorContainer;
    const root = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
    if (!root) {
      return "off";
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let matched = 0;
    let appliedCount = 0;

    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      if (!textNode.textContent?.trim()) {
        continue;
      }

      if (!range.intersectsNode(textNode)) {
        continue;
      }

      matched += 1;
      if (this.isInlineCommandApplied(textNode.parentElement, command)) {
        appliedCount += 1;
      }
    }

    if (matched === 0) {
      return "off";
    }
    if (appliedCount === 0) {
      return "off";
    }
    if (appliedCount === matched) {
      return "on";
    }
    return "mixed";
  }

  private isInlineCommandApplied(element: HTMLElement | null, command: InlineCommand): boolean {
    if (!element) {
      return false;
    }

    let current: HTMLElement | null = element;
    while (current && current !== this.editor) {
      const tag = current.tagName.toLowerCase();
      const style = window.getComputedStyle(current);

      if (command === "bold") {
        if (tag === "b" || tag === "strong") {
          return true;
        }
        const weight = Number.parseInt(style.fontWeight, 10);
        if (!Number.isNaN(weight) && weight >= 600) {
          return true;
        }
      }

      if (command === "italic") {
        if (tag === "i" || tag === "em" || style.fontStyle === "italic") {
          return true;
        }
      }

      if (command === "underline") {
        const deco = style.textDecorationLine;
        if (tag === "u" || deco.includes("underline")) {
          return true;
        }
      }

      if (command === "strikeThrough") {
        const deco = style.textDecorationLine;
        if (tag === "s" || tag === "strike" || tag === "del" || deco.includes("line-through")) {
          return true;
        }
      }

      current = current.parentElement;
    }

    return false;
  }

  private getSelectionElement(): HTMLElement | null {
    const range = this.getActiveEditorRange();
    if (!range) {
      return null;
    }

    const selection = window.getSelection();
    const node = selection?.anchorNode ?? range.startContainer;
    if (!node) {
      return null;
    }
    return node instanceof HTMLElement ? node : node.parentElement;
  }

  private getSelectedBlocks(range: Range): HTMLElement[] {
    const root = this.editor;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const blocks = new Set<HTMLElement>();

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (!node.textContent?.trim()) {
        continue;
      }
      if (!range.intersectsNode(node)) {
        continue;
      }

      const base = node.parentElement;
      if (!base) {
        continue;
      }

      const block = base.closest("li,p,div,h1,h2,h3,h4,h5,h6,blockquote,td,th") ?? base;
      blocks.add(block as HTMLElement);
    }

    return Array.from(blocks);
  }

  private updateColorControl(
    role: "foreColor" | "hiliteColor",
    fallbackColor: string,
    styleProp: "color" | "backgroundColor",
  ): void {
    const input = this.toolbar.querySelector(`[data-role="${role}"]`) as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const label = input.closest(".re-color-label") as HTMLElement | null;
    const selection = window.getSelection();
    let colors = new Set<string>();

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      colors = this.collectSelectionColors(range, styleProp);
    }

    if (colors.size > 1) {
      label?.classList.add("re-mixed");
      return;
    }

    label?.classList.remove("re-mixed");
    const single = colors.values().next().value as string | undefined;
    const next = single ?? this.normalizeColorToHex(fallbackColor);
    if (next) {
      input.value = next;
    }
  }

  private collectSelectionColors(range: Range, styleProp: "color" | "backgroundColor"): Set<string> {
    const colors = new Set<string>();

    if (range.collapsed) {
      const current = this.getSelectionElement();
      if (!current) {
        return colors;
      }
      const style = window.getComputedStyle(current);
      const color = this.normalizeColorToHex(style[styleProp]);
      if (color) {
        colors.add(color);
      }
      return colors;
    }

    const blocks = this.getSelectedBlocks(range);
    for (const block of blocks) {
      const style = window.getComputedStyle(block);
      const color = this.normalizeColorToHex(style[styleProp]);
      if (color) {
        colors.add(color);
      }
    }

    return colors;
  }

  private normalizeColorToHex(color: string): string | null {
    const hexPattern = /^#[0-9a-f]{6}$/i;
    if (hexPattern.test(color)) {
      return color;
    }

    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) {
      return null;
    }

    const [r, g, b] = match.slice(1, 4).map((value) => Number.parseInt(value, 10));
    const toHex = (value: number): string => value.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private save(): void {
    localStorage.setItem(this.options.storageKey, this.editor.innerHTML);
    this.showSaveStatus("Saved");
  }

  private restore(): void {
    const saved = localStorage.getItem(this.options.storageKey);
    if (!saved) {
      return;
    }

    this.editor.innerHTML = saved;
    this.decorateSpecialNodes();
    this.showSaveStatus("Restored");
  }

  private showSaveStatus(text: string): void {
    this.saveStatus.textContent = text;
    window.setTimeout(() => {
      this.saveStatus.textContent = "Idle";
    }, 1200);
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Failed to read file as data URL"));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
      reader.readAsDataURL(file);
    });
  }

  private debounce<T extends Array<unknown>>(callback: (...args: T) => void, delay: number): (...args: T) => void {
    let timerId: number | undefined;
    return (...args: T) => {
      if (timerId) {
        window.clearTimeout(timerId);
      }
      timerId = window.setTimeout(() => callback(...args), delay);
    };
  }
}
