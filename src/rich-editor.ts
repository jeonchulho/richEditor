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
  HeaderPasteMode,
  InlineCommand,
  LineHeightOption,
  ListCommand,
  MentionOptions,
  RichEditorOptions,
  TableAction,
  TableMatrix,
  UnmergeContentMode,
} from "./rich-editor/types";

const DELETE_UI_TEXT = {
  imageConfirm: "이미지가 삭제됩니다. 계속할까요?",
  tableConfirm: "테이블 전체가 삭제됩니다. 계속할까요?",
  imageCanceled: "Image delete canceled",
  tableCanceled: "Table delete canceled",
  imageDeleted: "Image deleted",
  tableDeleted: "Table deleted",
} as const;

const DEFAULT_MENTION_ITEMS = [
  "김민지",
  "박준호",
  "이수현",
  "최윤아",
  "정우진",
  "관리팀",
  "생산팀",
  "품질팀",
  "구매팀",
  "물류팀",
] as const;
const DEFAULT_MENTION_TRIGGER = "@";
const DEFAULT_MENTION_MAX_RESULTS = 8;

// RichEditor 핵심 클래스.
// 책임 범위:
// 1) 렌더링/DOM 참조 연결
// 2) selection 캡처/복원
// 3) 툴바 명령 실행 및 상태 동기화
// 4) 테이블/이미지/팝업 인터랙션
// 5) 저장/복구 및 디버그 로그
export class RichEditor {
  private readonly root: HTMLElement;
  private readonly options: {
    storageKey: string;
    autosaveEnabled: boolean;
    autosaveDelay: number;
    mentionItems: string[];
    mentionEnabled: boolean;
    mentionTrigger: string;
    mentionMaxResults: number;
  };
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
  private mentionPopup!: HTMLDivElement;
  private mentionList!: HTMLDivElement;
  private tableContextMenu!: HTMLDivElement;
  private tablePropsBackdrop!: HTMLDivElement;
  private tablePropsDialog!: HTMLDivElement;
  private tablePropsDragHandle!: HTMLDivElement;
  private tablePropsMinimizeButton!: HTMLButtonElement;
  private tablePropsTitle!: HTMLDivElement;
  private tablePropsTabs!: HTMLDivElement;
  private tablePropsSectionTable!: HTMLElement;
  private tablePropsSectionRow!: HTMLElement;
  private tablePropsSectionCell!: HTMLElement;
  private tablePropsSectionCol!: HTMLElement;
  private tablePropsValidation!: HTMLDivElement;
  private tablePropsSummary!: HTMLDivElement;
  private tablePropsRecentColors!: HTMLDivElement;
  private tablePropsWidthInput!: HTMLInputElement;
  private tablePropsBorderWidthInput!: HTMLInputElement;
  private tablePropsBorderColorInput!: HTMLInputElement;
  private tablePropsBorderColorPicker!: HTMLInputElement;
  private tablePropsBgColorInput!: HTMLInputElement;
  private tablePropsBgColorPicker!: HTMLInputElement;
  private tablePropsAlignSelect!: HTMLSelectElement;
  private tablePropsRowHeightInput!: HTMLInputElement;
  private tablePropsRowBgColorInput!: HTMLInputElement;
  private tablePropsRowBgColorPicker!: HTMLInputElement;
  private tablePropsRowVAlignSelect!: HTMLSelectElement;
  private tablePropsCellBorderWidthInput!: HTMLInputElement;
  private tablePropsCellBorderStyleSelect!: HTMLSelectElement;
  private tablePropsCellBorderTopInput!: HTMLInputElement;
  private tablePropsCellBorderRightInput!: HTMLInputElement;
  private tablePropsCellBorderBottomInput!: HTMLInputElement;
  private tablePropsCellBorderLeftInput!: HTMLInputElement;
  private tablePropsCellPaddingInput!: HTMLInputElement;
  private tablePropsCellPaddingRange!: HTMLInputElement;
  private tablePropsCellBorderColorInput!: HTMLInputElement;
  private tablePropsCellBorderColorPicker!: HTMLInputElement;
  private tablePropsCellTextColorInput!: HTMLInputElement;
  private tablePropsCellTextColorPicker!: HTMLInputElement;
  private tablePropsCellBgColorInput!: HTMLInputElement;
  private tablePropsCellBgColorPicker!: HTMLInputElement;
  private tablePropsCellAlignSelect!: HTMLSelectElement;
  private tablePropsCellVAlignSelect!: HTMLSelectElement;
  private tablePropsCellWrapSelect!: HTMLSelectElement;
  private tablePropsColWidthInput!: HTMLInputElement;
  private tablePropsColBgColorInput!: HTMLInputElement;
  private tablePropsColBgColorPicker!: HTMLInputElement;
  private tablePropsColAlignSelect!: HTMLSelectElement;
  private activeTablePropsMode: "table" | "row" | "cell" | "col" | null = null;
  private tablePropsSessionTable: HTMLTableElement | null = null;
  private tablePropsSessionRow: HTMLTableRowElement | null = null;
  private tablePropsSessionCell: HTMLTableCellElement | null = null;
  private tablePropsSessionCells: HTMLTableCellElement[] = [];
  private tablePropsSessionCol = -1;
  private readonly tablePropsSnapshot = new Map<HTMLElement, string | null>();
  private readonly recentTablePropColors: string[] = [];
  private activeTablePropsColorField: "tableBorder" | "tableBg" | "rowBg" | "cellBorder" | "cellText" | "cellBg" | "colBg" = "tableBg";
  private tablePropsDialogCollapsed = false;
  private tablePropsDialogLastPosition: { left: number; top: number } | null = null;
  private tableGridSelecting = false;
  private tableGridInsertedByDrag = false;
  private tableHoverRows = 0;
  private tableHoverCols = 0;
  private unmergeModeSelect!: HTMLSelectElement;
  private flashIntensitySelect!: HTMLSelectElement;
  private headerPasteModeSelect!: HTMLSelectElement;
  private mergeButton!: HTMLButtonElement;
  private mergePreviewBadge!: HTMLSpanElement;
  private mergeRangeBadge!: HTMLSpanElement;
  private imageInput!: HTMLInputElement;
  private saveStatus!: HTMLSpanElement;
  private debugToggleButton!: HTMLButtonElement;
  private debugPanelWrap!: HTMLElement;
  private debugPanel!: HTMLDivElement;
  private debugPanelVisible = false;
  private isComposing = false;
  private savedRange: Range | null = null;
  private lastExpandedRange: Range | null = null;
  private toolbarInteractionRange: Range | null = null;
  private isRestoringSelection = false;
  private isToolbarInteracting = false;
  private skipNormalizeOnNextInput = false;
  private debugSeq = 0;
  private readonly debouncedSave: () => void;
  private readonly selectedCells = new Set<HTMLTableCellElement>();
  private readonly previewCells = new Set<HTMLTableCellElement>();
  private readonly mergeUndoSnapshots: string[] = [];
  private readonly mergeRedoSnapshots: string[] = [];
  private isCellDragSelecting = false;
  private didDragSelectCells = false;
  private dragAnchorCell: HTMLTableCellElement | null = null;
  private keyboardAnchorCell: HTMLTableCellElement | null = null;
  private keyboardFocusCell: HTMLTableCellElement | null = null;
  private lastTableAnchorCell: HTMLTableCellElement | null = null;
  private activeImageWrapper: HTMLElement | null = null;
  private activeTableElement: HTMLTableElement | null = null;
  private pendingExpandedMerge = false;
  private mentionActiveIndex = 0;
  private mentionQuery = "";
  private mentionReplaceRange: Range | null = null;
  private mentionCandidates: string[] = [];
  private composingText = "";
  private mentionItems: string[] = [...DEFAULT_MENTION_ITEMS];
  private mentionEnabled = true;
  private mentionTrigger = DEFAULT_MENTION_TRIGGER;
  private mentionMaxResults = DEFAULT_MENTION_MAX_RESULTS;
  private headerPasteMode: HeaderPasteMode = "preserveTarget";
  private readonly uiPrefsKey: string;

  constructor(root: HTMLElement, options: RichEditorOptions = {}) {
    this.root = root;
    const mentionOptions = this.normalizeMentionOptions(options.mentions, options.mentionItems);
    this.options = {
      storageKey: options.storageKey ?? DEFAULT_STORAGE_KEY,
      autosaveEnabled: options.autosaveEnabled ?? true,
      autosaveDelay: options.autosaveDelay ?? DEFAULT_AUTOSAVE_DELAY,
      mentionItems: mentionOptions.items,
      mentionEnabled: mentionOptions.enabled,
      mentionTrigger: mentionOptions.trigger,
      mentionMaxResults: mentionOptions.maxResults,
    };
    this.mentionItems = [...this.options.mentionItems];
    this.mentionEnabled = this.options.mentionEnabled;
    this.mentionTrigger = this.options.mentionTrigger;
    this.mentionMaxResults = this.options.mentionMaxResults;
    this.uiPrefsKey = `${this.options.storageKey}:ui-prefs`;

    this.debouncedSave = this.options.autosaveEnabled
      ? this.debounce(() => this.save(), this.options.autosaveDelay)
      : () => {};
    this.render();
    this.restoreUiPrefs();
    this.bindEvents();
    this.restore();
    this.captureSelection();
    this.updateToolbarState();
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private normalizeMentionItems(items?: string[]): string[] {
    if (!items || items.length === 0) {
      return [...DEFAULT_MENTION_ITEMS];
    }

    const normalized = Array.from(new Set(items.map((item) => item.trim()).filter((item) => item.length > 0)));
    return normalized.length > 0 ? normalized : [...DEFAULT_MENTION_ITEMS];
  }

  private normalizeMentionOptions(mentions?: MentionOptions, legacyItems?: string[]): {
    enabled: boolean;
    trigger: string;
    items: string[];
    maxResults: number;
  } {
    const trigger = (mentions?.trigger ?? DEFAULT_MENTION_TRIGGER).trim();
    const normalizedTrigger = trigger.length > 0 ? trigger : DEFAULT_MENTION_TRIGGER;
    const maxResults = Number.isFinite(mentions?.maxResults)
      ? Math.max(1, Math.floor(mentions?.maxResults ?? DEFAULT_MENTION_MAX_RESULTS))
      : DEFAULT_MENTION_MAX_RESULTS;
    return {
      enabled: mentions?.enabled ?? true,
      trigger: normalizedTrigger,
      items: this.normalizeMentionItems(mentions?.items ?? legacyItems),
      maxResults,
    };
  }

  public setMentionItems(items: string[]): void {
    this.mentionItems = this.normalizeMentionItems(items);
    if (this.isMentionPopupVisible()) {
      this.updateMentionAutocompleteFromSelection();
    }
  }

  public configureMentions(options: MentionOptions): void {
    const normalized = this.normalizeMentionOptions(options, this.mentionItems);
    this.mentionEnabled = normalized.enabled;
    this.mentionTrigger = normalized.trigger;
    this.mentionItems = normalized.items;
    this.mentionMaxResults = normalized.maxResults;
    if (!this.mentionEnabled) {
      this.hideMentionPopup();
      return;
    }
    this.updateMentionAutocompleteFromSelection();
  }

  // 템플릿을 주입하고 주요 UI 노드 참조를 캐시한다.
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
    this.mentionPopup = this.root.querySelector('[data-role="mentionPopup"]') as HTMLDivElement;
    this.mentionList = this.root.querySelector('[data-role="mentionList"]') as HTMLDivElement;
    this.tableContextMenu = this.root.querySelector('[data-role="tableContextMenu"]') as HTMLDivElement;
    this.tablePropsBackdrop = this.root.querySelector('[data-role="tablePropsBackdrop"]') as HTMLDivElement;
    this.tablePropsDialog = this.root.querySelector('[data-role="tablePropsDialog"]') as HTMLDivElement;
    this.tablePropsDragHandle = this.root.querySelector('[data-role="tablePropsDragHandle"]') as HTMLDivElement;
    this.tablePropsMinimizeButton = this.root.querySelector('[data-action="toggleTablePropsCollapse"]') as HTMLButtonElement;
    this.tablePropsTitle = this.root.querySelector('[data-role="tablePropsTitle"]') as HTMLDivElement;
    this.tablePropsTabs = this.root.querySelector('[data-role="tablePropsTabs"]') as HTMLDivElement;
    this.tablePropsSectionTable = this.root.querySelector('[data-role="tablePropsSectionTable"]') as HTMLElement;
    this.tablePropsSectionRow = this.root.querySelector('[data-role="tablePropsSectionRow"]') as HTMLElement;
    this.tablePropsSectionCell = this.root.querySelector('[data-role="tablePropsSectionCell"]') as HTMLElement;
    this.tablePropsSectionCol = this.root.querySelector('[data-role="tablePropsSectionCol"]') as HTMLElement;
    this.tablePropsValidation = this.root.querySelector('[data-role="tablePropsValidation"]') as HTMLDivElement;
    this.tablePropsSummary = this.root.querySelector('[data-role="tablePropsSummary"]') as HTMLDivElement;
    this.tablePropsRecentColors = this.root.querySelector('[data-role="tablePropsRecentColors"]') as HTMLDivElement;
    this.tablePropsWidthInput = this.root.querySelector('[data-role="tablePropsWidth"]') as HTMLInputElement;
    this.tablePropsBorderWidthInput = this.root.querySelector('[data-role="tablePropsBorderWidth"]') as HTMLInputElement;
    this.tablePropsBorderColorInput = this.root.querySelector('[data-role="tablePropsBorderColor"]') as HTMLInputElement;
    this.tablePropsBorderColorPicker = this.root.querySelector('[data-role="tablePropsBorderColorPicker"]') as HTMLInputElement;
    this.tablePropsBgColorInput = this.root.querySelector('[data-role="tablePropsBgColor"]') as HTMLInputElement;
    this.tablePropsBgColorPicker = this.root.querySelector('[data-role="tablePropsBgColorPicker"]') as HTMLInputElement;
    this.tablePropsAlignSelect = this.root.querySelector('[data-role="tablePropsAlign"]') as HTMLSelectElement;
    this.tablePropsRowHeightInput = this.root.querySelector('[data-role="tablePropsRowHeight"]') as HTMLInputElement;
    this.tablePropsRowBgColorInput = this.root.querySelector('[data-role="tablePropsRowBgColor"]') as HTMLInputElement;
    this.tablePropsRowBgColorPicker = this.root.querySelector('[data-role="tablePropsRowBgColorPicker"]') as HTMLInputElement;
    this.tablePropsRowVAlignSelect = this.root.querySelector('[data-role="tablePropsRowVAlign"]') as HTMLSelectElement;
    this.tablePropsCellBorderWidthInput = this.root.querySelector('[data-role="tablePropsCellBorderWidth"]') as HTMLInputElement;
    this.tablePropsCellBorderStyleSelect = this.root.querySelector('[data-role="tablePropsCellBorderStyle"]') as HTMLSelectElement;
    this.tablePropsCellBorderTopInput = this.root.querySelector('[data-role="tablePropsCellBorderTop"]') as HTMLInputElement;
    this.tablePropsCellBorderRightInput = this.root.querySelector('[data-role="tablePropsCellBorderRight"]') as HTMLInputElement;
    this.tablePropsCellBorderBottomInput = this.root.querySelector('[data-role="tablePropsCellBorderBottom"]') as HTMLInputElement;
    this.tablePropsCellBorderLeftInput = this.root.querySelector('[data-role="tablePropsCellBorderLeft"]') as HTMLInputElement;
    this.tablePropsCellPaddingInput = this.root.querySelector('[data-role="tablePropsCellPadding"]') as HTMLInputElement;
    this.tablePropsCellPaddingRange = this.root.querySelector('[data-role="tablePropsCellPaddingRange"]') as HTMLInputElement;
    this.tablePropsCellBorderColorInput = this.root.querySelector('[data-role="tablePropsCellBorderColor"]') as HTMLInputElement;
    this.tablePropsCellBorderColorPicker = this.root.querySelector('[data-role="tablePropsCellBorderColorPicker"]') as HTMLInputElement;
    this.tablePropsCellTextColorInput = this.root.querySelector('[data-role="tablePropsCellTextColor"]') as HTMLInputElement;
    this.tablePropsCellTextColorPicker = this.root.querySelector('[data-role="tablePropsCellTextColorPicker"]') as HTMLInputElement;
    this.tablePropsCellBgColorInput = this.root.querySelector('[data-role="tablePropsCellBgColor"]') as HTMLInputElement;
    this.tablePropsCellBgColorPicker = this.root.querySelector('[data-role="tablePropsCellBgColorPicker"]') as HTMLInputElement;
    this.tablePropsCellAlignSelect = this.root.querySelector('[data-role="tablePropsCellAlign"]') as HTMLSelectElement;
    this.tablePropsCellVAlignSelect = this.root.querySelector('[data-role="tablePropsCellVAlign"]') as HTMLSelectElement;
    this.tablePropsCellWrapSelect = this.root.querySelector('[data-role="tablePropsCellWrap"]') as HTMLSelectElement;
    this.tablePropsColWidthInput = this.root.querySelector('[data-role="tablePropsColWidth"]') as HTMLInputElement;
    this.tablePropsColBgColorInput = this.root.querySelector('[data-role="tablePropsColBgColor"]') as HTMLInputElement;
    this.tablePropsColBgColorPicker = this.root.querySelector('[data-role="tablePropsColBgColorPicker"]') as HTMLInputElement;
    this.tablePropsColAlignSelect = this.root.querySelector('[data-role="tablePropsColAlign"]') as HTMLSelectElement;
    this.unmergeModeSelect = this.root.querySelector('[data-role="unmergeMode"]') as HTMLSelectElement;
    this.flashIntensitySelect = this.root.querySelector('[data-role="flashIntensity"]') as HTMLSelectElement;
    this.headerPasteModeSelect = this.root.querySelector('[data-role="headerPasteMode"]') as HTMLSelectElement;
    this.mergeButton = this.root.querySelector('[data-table="mergeCells"]') as HTMLButtonElement;
    this.mergePreviewBadge = this.root.querySelector('[data-role="mergePreviewBadge"]') as HTMLSpanElement;
    this.mergeRangeBadge = this.root.querySelector('[data-role="mergeRangeBadge"]') as HTMLSpanElement;
    this.imageInput = this.root.querySelector('[data-role="imageInput"]') as HTMLInputElement;
    this.saveStatus = this.root.querySelector('[data-role="saveStatus"]') as HTMLSpanElement;
    this.debugToggleButton = this.root.querySelector('[data-action="toggleDebug"]') as HTMLButtonElement;
    this.debugPanelWrap = this.root.querySelector('[data-role="debugPanelWrap"]') as HTMLElement;
    this.debugPanel = this.root.querySelector('[data-role="debugPanel"]') as HTMLDivElement;
    this.setDebugPanelVisible(false);

    this.updateMergeActionUi(0, 0, 0);

    this.renderEmojiPicker();
    this.renderColorPalette();
    this.renderTableSizePicker();
    this.renderTablePropsRecentColors();

    this.editor.innerHTML = INITIAL_EDITOR_HTML;
  }

  // 이벤트 바인딩은 별도 모듈에서 위임 처리한다.
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

  private showTablePropsDialog(): void {
    const shell = this.root.querySelector(".re-shell") as HTMLElement | null;
    if (!shell) {
      return;
    }

    this.tablePropsBackdrop.hidden = false;
    this.tablePropsDialog.hidden = false;
    this.tablePropsDialog.style.visibility = "hidden";
    this.syncAllTablePropsColorPickers();

    const shellRect = shell.getBoundingClientRect();
    const dialogWidth = this.tablePropsDialog.offsetWidth;
    const dialogHeight = this.tablePropsDialog.offsetHeight;
    const centeredLeft = Math.max(12, Math.round((shellRect.width - dialogWidth) / 2));
    const centeredTop = Math.max(20, Math.round((shellRect.height - dialogHeight) / 2));
    const preferred = this.tablePropsDialogLastPosition ?? { left: centeredLeft, top: centeredTop };
    const clamped = this.clampTablePropsDialogPosition(preferred.left, preferred.top, shellRect, dialogWidth, dialogHeight);
    this.tablePropsDialog.style.left = `${clamped.left}px`;
    this.tablePropsDialog.style.top = `${clamped.top}px`;
    this.tablePropsDialogLastPosition = clamped;

    this.tablePropsDialog.style.visibility = "";
    this.applyTablePropsDialogCollapsedState();

    const focusTarget = this.activeTablePropsMode === "table"
      ? this.tablePropsWidthInput
      : this.activeTablePropsMode === "row"
        ? this.tablePropsRowHeightInput
        : this.activeTablePropsMode === "cell"
          ? this.tablePropsCellBorderWidthInput
        : this.tablePropsColWidthInput;
    focusTarget?.focus();
    focusTarget?.select();
  }

  private hideTablePropsDialog(): void {
    this.tablePropsBackdrop.hidden = true;
    this.tablePropsDialog.hidden = true;
    this.tablePropsDialog.classList.remove("is-dragging");
  }

  private clampTablePropsDialogPosition(
    left: number,
    top: number,
    shellRect: DOMRect,
    dialogWidth: number,
    dialogHeight: number,
  ): { left: number; top: number } {
    const maxLeft = Math.max(8, shellRect.width - dialogWidth - 8);
    const maxTop = Math.max(8, shellRect.height - dialogHeight - 8);
    return {
      left: Math.min(maxLeft, Math.max(8, Math.round(left))),
      top: Math.min(maxTop, Math.max(8, Math.round(top))),
    };
  }

  private cacheTablePropsDialogPosition(left: number, top: number): void {
    this.tablePropsDialogLastPosition = { left, top };
  }

  private applyTablePropsDialogCollapsedState(): void {
    this.tablePropsDialog.classList.toggle("is-collapsed", this.tablePropsDialogCollapsed);
    this.tablePropsMinimizeButton.textContent = this.tablePropsDialogCollapsed ? "+" : "−";
    this.tablePropsMinimizeButton.title = this.tablePropsDialogCollapsed ? "확장" : "최소화";
    this.tablePropsMinimizeButton.setAttribute("aria-label", this.tablePropsDialogCollapsed ? "속성 창 확장" : "속성 창 최소화");
  }

  private toggleTablePropsDialogCollapsed(): void {
    this.tablePropsDialogCollapsed = !this.tablePropsDialogCollapsed;
    this.applyTablePropsDialogCollapsedState();
  }

  private setTablePropsMode(mode: "table" | "row" | "cell" | "col"): void {
    this.activeTablePropsMode = mode;

    this.tablePropsSectionTable.hidden = mode !== "table";
    this.tablePropsSectionRow.hidden = mode !== "row";
    this.tablePropsSectionCell.hidden = mode !== "cell";
    this.tablePropsSectionCol.hidden = mode !== "col";

    for (const button of Array.from(this.tablePropsTabs.querySelectorAll("button[data-table-props-mode]"))) {
      const current = button as HTMLButtonElement;
      const buttonMode = current.dataset.tablePropsMode;
      current.classList.toggle("is-active", buttonMode === mode);
    }

    this.tablePropsTitle.textContent = mode === "table"
      ? "테이블 속성"
      : mode === "row"
        ? "행 속성"
        : mode === "cell"
          ? "셀 속성"
          : "열 속성";
    this.activeTablePropsColorField = mode === "table"
      ? "tableBg"
      : mode === "row"
        ? "rowBg"
        : mode === "cell"
          ? "cellBg"
          : "colBg";
    this.updateTablePropsSummary();
  }

  private validateTablePropsInputs(): string {
    if (!this.activeTablePropsMode) {
      return "";
    }

    if (this.activeTablePropsMode === "table") {
      const width = this.tablePropsWidthInput.value.trim();
      if (width.length > 0 && !this.normalizeCssSizeInput(width, { allowPercent: true, allowAuto: true })) {
        return "테이블 너비 형식이 올바르지 않습니다. 예: 100%, 640px, auto";
      }

      const borderWidth = this.tablePropsBorderWidthInput.value.trim();
      if (borderWidth.length > 0 && !this.normalizeCssSizeInput(borderWidth)) {
        return "테두리 굵기는 숫자 또는 CSS 길이 단위로 입력하세요. 예: 1, 2px";
      }
    }

    if (this.activeTablePropsMode === "row") {
      const height = this.tablePropsRowHeightInput.value.trim();
      if (height.length > 0 && !this.normalizeCssSizeInput(height)) {
        return "행 높이는 숫자 또는 CSS 길이 단위로 입력하세요. 예: 36, 40px";
      }
    }

    if (this.activeTablePropsMode === "cell") {
      const borderWidth = this.tablePropsCellBorderWidthInput.value.trim();
      if (borderWidth.length > 0 && !this.normalizeCssSizeInput(borderWidth)) {
        return "셀 테두리 굵기는 숫자 또는 CSS 길이 단위로 입력하세요. 예: 1, 2px";
      }

      const sideWidths = [
        this.tablePropsCellBorderTopInput.value.trim(),
        this.tablePropsCellBorderRightInput.value.trim(),
        this.tablePropsCellBorderBottomInput.value.trim(),
        this.tablePropsCellBorderLeftInput.value.trim(),
      ];
      if (sideWidths.some((value) => value.length > 0 && !this.normalizeCssSizeInput(value))) {
        return "개별 테두리 굵기는 숫자 또는 CSS 길이 단위로 입력하세요. 예: 1, 2px";
      }

      const padding = this.tablePropsCellPaddingInput.value.trim();
      if (padding.length > 0 && !this.normalizeCssSizeInput(padding)) {
        return "셀 패딩은 숫자 또는 CSS 길이 단위로 입력하세요. 예: 12, 12px";
      }
    }

    if (this.activeTablePropsMode === "col") {
      const width = this.tablePropsColWidthInput.value.trim();
      if (width.length > 0 && !this.normalizeCssSizeInput(width)) {
        return "열 너비는 숫자 또는 CSS 길이 단위로 입력하세요. 예: 120, 140px";
      }
    }

    return "";
  }

  private setTablePropsValidation(message: string): void {
    if (message.length === 0) {
      this.tablePropsValidation.hidden = true;
      this.tablePropsValidation.textContent = "";
      return;
    }

    this.tablePropsValidation.hidden = false;
    this.tablePropsValidation.textContent = message;
  }

  private updateTablePropsSummary(): void {
    if (!this.activeTablePropsMode) {
      this.tablePropsSummary.textContent = "";
      return;
    }

    if (this.activeTablePropsMode === "table") {
      const parts = [
        `너비: ${this.tablePropsWidthInput.value.trim() || "(유지)"}`,
        `테두리: ${this.tablePropsBorderWidthInput.value.trim() || "(유지)"}`,
        `색상: ${this.tablePropsBorderColorInput.value.trim() || "(유지)"}`,
        `배경: ${this.tablePropsBgColorInput.value.trim() || "(유지)"}`,
        `정렬: ${this.tablePropsAlignSelect.value}`,
      ];
      this.tablePropsSummary.textContent = parts.join(" · ");
      return;
    }

    if (this.activeTablePropsMode === "row") {
      const parts = [
        `행 높이: ${this.tablePropsRowHeightInput.value.trim() || "(유지)"}`,
        `배경: ${this.tablePropsRowBgColorInput.value.trim() || "(유지)"}`,
        `세로정렬: ${this.tablePropsRowVAlignSelect.value}`,
      ];
      this.tablePropsSummary.textContent = parts.join(" · ");
      return;
    }

    if (this.activeTablePropsMode === "cell") {
      const parts = [
        `테두리: ${this.tablePropsCellBorderWidthInput.value.trim() || "(유지)"}`,
        `스타일: ${this.tablePropsCellBorderStyleSelect.value}`,
        `상/우/하/좌: ${this.tablePropsCellBorderTopInput.value.trim() || "-"}/${this.tablePropsCellBorderRightInput.value.trim() || "-"}/${this.tablePropsCellBorderBottomInput.value.trim() || "-"}/${this.tablePropsCellBorderLeftInput.value.trim() || "-"}`,
        `패딩: ${this.tablePropsCellPaddingInput.value.trim() || "(유지)"}`,
        `테두리색: ${this.tablePropsCellBorderColorInput.value.trim() || "(유지)"}`,
        `텍스트색: ${this.tablePropsCellTextColorInput.value.trim() || "(유지)"}`,
        `배경: ${this.tablePropsCellBgColorInput.value.trim() || "(유지)"}`,
        `가로정렬: ${this.tablePropsCellAlignSelect.value}`,
        `세로정렬: ${this.tablePropsCellVAlignSelect.value}`,
        `줄바꿈: ${this.tablePropsCellWrapSelect.value}`,
      ];
      this.tablePropsSummary.textContent = parts.join(" · ");
      return;
    }

    const parts = [
      `열 너비: ${this.tablePropsColWidthInput.value.trim() || "(유지)"}`,
      `배경: ${this.tablePropsColBgColorInput.value.trim() || "(유지)"}`,
      `가로정렬: ${this.tablePropsColAlignSelect.value}`,
    ];
    this.tablePropsSummary.textContent = parts.join(" · ");
  }

  private clearTablePropsSession(): void {
    this.activeTablePropsMode = null;
    this.tablePropsSessionTable = null;
    this.tablePropsSessionRow = null;
    this.tablePropsSessionCell = null;
    this.tablePropsSessionCells = [];
    this.tablePropsSessionCol = -1;
    this.tablePropsSnapshot.clear();
  }

  private getTablePropsCellTargets(cell: HTMLTableCellElement): HTMLTableCellElement[] {
    if (this.selectedCells.size === 0 || !this.selectedCells.has(cell)) {
      return [cell];
    }

    const table = cell.closest("table");
    const targets = Array.from(this.selectedCells).filter((selected) => selected.closest("table") === table);
    return targets.length > 0 ? targets : [cell];
  }

  private captureTablePropsSnapshot(elements: HTMLElement[]): void {
    for (const element of elements) {
      if (this.tablePropsSnapshot.has(element)) {
        continue;
      }
      this.tablePropsSnapshot.set(element, element.getAttribute("style"));
    }
  }

  private restoreTablePropsSnapshot(): void {
    for (const [element, styleText] of this.tablePropsSnapshot.entries()) {
      if (!element.isConnected) {
        continue;
      }

      if (styleText === null) {
        element.removeAttribute("style");
      } else {
        element.setAttribute("style", styleText);
      }
    }

    if (this.tablePropsSessionTable && this.tablePropsSessionTable.isConnected) {
      this.enableTableColumnResize(this.tablePropsSessionTable);
    }
  }

  private collectColumnTargets(table: HTMLTableElement, col: number): HTMLTableCellElement[] {
    const tableData = this.buildTableMatrix(table);
    const targets = new Set<HTMLTableCellElement>();
    for (let rowIndex = 0; rowIndex < tableData.matrix.length; rowIndex += 1) {
      const targetCell = tableData.matrix[rowIndex]?.[col] ?? null;
      if (targetCell) {
        targets.add(targetCell);
      }
    }
    return Array.from(targets);
  }

  private normalizeCssSizeInput(value: string, { allowPercent = false, allowAuto = false }: { allowPercent?: boolean; allowAuto?: boolean } = {}): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return "";
    }

    const lower = trimmed.toLowerCase();
    if (allowAuto && lower === "auto") {
      return "auto";
    }

    if (allowPercent && /^\d+(\.\d+)?%$/.test(trimmed)) {
      return trimmed;
    }

    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return `${trimmed}px`;
    }

    if (/^\d+(\.\d+)?(px|em|rem|vh|vw)$/.test(lower)) {
      return trimmed;
    }

    return "";
  }

  private normalizeColorInput(value: string): string {
    const trimmed = value.trim();
    return trimmed.length === 0 ? "" : trimmed;
  }

  private colorPickerSafeValue(raw: string, fallback: string): string {
    const hex = this.normalizeColorToHex(raw);
    return hex ?? fallback;
  }

  private syncTablePropsColorPair(pair: "tableBorder" | "tableBg" | "rowBg" | "cellBorder" | "cellText" | "cellBg" | "colBg", source: "text" | "picker"): void {
    const mapping = pair === "tableBorder"
      ? { text: this.tablePropsBorderColorInput, picker: this.tablePropsBorderColorPicker, fallback: "#cbd5e1" }
      : pair === "tableBg"
        ? { text: this.tablePropsBgColorInput, picker: this.tablePropsBgColorPicker, fallback: "#ffffff" }
        : pair === "rowBg"
          ? { text: this.tablePropsRowBgColorInput, picker: this.tablePropsRowBgColorPicker, fallback: "#f8fafc" }
          : pair === "cellBorder"
            ? { text: this.tablePropsCellBorderColorInput, picker: this.tablePropsCellBorderColorPicker, fallback: "#cbd5e1" }
            : pair === "cellText"
              ? { text: this.tablePropsCellTextColorInput, picker: this.tablePropsCellTextColorPicker, fallback: "#334155" }
            : pair === "cellBg"
              ? { text: this.tablePropsCellBgColorInput, picker: this.tablePropsCellBgColorPicker, fallback: "#ffffff" }
          : { text: this.tablePropsColBgColorInput, picker: this.tablePropsColBgColorPicker, fallback: "#f8fafc" };

    if (source === "picker") {
      mapping.text.value = mapping.picker.value;
      return;
    }

    mapping.picker.value = this.colorPickerSafeValue(mapping.text.value, mapping.fallback);
  }

  private syncAllTablePropsColorPickers(): void {
    this.syncTablePropsColorPair("tableBorder", "text");
    this.syncTablePropsColorPair("tableBg", "text");
    this.syncTablePropsColorPair("rowBg", "text");
    this.syncTablePropsColorPair("cellBorder", "text");
    this.syncTablePropsColorPair("cellText", "text");
    this.syncTablePropsColorPair("cellBg", "text");
    this.syncTablePropsColorPair("colBg", "text");
  }

  private renderTablePropsRecentColors(): void {
    this.tablePropsRecentColors.innerHTML = "";
    if (this.recentTablePropColors.length === 0) {
      const empty = document.createElement("span");
      empty.className = "re-table-props-recent-empty";
      empty.textContent = "최근 사용 색상이 없습니다";
      this.tablePropsRecentColors.appendChild(empty);
      return;
    }

    for (const color of this.recentTablePropColors) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "re-table-props-recent-color";
      button.style.backgroundColor = color;
      button.dataset.tablePropsRecentColor = color;
      button.title = color;
      this.tablePropsRecentColors.appendChild(button);
    }
  }

  private pushRecentTablePropColor(rawColor: string): void {
    const normalized = this.normalizeColorToHex(rawColor);
    if (!normalized) {
      return;
    }

    const index = this.recentTablePropColors.indexOf(normalized);
    if (index >= 0) {
      this.recentTablePropColors.splice(index, 1);
    }
    this.recentTablePropColors.unshift(normalized);
    this.recentTablePropColors.splice(10);
    this.renderTablePropsRecentColors();
  }

  private setActiveTablePropsColorFieldFromRole(role: string): void {
    if (role === "tablePropsBorderColor" || role === "tablePropsBorderColorPicker") {
      this.activeTablePropsColorField = "tableBorder";
    }
    if (role === "tablePropsBgColor" || role === "tablePropsBgColorPicker") {
      this.activeTablePropsColorField = "tableBg";
    }
    if (role === "tablePropsRowBgColor" || role === "tablePropsRowBgColorPicker") {
      this.activeTablePropsColorField = "rowBg";
    }
    if (role === "tablePropsCellBorderColor" || role === "tablePropsCellBorderColorPicker") {
      this.activeTablePropsColorField = "cellBorder";
    }
    if (role === "tablePropsCellTextColor" || role === "tablePropsCellTextColorPicker") {
      this.activeTablePropsColorField = "cellText";
    }
    if (role === "tablePropsCellBgColor" || role === "tablePropsCellBgColorPicker") {
      this.activeTablePropsColorField = "cellBg";
    }
    if (role === "tablePropsColBgColor" || role === "tablePropsColBgColorPicker") {
      this.activeTablePropsColorField = "colBg";
    }
  }

  private applyRecentTablePropsColor(color: string): void {
    if (this.activeTablePropsColorField === "tableBorder") {
      this.tablePropsBorderColorInput.value = color;
      this.syncTablePropsColorPair("tableBorder", "text");
      return;
    }

    if (this.activeTablePropsColorField === "tableBg") {
      this.tablePropsBgColorInput.value = color;
      this.syncTablePropsColorPair("tableBg", "text");
      return;
    }

    if (this.activeTablePropsColorField === "rowBg") {
      this.tablePropsRowBgColorInput.value = color;
      this.syncTablePropsColorPair("rowBg", "text");
      return;
    }

    if (this.activeTablePropsColorField === "cellBorder") {
      this.tablePropsCellBorderColorInput.value = color;
      this.syncTablePropsColorPair("cellBorder", "text");
      return;
    }

    if (this.activeTablePropsColorField === "cellText") {
      this.tablePropsCellTextColorInput.value = color;
      this.syncTablePropsColorPair("cellText", "text");
      return;
    }

    if (this.activeTablePropsColorField === "cellBg") {
      this.tablePropsCellBgColorInput.value = color;
      this.syncTablePropsColorPair("cellBg", "text");
      return;
    }

    this.tablePropsColBgColorInput.value = color;
    this.syncTablePropsColorPair("colBg", "text");
  }

  private resetTablePropsDialogInputs(): void {
    if (!this.activeTablePropsMode) {
      return;
    }

    if (this.activeTablePropsMode === "table") {
      this.tablePropsWidthInput.value = "";
      this.tablePropsBorderWidthInput.value = "";
      this.tablePropsBorderColorInput.value = "";
      this.tablePropsBgColorInput.value = "";
      this.tablePropsAlignSelect.value = "left";
      this.syncTablePropsColorPair("tableBorder", "text");
      this.syncTablePropsColorPair("tableBg", "text");
    }

    if (this.activeTablePropsMode === "row") {
      this.tablePropsRowHeightInput.value = "";
      this.tablePropsRowBgColorInput.value = "";
      this.tablePropsRowVAlignSelect.value = "top";
      this.syncTablePropsColorPair("rowBg", "text");
    }

    if (this.activeTablePropsMode === "cell") {
      this.tablePropsCellBorderWidthInput.value = "";
      this.tablePropsCellBorderStyleSelect.value = "solid";
      this.tablePropsCellBorderTopInput.value = "";
      this.tablePropsCellBorderRightInput.value = "";
      this.tablePropsCellBorderBottomInput.value = "";
      this.tablePropsCellBorderLeftInput.value = "";
      this.tablePropsCellPaddingInput.value = "";
      this.tablePropsCellPaddingRange.value = "12";
      this.tablePropsCellBorderColorInput.value = "";
      this.tablePropsCellTextColorInput.value = "";
      this.tablePropsCellBgColorInput.value = "";
      this.tablePropsCellAlignSelect.value = "left";
      this.tablePropsCellVAlignSelect.value = "top";
      this.tablePropsCellWrapSelect.value = "normal";
      this.syncTablePropsColorPair("cellBorder", "text");
      this.syncTablePropsColorPair("cellText", "text");
      this.syncTablePropsColorPair("cellBg", "text");
    }

    if (this.activeTablePropsMode === "col") {
      this.tablePropsColWidthInput.value = "";
      this.tablePropsColBgColorInput.value = "";
      this.tablePropsColAlignSelect.value = "left";
      this.syncTablePropsColorPair("colBg", "text");
    }

    this.previewTablePropsDialog();
  }

  private startTablePropsSession(
    mode: "table" | "row" | "cell" | "col",
    table: HTMLTableElement,
    row: HTMLTableRowElement | null = null,
    col = -1,
    cell: HTMLTableCellElement | null = null,
    cells: HTMLTableCellElement[] = [],
  ): void {
    this.clearTablePropsSession();
    this.tablePropsSessionTable = table;
    this.tablePropsSessionRow = row ?? this.getSelectedCell()?.parentElement as HTMLTableRowElement | null;
    this.tablePropsSessionCell = cell ?? this.getSelectedCell();
    this.tablePropsSessionCells = cells.filter((target) => target.isConnected);

    if (col >= 0) {
      this.tablePropsSessionCol = col;
    } else {
      const selected = this.getSelectedCell();
      const tableData = selected ? this.buildTableMatrix(table) : null;
      const anchor = selected && tableData ? tableData.anchors.get(selected) : null;
      this.tablePropsSessionCol = anchor?.col ?? -1;
    }

    const targets: HTMLElement[] = [table];
    for (const tableCell of Array.from(table.querySelectorAll("td,th"))) {
      targets.push(tableCell as HTMLElement);
    }
    this.captureTablePropsSnapshot(targets);
    this.setTablePropsMode(mode);
  }

  private cancelTablePropsDialog(): void {
    this.restoreTablePropsSnapshot();
    this.setTablePropsValidation("");
    this.hideTablePropsDialog();
    this.clearTablePropsSession();
  }

  private exec(command: string, value?: string): void {
    if (command === "undo" && this.applyMergeUndoSnapshot()) {
      return;
    }

    if (command === "redo" && this.applyMergeRedoSnapshot()) {
      return;
    }

    this.focusEditor();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, value);
    this.captureSelection();
    this.debouncedSave();
    this.updateToolbarState();
  }

  private pushMergeUndoSnapshot(beforeHtml: string): void {
    const afterHtml = this.editor.innerHTML;
    if (beforeHtml === afterHtml) {
      return;
    }

    this.mergeUndoSnapshots.push(beforeHtml);
    if (this.mergeUndoSnapshots.length > 50) {
      this.mergeUndoSnapshots.shift();
    }
    this.mergeRedoSnapshots.length = 0;
  }

  private restoreEditorFromMergeSnapshot(html: string): void {
    this.editor.innerHTML = html;

    const tables = Array.from(this.editor.querySelectorAll("table.re-table")) as HTMLTableElement[];
    for (const table of tables) {
      this.enableTableColumnResize(table);
    }

    this.clearSelectedCells();
    this.keyboardAnchorCell = null;
    this.keyboardFocusCell = null;
    this.lastTableAnchorCell = null;
    this.setActiveTableElement(null);
    this.captureSelection();
    this.updateToolbarState();
    this.debouncedSave();
  }

  private applyMergeUndoSnapshot(): boolean {
    const snapshot = this.mergeUndoSnapshots.pop();
    if (!snapshot) {
      return false;
    }

    this.mergeRedoSnapshots.push(this.editor.innerHTML);
    this.restoreEditorFromMergeSnapshot(snapshot);
    this.showSaveStatus("Merge undo applied");
    return true;
  }

  private applyMergeRedoSnapshot(): boolean {
    const snapshot = this.mergeRedoSnapshots.pop();
    if (!snapshot) {
      return false;
    }

    this.mergeUndoSnapshots.push(this.editor.innerHTML);
    this.restoreEditorFromMergeSnapshot(snapshot);
    this.showSaveStatus("Merge redo applied");
    return true;
  }

  private focusEditor(): void {
    if (document.activeElement !== this.editor) {
      this.editor.focus();
    }
  }

  // 현재 selection을 저장한다.
  // collapsed/expanded 여부에 따라 savedRange, lastExpandedRange를 관리한다.
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

  // 툴바 클릭 등으로 selection이 유실된 경우 편집 범위를 복원한다.
  // toolbarInteractionRange -> savedRange 순으로 우선 사용한다.
  private restoreSelection(allowExpandedFallback = true): void {
    // 우선순위:
    // 1) 툴바 클릭 직전에 캡처한 toolbarInteractionRange
    // 2) 일반 편집 중 캡처된 savedRange
    // 이 순서를 지켜야 툴바 클릭으로 focus가 이동해도 원래 편집 위치를 잃지 않는다.
    let sourceRange = this.toolbarInteractionRange?.cloneRange() ?? this.savedRange?.cloneRange() ?? null;
    if (
      allowExpandedFallback
      &&
      sourceRange
      && sourceRange.collapsed
      && this.lastExpandedRange
      && this.editor.contains(this.lastExpandedRange.commonAncestorContainer)
    ) {
      // 색상 팔레트처럼 "직전 선택 영역"을 재사용하는 UX를 위해,
      // collapse 상태일 때는 마지막 expanded range를 fallback으로 허용한다.
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

  // 에디터 내부에서 유효한 현재 range를 반환한다.
  // 실시간 selection이 없으면 저장해둔 savedRange를 fallback으로 사용한다.
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

  // 선택 범위(또는 caret)에 직접 스타일을 적용한다.
  // collapsed 범위는 zero-width 문자 래핑으로 "다음 입력 스타일"을 유지한다.
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
      const block = this.getSelectionBlock();
      const blockTag = block?.tagName.toLowerCase() ?? "";
      const isTextBlock = /^(p|div|li|blockquote|h1|h2|h3|h4|h5|h6)$/.test(blockTag);
      const isEditorRootContext = !block || block === this.editor || blockTag === "article";

      if (isEditorRootContext) {
        // editor 루트(article/div)에서 collapsed 스타일을 span으로 주입하면
        // zero-width 노드가 루트에 남아 이후 경계 이동/붙여넣기 흐름을 흔든다.
        // 이 경우 현재 캐럿 위치에 문단 블록을 만들고 블록에 스타일을 적용한다.
        const paragraph = document.createElement("p");
        range.insertNode(paragraph);
        this.setStylePriority(paragraph, styleProp, value);

        const blockRange = document.createRange();
        blockRange.selectNodeContents(paragraph);
        blockRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(blockRange);

        this.captureSelection();
        this.debouncedSave();
        this.updateToolbarState();
        this.debugLog(`applyStyleToSelection collapsed block-applied prop=${styleProp} block=p created=true`);
        return;
      }

      const isEmptyTextBlock = Boolean(
        block
        && isTextBlock
        && !this.isMeaningfulEditableText(block.textContent ?? "")
        && !block.querySelector("img,table,.re-image-wrap"),
      );

      // 빈 줄에서 collapsed 스타일 적용 시 span(zero-width marker)을 만들면
      // 이후 테이블 경계 이동에서 빈 inline 노드로 커서가 들어가는 현상이 생길 수 있다.
      // 이 경우에는 블록 자체에 스타일을 적용해 caret 이동 안정성을 유지한다.
      if (isEmptyTextBlock && block) {
        this.setStylePriority(block, styleProp, value);

        const blockRange = document.createRange();
        blockRange.selectNodeContents(block);
        blockRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(blockRange);

        this.captureSelection();
        this.debouncedSave();
        this.updateToolbarState();
        this.debugLog(`applyStyleToSelection collapsed block-applied prop=${styleProp} block=${blockTag}`);
        return;
      }

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

    // collapsed면 현재 블록 1개, expanded면 교차하는 블록 전체에 line-height를 적용한다.
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

    let base: HTMLElement = element;
    if (base === this.editor || base.tagName.toLowerCase() === "article") {
      const activeRange = this.getActiveEditorRange();
      const boundaryCandidate = activeRange ? this.getRangeStartContainerElement(activeRange) : null;
      if (boundaryCandidate) {
        base = boundaryCandidate;
      }
    }

    return (base.closest("li,p,div,h1,h2,h3,h4,h5,h6,blockquote,td,th") ?? base) as HTMLElement;
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
        // 색상은 "직전 선택 텍스트"에 적용하려는 기대가 커서,
        // collapse 상태면 expanded 선택 범위를 다시 살려 적용을 시도한다.
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
    this.debugPanel.textContent = next.split("\n").slice(0, 40).join("\n");
  }

  private async copyDebugLogText(): Promise<void> {
    const text = (this.debugPanel.textContent ?? "").trim();
    if (!text) {
      this.showSaveStatus("Debug log is empty");
      return;
    }

    let copied = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
      textarea.remove();
    }

    if (copied) {
      this.showSaveStatus("Debug log copied");
      this.debugLog(`debug log copied lines=${text.split("\n").length}`);
      return;
    }

    this.showSaveStatus("Debug copy failed");
    this.debugLog("debug log copy failed");
  }

  private clearDebugLogText(): void {
    this.debugPanel.textContent = "";
    this.showSaveStatus("Debug log cleared");
  }

  // data-table 액션 문자열을 실제 메서드 호출로 라우팅한다.
  private handleTableAction(action: TableAction): void {
    if (action === "insert") {
      this.toggleTableSizePicker();
      return;
    }

    if (action === "tableProps") {
      this.applyTableProperties();
      return;
    }

    if (action === "rowProps") {
      this.applyRowProperties();
      return;
    }

    if (action === "cellProps") {
      this.applyCellProperties();
      return;
    }

    if (action === "colProps") {
      this.applyColumnProperties();
      return;
    }

    if (action === "addRow" || action === "addRowBelow") {
      this.addRow();
      return;
    }

    if (action === "addRowAbove") {
      this.addRow("before");
      return;
    }

    if (action === "addCol" || action === "addColRight") {
      this.addCol();
      return;
    }

    if (action === "addColLeft") {
      this.addCol("before");
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

  // 지정한 크기의 기본 테이블을 현재 커서 위치에 삽입한다.
  // 삽입 후 이어쓰기 가능한 문단을 하나 추가한다.
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

    this.insertTableNodeAtCaret(table);
    this.insertTrailingParagraphAfterTopLevelAnchor(table);
    this.normalizeTopLevelParagraphs();
    this.enableTableColumnResize(table);
    this.debouncedSave();
  }

  private insertWeeklyReportTemplate(): void {
    const temp = document.createElement("div");
    temp.innerHTML = this.getWeeklyReportTemplateHtml().trim();

    const nodes = Array.from(temp.childNodes);
    if (nodes.length === 0) {
      return;
    }

    const tables = Array.from(temp.querySelectorAll("table.re-table")) as HTMLTableElement[];
    this.insertNodesAtCaret(nodes);

    for (const table of tables) {
      this.enableTableColumnResize(table);
    }

    const tailAnchor = tables.at(-1) ?? (nodes.at(-1) as Node | undefined) ?? null;
    if (tailAnchor) {
      this.insertTrailingParagraphAfterTopLevelAnchor(tailAnchor);
    }

    this.normalizeTopLevelParagraphs();
    const focusCell = tables[1]?.querySelector("td:not(.re-report-accent)") as HTMLTableCellElement | null;
    if (focusCell) {
      this.placeCaretInCell(focusCell, "start");
      const focusTable = focusCell.closest("table") as HTMLTableElement | null;
      this.setActiveTableElement(focusTable);
      this.keyboardAnchorCell = focusCell;
      this.keyboardFocusCell = focusCell;
      this.lastTableAnchorCell = focusCell;
      this.captureSelection();
      this.debugLog(`weekly template inserted focus=${this.describeCell(focusCell)} table=${focusTable ? "main" : "none"}`);
    }
    this.debouncedSave();
  }

  private getWeeklyReportTemplateHtml(): string {
    return `
      <h2 class="re-report-title">주간 업무보고서</h2>
      <table class="re-table re-report-sign-table">
        <tr>
          <td class="re-report-sign-head">담</td>
          <td class="re-report-sign-head">당</td>
          <td class="re-report-sign-head"></td>
          <td class="re-report-sign-head"></td>
        </tr>
        <tr>
          <td class="re-report-sign-body"></td>
          <td class="re-report-sign-body"></td>
          <td class="re-report-sign-body"></td>
          <td class="re-report-sign-body"></td>
        </tr>
      </table>
      <table class="re-table re-report-main-table">
        <tr>
          <td class="re-report-accent re-table-header-cell">기 간</td>
          <td colspan="2">20 년 8월 14일 ~ 20 년 8월 18일</td>
          <td class="re-table-header-cell">보고자</td>
          <td>김민지</td>
        </tr>
        <tr>
          <td class="re-report-accent re-table-header-cell">구 분</td>
          <td class="re-report-day-col re-table-header-cell">요일</td>
          <td class="re-table-header-cell">업무명</td>
          <td colspan="2" class="re-table-header-cell">업무실적</td>
        </tr>
        <tr>
          <td rowspan="6" class="re-report-accent re-report-section-cell re-table-header-cell">금주<br>업무실적</td>
          <td class="re-report-day-col">월</td>
          <td>- 주간 생산 스케줄 확인 및 조정<br>- 원재료 재고 현황 확인</td>
          <td colspan="2">- 스케줄 정상 조정 완료<br>- 5톤 부족</td>
        </tr>
        <tr>
          <td class="re-report-day-col">화</td>
          <td>- 제품 품질 점검<br>- 신제품 생산 라인 시험생산</td>
          <td colspan="2">- 3개 불량 발견<br>- 시험생산 정상 진행</td>
        </tr>
        <tr>
          <td class="re-report-day-col">수</td>
          <td>- 작업자 안전 교육 진행<br>- 생산 공정 최적화 회의</td>
          <td colspan="2">- 전체 인원 참석<br>- 2개 공정 개선안 도출</td>
        </tr>
        <tr>
          <td class="re-report-day-col">목</td>
          <td>- 제품 배송 준비<br>- 생산량 및 품질 보고서 작성</td>
          <td colspan="2">- 500개 제품 배송 준비 완료<br>- 보고서 초안 완성</td>
        </tr>
        <tr>
          <td class="re-report-day-col">금</td>
          <td>- 원재료 발주 계획<br>- 주간 생산 결과 회의</td>
          <td colspan="2">- 발주 계획서 작성 완료<br>- 주요 이슈 3개 도출</td>
        </tr>
        <tr>
          <td class="re-report-day-col">시간외</td>
          <td>기계 유지보수</td>
          <td colspan="2">2대 기계 보수 완료</td>
        </tr>
        <tr>
          <td class="re-report-accent re-report-section-cell re-table-header-cell">다음주<br>업무계획</td>
          <td colspan="4" class="re-report-bullets-cell">- 원재료 5톤 추가 발주 진행<br>- 불량 제품 원인 분석 및 개선 방안 마련<br>- 생산 공정 개선안 적용 및 효과 검증<br>- 안전 교육 내용 재점검 및 추가 교육 계획</td>
        </tr>
        <tr>
          <td colspan="2" class="re-table-header-cell">업무지시 및 추진사항</td>
          <td colspan="3" class="re-table-header-cell">애로 및 건의사항</td>
        </tr>
        <tr>
          <td colspan="2" class="re-report-note-cell">- 원재료 부족 문제에 대한 재고 관리 시스템 개선 요청<br>- 불량 제품에 대한 피드백을 품질 관리팀에 전달<br>- 다음주 중요한 생산 팀 강화 계획</td>
          <td colspan="3" class="re-report-note-cell">- 원재료 재고 관리 시스템의 정확성 문제 개선 필요<br>- 품질 점검 시간을 더 확보할 필요성 제기</td>
        </tr>
      </table>
    `;
  }

  private getSelectedCell(): HTMLTableCellElement | null {
    const range = this.getActiveEditorRange();
    if (!range) {
      return Array.from(this.selectedCells).find((cell) => cell.isConnected) ?? null;
    }

    const findCellFromNode = (node: Node | null): HTMLTableCellElement | null => {
      if (!node) {
        return null;
      }
      const element = node instanceof HTMLElement ? node : node.parentElement;
      return (element?.closest("td, th") as HTMLTableCellElement | null) ?? null;
    };

    const direct = findCellFromNode(range.startContainer);
    if (direct) {
      return direct;
    }

    // 브라우저가 caret을 상위 컨테이너(startContainer=div/p 등)로 잡는 경우,
    // startOffset 인접 노드를 함께 검사해 실제 셀 컨텍스트를 복원한다.
    const container = range.startContainer;
    if (container instanceof HTMLElement) {
      const idx = range.startOffset;
      const candidates: Node[] = [];
      if (idx >= 0 && idx < container.childNodes.length) {
        candidates.push(container.childNodes[idx]);
      }
      if (idx - 1 >= 0 && idx - 1 < container.childNodes.length) {
        candidates.push(container.childNodes[idx - 1]);
      }
      if (idx + 1 >= 0 && idx + 1 < container.childNodes.length) {
        candidates.push(container.childNodes[idx + 1]);
      }

      for (const candidate of candidates) {
        const probed = findCellFromNode(candidate);
        if (probed) {
          return probed;
        }
      }
    }

    return Array.from(this.selectedCells).find((cell) => cell.isConnected) ?? null;
  }

  // 아래 메서드들은 table-ops 모듈로 위임해 파일 복잡도를 낮췄다.
  private addRow(side: "before" | "after" = "after"): void {
    const cell = this.getSelectedCell();
    this.debugLog(`table op addRow side=${side} target=${cell ? this.describeCell(cell) : "none"}`);
    addRowOp(this as unknown as Record<string, unknown>, side);
  }

  private addCol(side: "before" | "after" = "after"): void {
    const cell = this.getSelectedCell();
    this.debugLog(`table op addCol side=${side} target=${cell ? this.describeCell(cell) : "none"}`);
    addColOp(this as unknown as Record<string, unknown>, side);
  }

  private deleteRow(): void {
    const cell = this.getSelectedCell();
    this.debugLog(`table op deleteRow target=${cell ? this.describeCell(cell) : "none"}`);
    deleteRowOp(this as unknown as Record<string, unknown>);
  }

  private deleteCol(): void {
    const cell = this.getSelectedCell();
    this.debugLog(`table op deleteCol target=${cell ? this.describeCell(cell) : "none"}`);
    deleteColOp(this as unknown as Record<string, unknown>);
  }

  private deleteTable(): void {
    const cell = this.getSelectedCell();
    this.debugLog(`table op deleteTable target=${cell ? this.describeCell(cell) : "none"}`);
    deleteTableOp(this as unknown as Record<string, unknown>);
  }

  private applyTableProperties(): void {
    const cell = this.getSelectedCell();
    const table = cell?.closest("table") as HTMLTableElement | null;
    if (!table) {
      this.showSaveStatus("Table properties: no active table");
      return;
    }

    this.startTablePropsSession("table", table);

    this.tablePropsWidthInput.value = table.style.width || "";
    this.tablePropsBorderWidthInput.value = table.style.borderWidth?.replace("px", "") || "";
    this.tablePropsBorderColorInput.value = table.style.borderColor || "";
    this.tablePropsBgColorInput.value = table.style.backgroundColor || "";
    const currentAlign = (table.style.marginLeft === "auto" && table.style.marginRight === "auto")
      ? "center"
      : (table.style.marginLeft === "auto" ? "right" : "left");
    this.tablePropsAlignSelect.value = currentAlign;
    this.syncTablePropsColorPair("tableBorder", "text");
    this.syncTablePropsColorPair("tableBg", "text");
    this.activeTablePropsColorField = "tableBg";

    this.setTablePropsValidation("");
    this.updateTablePropsSummary();
    this.showTablePropsDialog();
  }

  private applyRowProperties(): void {
    const cell = this.getSelectedCell();
    const row = cell?.parentElement as HTMLTableRowElement | null;
    if (!cell || !row) {
      this.showSaveStatus("Row properties: no active row");
      return;
    }

    this.startTablePropsSession("row", row.closest("table") as HTMLTableElement, row);

    const firstCell = row.cells[0] as HTMLTableCellElement | undefined;
    this.tablePropsRowHeightInput.value = firstCell?.style.height?.replace("px", "") || "";
    this.tablePropsRowBgColorInput.value = firstCell?.style.backgroundColor || "";
    this.tablePropsRowVAlignSelect.value = firstCell?.style.verticalAlign || "top";
    this.syncTablePropsColorPair("rowBg", "text");
    this.activeTablePropsColorField = "rowBg";

    this.setTablePropsValidation("");
    this.updateTablePropsSummary();
    this.showTablePropsDialog();
  }

  private applyCellProperties(): void {
    const cell = this.getSelectedCell()
      ?? (this.keyboardFocusCell?.isConnected ? this.keyboardFocusCell : null)
      ?? (this.keyboardAnchorCell?.isConnected ? this.keyboardAnchorCell : null)
      ?? Array.from(this.selectedCells).find((selected) => selected.isConnected)
      ?? null;
    const table = cell?.closest("table") as HTMLTableElement | null;
    if (!cell || !table) {
      this.showSaveStatus("Cell properties: no active cell");
      return;
    }

    const targets = this.getTablePropsCellTargets(cell);

    this.startTablePropsSession("cell", table, cell.parentElement as HTMLTableRowElement | null, -1, cell, targets);

    this.tablePropsCellBorderWidthInput.value = cell.style.borderWidth?.replace("px", "") || "";
    this.tablePropsCellBorderStyleSelect.value = cell.style.borderStyle || "solid";
    this.tablePropsCellBorderTopInput.value = cell.style.borderTopWidth?.replace("px", "") || "";
    this.tablePropsCellBorderRightInput.value = cell.style.borderRightWidth?.replace("px", "") || "";
    this.tablePropsCellBorderBottomInput.value = cell.style.borderBottomWidth?.replace("px", "") || "";
    this.tablePropsCellBorderLeftInput.value = cell.style.borderLeftWidth?.replace("px", "") || "";
    this.tablePropsCellPaddingInput.value = cell.style.padding?.replace("px", "") || "";
    this.tablePropsCellPaddingRange.value = this.tablePropsCellPaddingInput.value || "12";
    this.tablePropsCellBorderColorInput.value = cell.style.borderColor || "";
    this.tablePropsCellTextColorInput.value = cell.style.color || "";
    this.tablePropsCellBgColorInput.value = cell.style.backgroundColor || "";
    this.tablePropsCellAlignSelect.value = cell.style.textAlign || "left";
    this.tablePropsCellVAlignSelect.value = cell.style.verticalAlign || "top";
    this.tablePropsCellWrapSelect.value = cell.style.whiteSpace === "nowrap"
      ? "nowrap"
      : (cell.style.overflowWrap === "anywhere" ? "break-word" : "normal");
    this.syncTablePropsColorPair("cellBorder", "text");
    this.syncTablePropsColorPair("cellText", "text");
    this.syncTablePropsColorPair("cellBg", "text");
    this.activeTablePropsColorField = "cellBg";

    this.setTablePropsValidation("");
    this.updateTablePropsSummary();
    this.showTablePropsDialog();
  }

  private applyColumnProperties(): void {
    const cell = this.getSelectedCell();
    const table = cell?.closest("table") as HTMLTableElement | null;
    if (!cell || !table) {
      this.showSaveStatus("Column properties: no active column");
      return;
    }

    const tableData = this.buildTableMatrix(table);
    const anchor = tableData.anchors.get(cell);
    if (!anchor) {
      this.showSaveStatus("Column properties: missing anchor");
      return;
    }

    this.startTablePropsSession("col", table, null, anchor.col);

    const sampleCell = tableData.matrix[anchor.row]?.[anchor.col] ?? cell;
    this.tablePropsColWidthInput.value = sampleCell.style.minWidth?.replace("px", "") || "";
    this.tablePropsColBgColorInput.value = sampleCell.style.backgroundColor || "";
    this.tablePropsColAlignSelect.value = sampleCell.style.textAlign || "left";
    this.syncTablePropsColorPair("colBg", "text");
    this.activeTablePropsColorField = "colBg";

    this.setTablePropsValidation("");
    this.updateTablePropsSummary();
    this.showTablePropsDialog();
  }

  private previewTablePropsDialog(): void {
    this.updateTablePropsSummary();
    const error = this.validateTablePropsInputs();
    this.setTablePropsValidation(error);
    if (error.length > 0) {
      return;
    }
    this.applyTablePropsFromDialog(true);
  }

  private switchTablePropsMode(mode: "table" | "row" | "cell" | "col"): void {
    if (!this.tablePropsSessionTable || !this.tablePropsSessionTable.isConnected) {
      return;
    }

    if (mode === "row" && !this.tablePropsSessionRow) {
      this.showSaveStatus("행 컨텍스트를 찾을 수 없습니다");
      return;
    }

    if (mode === "col" && this.tablePropsSessionCol < 0) {
      this.showSaveStatus("열 컨텍스트를 찾을 수 없습니다");
      return;
    }

    if (mode === "cell" && this.tablePropsSessionCells.length === 0 && !this.tablePropsSessionCell) {
      this.showSaveStatus("셀 컨텍스트를 찾을 수 없습니다");
      return;
    }

    this.setTablePropsMode(mode);
    this.setTablePropsValidation("");
    this.previewTablePropsDialog();
  }

  private applyTablePropsDialog(): void {
    this.updateTablePropsSummary();
    const error = this.validateTablePropsInputs();
    this.setTablePropsValidation(error);
    if (error.length > 0) {
      this.showSaveStatus("속성 입력값을 확인해주세요");
      return;
    }

    const applied = this.applyTablePropsFromDialog(false);
    if (!applied) {
      this.showSaveStatus("Table properties: no active target");
      this.hideTablePropsDialog();
      this.clearTablePropsSession();
      return;
    }

    this.captureSelection();
    this.debouncedSave();
    if (this.selectedCells.size > 1) {
      this.clearSelectedCells();
    }
    this.setTablePropsValidation("");
    this.hideTablePropsDialog();
    this.clearTablePropsSession();
  }

  private applyTablePropsFromDialog(preview: boolean): boolean {
    const table = this.tablePropsSessionTable;
    const mode = this.activeTablePropsMode;
    if (!table || !table.isConnected || !mode) {
      return false;
    }

    if (mode === "table") {
      const nextWidth = this.normalizeCssSizeInput(this.tablePropsWidthInput.value, { allowPercent: true, allowAuto: true });
      const nextBorderSize = this.normalizeCssSizeInput(this.tablePropsBorderWidthInput.value);
      const nextBorderColor = this.normalizeColorInput(this.tablePropsBorderColorInput.value);
      const nextBgColor = this.normalizeColorInput(this.tablePropsBgColorInput.value);
      const nextAlign = this.tablePropsAlignSelect.value;

      table.style.width = nextWidth;
      table.style.backgroundColor = nextBgColor;
      if (nextBorderSize.length > 0) {
        table.style.borderWidth = /^\d+$/.test(nextBorderSize) ? `${nextBorderSize}px` : nextBorderSize;
      } else {
        table.style.removeProperty("border-width");
      }
      table.style.borderStyle = "solid";
      table.style.borderColor = nextBorderColor;

      if (nextAlign === "center") {
        table.style.marginLeft = "auto";
        table.style.marginRight = "auto";
      } else if (nextAlign === "right") {
        table.style.marginLeft = "auto";
        table.style.marginRight = "0";
      } else {
        table.style.marginLeft = "0";
        table.style.marginRight = "auto";
      }

      for (const tableCell of Array.from(table.querySelectorAll("td,th"))) {
        const currentCell = tableCell as HTMLTableCellElement;
        currentCell.style.borderStyle = "solid";
        if (nextBorderSize.length > 0) {
          currentCell.style.borderWidth = /^\d+$/.test(nextBorderSize) ? `${nextBorderSize}px` : nextBorderSize;
        }
        if (nextBorderColor.length > 0) {
          currentCell.style.borderColor = nextBorderColor;
        }
        this.applyTableCellBackground(currentCell, nextBgColor);
      }

      this.enableTableColumnResize(table);
      this.pushRecentTablePropColor(nextBorderColor);
      this.pushRecentTablePropColor(nextBgColor);
      if (!preview) {
        this.showSaveStatus("Table properties applied");
        this.debugLog(`table props apply width='${nextWidth}' border='${nextBorderSize}' color='${nextBorderColor}' bg='${nextBgColor}' align='${nextAlign}'`);
      }
    }

    if (mode === "row") {
      const row = this.tablePropsSessionRow;
      if (!row || !row.isConnected) {
        return false;
      }
      const nextHeight = this.normalizeCssSizeInput(this.tablePropsRowHeightInput.value);
      const nextBg = this.normalizeColorInput(this.tablePropsRowBgColorInput.value);
      const nextAlign = this.tablePropsRowVAlignSelect.value;

      for (const rowCell of Array.from(row.cells)) {
        const currentCell = rowCell as HTMLTableCellElement;
        if (nextHeight.length > 0) {
          currentCell.style.height = /^\d+$/.test(nextHeight) ? `${nextHeight}px` : nextHeight;
        }
        this.applyTableCellBackground(currentCell, nextBg);
        if (nextAlign === "top" || nextAlign === "middle" || nextAlign === "bottom") {
          currentCell.style.verticalAlign = nextAlign;
        }
      }

      if (!preview) {
        this.pushRecentTablePropColor(nextBg);
        this.showSaveStatus("Row properties applied");
        this.debugLog(`row props apply row=${row.rowIndex} height='${nextHeight}' bg='${nextBg}' valign='${nextAlign}'`);
      }
    }

    if (mode === "cell") {
      const targets = this.tablePropsSessionCells.filter((target) => target.isConnected);
      if (targets.length === 0) {
        return false;
      }

      const nextBorderWidth = this.normalizeCssSizeInput(this.tablePropsCellBorderWidthInput.value);
      const nextBorderStyle = this.tablePropsCellBorderStyleSelect.value;
      const nextBorderTop = this.normalizeCssSizeInput(this.tablePropsCellBorderTopInput.value);
      const nextBorderRight = this.normalizeCssSizeInput(this.tablePropsCellBorderRightInput.value);
      const nextBorderBottom = this.normalizeCssSizeInput(this.tablePropsCellBorderBottomInput.value);
      const nextBorderLeft = this.normalizeCssSizeInput(this.tablePropsCellBorderLeftInput.value);
      const nextPadding = this.normalizeCssSizeInput(this.tablePropsCellPaddingInput.value);
      const nextBorderColor = this.normalizeColorInput(this.tablePropsCellBorderColorInput.value);
      const nextTextColor = this.normalizeColorInput(this.tablePropsCellTextColorInput.value);
      const nextBg = this.normalizeColorInput(this.tablePropsCellBgColorInput.value);
      const nextAlign = this.tablePropsCellAlignSelect.value;
      const nextVAlign = this.tablePropsCellVAlignSelect.value;
      const nextWrap = this.tablePropsCellWrapSelect.value;

      for (const target of targets) {
        target.style.borderStyle = nextBorderStyle || "solid";
        if (nextBorderWidth.length > 0) {
          target.style.borderWidth = /^\d+$/.test(nextBorderWidth) ? `${nextBorderWidth}px` : nextBorderWidth;
        }
        if (nextBorderTop.length > 0) {
          target.style.borderTopWidth = /^\d+$/.test(nextBorderTop) ? `${nextBorderTop}px` : nextBorderTop;
        }
        if (nextBorderRight.length > 0) {
          target.style.borderRightWidth = /^\d+$/.test(nextBorderRight) ? `${nextBorderRight}px` : nextBorderRight;
        }
        if (nextBorderBottom.length > 0) {
          target.style.borderBottomWidth = /^\d+$/.test(nextBorderBottom) ? `${nextBorderBottom}px` : nextBorderBottom;
        }
        if (nextBorderLeft.length > 0) {
          target.style.borderLeftWidth = /^\d+$/.test(nextBorderLeft) ? `${nextBorderLeft}px` : nextBorderLeft;
        }
        if (nextPadding.length > 0) {
          target.style.padding = /^\d+$/.test(nextPadding) ? `${nextPadding}px` : nextPadding;
        }
        if (nextBorderColor.length > 0) {
          target.style.borderColor = nextBorderColor;
        }
        if (nextTextColor.length > 0) {
          target.style.color = nextTextColor;
        }
        this.applyTableCellBackground(target, nextBg);
        if (nextAlign === "left" || nextAlign === "center" || nextAlign === "right") {
          target.style.textAlign = nextAlign;
        }
        if (nextVAlign === "top" || nextVAlign === "middle" || nextVAlign === "bottom") {
          target.style.verticalAlign = nextVAlign;
        }

        if (nextWrap === "nowrap") {
          target.style.whiteSpace = "nowrap";
          target.style.overflowWrap = "normal";
        } else if (nextWrap === "break-word") {
          target.style.whiteSpace = "normal";
          target.style.overflowWrap = "anywhere";
        } else {
          target.style.whiteSpace = "normal";
          target.style.overflowWrap = "normal";
        }
      }

      if (!preview) {
        this.pushRecentTablePropColor(nextBorderColor);
        this.pushRecentTablePropColor(nextTextColor);
        this.pushRecentTablePropColor(nextBg);
        this.showSaveStatus("Cell properties applied");
        this.debugLog(
          `cell props apply border='${nextBorderWidth}' style='${nextBorderStyle}' sides='${nextBorderTop}/${nextBorderRight}/${nextBorderBottom}/${nextBorderLeft}' padding='${nextPadding}' borderColor='${nextBorderColor}' text='${nextTextColor}' bg='${nextBg}' align='${nextAlign}' valign='${nextVAlign}' wrap='${nextWrap}' targets=${targets.length}`,
        );
      }
    }

    if (mode === "col") {
      if (this.tablePropsSessionCol < 0) {
        return false;
      }

      const nextWidth = this.normalizeCssSizeInput(this.tablePropsColWidthInput.value);
      const nextBg = this.normalizeColorInput(this.tablePropsColBgColorInput.value);
      const nextAlign = this.tablePropsColAlignSelect.value;
      const targets = this.collectColumnTargets(table, this.tablePropsSessionCol);

      for (const target of targets) {
        if (nextWidth.length > 0) {
          target.style.minWidth = /^\d+$/.test(nextWidth) ? `${nextWidth}px` : nextWidth;
        }
        this.applyTableCellBackground(target, nextBg);
        if (nextAlign === "left" || nextAlign === "center" || nextAlign === "right") {
          target.style.textAlign = nextAlign;
        }
      }

      this.enableTableColumnResize(table);
      if (!preview) {
        this.pushRecentTablePropColor(nextBg);
        this.showSaveStatus("Column properties applied");
        this.debugLog(`col props apply col=${this.tablePropsSessionCol} width='${nextWidth}' bg='${nextBg}' align='${nextAlign}' targets=${targets.length}`);
      }
    }

    return true;
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
    const beforeHtml = this.editor.innerHTML;
    mergeCellsOp(this as unknown as Record<string, unknown>);
    this.pushMergeUndoSnapshot(beforeHtml);
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
    if (!activeCell) {
      // selectionchange 타이밍에 activeCell 해석이 일시적으로 실패할 수 있다.
      // 이 경우 다중 셀 선택을 즉시 비우면 Shift+Arrow 확장 UX가 깨진다.
      return;
    }

    this.lastTableAnchorCell = activeCell;
    if (this.selectedCells.has(activeCell)) {
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
    const beforeHtml = this.editor.innerHTML;
    unmergeCellOp(this as unknown as Record<string, unknown>);
    this.pushMergeUndoSnapshot(beforeHtml);
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

    // 행 높이를 텍스트 크기에 비례해 계산하되, 사용성 저하를 막기 위해 하한 28px을 유지한다.
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

  // 셀 내부에서 의미 있는 편집 가능한 시작/끝 위치에 커서를 배치한다.
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
    this.lastTableAnchorCell = cell;
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
    return value.replace(/[\s\u00A0\u202F\u200B\u200C\u200D\u2060\uFEFF]/g, "").length > 0;
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
      // 범위를 정확히 판단할 수 없으면 보수적으로 true를 반환해
      // 셀 이동 로직이 브라우저 기본 동작과 충돌하지 않게 한다.
      return true;
    }

    if (!this.cellHasMeaningfulEditableText(cell)) {
      // 셀이 사실상 빈 상태(<br>만 있음)라면 시작/끝 경계를 동일하게 취급한다.
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

    // 핸들(contentEditable=false) 제외 후 caret 기준으로 의미 있는 후보 노드를 수집한다.
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
      // 완전히 빈 셀이어도 커서 배치가 가능하도록 <br> fallback을 강제한다.
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
      // 핸들보다 앞에 배치해야 caret이 핸들 영역에 갇히지 않는다.
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

  /**
   * 선택된 셀 집합을 직사각형 클립보드 payload(text/html)로 변환한다.
   * Why: 브라우저 기본 copy는 다중 셀 선택 집합을 안정적으로 직렬화하지 못한다.
   * How: selectedCells의 anchor bounds를 계산하고 matrix를 순회해 TSV/HTML 테이블을 구성한다.
   * Pitfall: span으로 덮인 좌표를 그대로 채우면 값이 중복되므로 anchor 좌표가 아닌 칸은 빈 값으로 둔다.
   */
  private buildSelectedCellsClipboardPayload(): {
    text: string;
    html: string;
    rows: number;
    cols: number;
    totalCells: number;
    emptyCells: number;
  } | null {
    if (this.selectedCells.size === 0) {
      this.debugLog("clipboard payload skip: no selected cells");
      return null;
    }

    const selected = Array.from(this.selectedCells);
    const table = selected[0].closest("table") as HTMLTableElement | null;
    if (!table) {
      this.debugLog("clipboard payload skip: selection is not in table");
      return null;
    }
    if (selected.some((cell) => cell.closest("table") !== table)) {
      this.debugLog("clipboard payload skip: selected cells belong to different tables");
      return null;
    }

    const rectInfo = this.getSelectedRectInfo(table);
    if (!rectInfo || !rectInfo.isCompleteRect) {
      this.debugLog(
        `clipboard payload blocked: incomplete rectangle selected=${this.selectedCells.size} rect=${rectInfo ? `${rectInfo.minRow},${rectInfo.minCol}-${rectInfo.maxRow},${rectInfo.maxCol}` : "none"} rectCells=${rectInfo?.cellsInRect.length ?? 0}`,
      );
      return null;
    }

    const tableData = this.buildTableMatrix(table);
    const anchors = selected
      .map((cell) => tableData.anchors.get(cell))
      .filter((item): item is CellAnchor => Boolean(item));
    if (anchors.length !== selected.length) {
      this.debugLog(`clipboard payload skip: anchor mismatch selected=${selected.length} anchors=${anchors.length}`);
      return null;
    }

    const rawMinRow = Math.min(...anchors.map((item) => item.row));
    const rawMaxRow = Math.max(...anchors.map((item) => item.row));
    const rawMinCol = Math.min(...anchors.map((item) => item.col));
    const rawMaxCol = Math.max(...anchors.map((item) => item.col));
    const normalized = this.normalizeRectForSpans(tableData, rawMinRow, rawMaxRow, rawMinCol, rawMaxCol);

    const rows: string[][] = [];
    const sourceCellsByRow: Array<Array<HTMLTableCellElement | null>> = [];
    for (let r = normalized.minRow; r <= normalized.maxRow; r += 1) {
      const rowValues: string[] = [];
      const rowSourceCells: Array<HTMLTableCellElement | null> = [];
      for (let c = normalized.minCol; c <= normalized.maxCol; c += 1) {
        const cell = tableData.matrix[r]?.[c] ?? null;
        if (!cell) {
          rowValues.push("");
          rowSourceCells.push(null);
          continue;
        }

        const anchor = tableData.anchors.get(cell);
        if (!anchor || anchor.row !== r || anchor.col !== c) {
          rowValues.push("");
          rowSourceCells.push(null);
          continue;
        }

        rowValues.push(this.getCellClipboardText(cell));
        rowSourceCells.push(cell);
      }
      rows.push(rowValues);
      sourceCellsByRow.push(rowSourceCells);
    }

    const text = rows.map((row) => row.join("\t")).join("\n");
    const cols = Math.max(0, ...rows.map((row) => row.length));
    const totalCells = rows.reduce((sum, row) => sum + row.length, 0);
    const emptyCells = rows.reduce(
      (sum, row) => sum + row.filter((value) => value.trim().length === 0).length,
      0,
    );
    const htmlTable = document.createElement("table");
    for (let r = 0; r < rows.length; r += 1) {
      const row = rows[r];
      const sourceRowCells = sourceCellsByRow[r] ?? [];
      const tr = document.createElement("tr");
      for (let c = 0; c < row.length; c += 1) {
        const sourceCell = sourceRowCells[c] ?? null;
        if (sourceCell) {
          tr.appendChild(this.buildClipboardStyledCell(sourceCell));
          continue;
        }

        const td = document.createElement("td");
        td.innerHTML = "<br>";
        tr.appendChild(td);
      }
      htmlTable.appendChild(tr);
    }

    const preview = text.slice(0, 180).replace(/\n/g, "\\n").replace(/\t/g, "\\t");
    const shape = rows.map((row) => row.length).join(",");
    this.debugLog(
      `clipboard payload ready rows=${rows.length} cols=${cols} selected=${this.selectedCells.size} empty=${emptyCells}/${totalCells} shape=[${shape}] preview='${preview}'`,
    );
    return { text, html: htmlTable.outerHTML, rows: rows.length, cols, totalCells, emptyCells };
  }

  /**
   * 원본 셀의 텍스트/인라인 서식/셀 style/class를 클립보드용 셀로 복제한다.
   * Why: 기존 textContent 복제만으로는 셀 내부 서식(span, bold 등)과 셀 스타일이 유실된다.
   */
  private buildClipboardStyledCell(sourceCell: HTMLTableCellElement): HTMLTableCellElement {
    const td = document.createElement("td");
    const sourceStyle = sourceCell.getAttribute("style");
    if (sourceStyle !== null) {
      td.setAttribute("style", sourceStyle);
    }

    if (this.isHeaderLikeCell(sourceCell)) {
      td.classList.add("re-table-header-cell");
    }

    const cloned = sourceCell.cloneNode(true) as HTMLTableCellElement;
    for (const handle of Array.from(cloned.querySelectorAll(".re-col-handle, .re-row-handle"))) {
      handle.remove();
    }
    cloned.classList.remove("re-cell-selected", "re-cell-preview", "re-cell-flash", "re-cell-flash-soft", "re-cell-flash-strong");

    td.innerHTML = cloned.innerHTML.trim().length > 0 ? cloned.innerHTML : "<br>";
    return td;
  }

  /**
   * 현재 selectedCells가 테이블 상에서 "완전한 직사각형"인지 계산한다.
   * Why: 다중 셀 copy/paste는 비직사각형 선택에서 구조 손상이 발생하기 쉽다.
   * How: matrix anchor 좌표의 min/max 사각형을 span 기준으로 정규화한 뒤,
   *      그 내부 셀 집합과 selectedCells 집합이 정확히 일치하는지 비교한다.
   * Pitfall: rowspan/colspan이 있는 표는 단순 rowIndex/cellIndex 비교로 오판할 수 있다.
   */
  private getSelectedRectInfo(table: HTMLTableElement): {
    minRow: number;
    maxRow: number;
    minCol: number;
    maxCol: number;
    cellsInRect: HTMLTableCellElement[];
    isCompleteRect: boolean;
  } | null {
    if (this.selectedCells.size === 0) {
      return null;
    }

    const selected = Array.from(this.selectedCells);
    if (selected.some((cell) => cell.closest("table") !== table)) {
      return null;
    }

    const tableData = this.buildTableMatrix(table);
    const anchors = selected
      .map((cell) => tableData.anchors.get(cell))
      .filter((item): item is CellAnchor => Boolean(item));
    if (anchors.length !== selected.length) {
      return null;
    }

    const rawMinRow = Math.min(...anchors.map((item) => item.row));
    const rawMaxRow = Math.max(...anchors.map((item) => item.row));
    const rawMinCol = Math.min(...anchors.map((item) => item.col));
    const rawMaxCol = Math.max(...anchors.map((item) => item.col));
    const normalized = this.normalizeRectForSpans(tableData, rawMinRow, rawMaxRow, rawMinCol, rawMaxCol);
    const cellsInRect = this.collectCellsInRect(
      tableData,
      normalized.minRow,
      normalized.maxRow,
      normalized.minCol,
      normalized.maxCol,
    );

    const isCompleteRect = cellsInRect.length === this.selectedCells.size
      && cellsInRect.every((cell) => this.selectedCells.has(cell));

    this.debugLog(
      `selected rect info tableRows=${table.rows.length} rect=${normalized.minRow},${normalized.minCol}-${normalized.maxRow},${normalized.maxCol} rectCells=${cellsInRect.length} selected=${this.selectedCells.size} complete=${isCompleteRect}`,
    );

    return {
      minRow: normalized.minRow,
      maxRow: normalized.maxRow,
      minCol: normalized.minCol,
      maxCol: normalized.maxCol,
      cellsInRect,
      isCompleteRect,
    };
  }

  /**
   * 개별 셀 텍스트를 TSV 셀 값으로 안전하게 정규화한다.
   * Why: 리사이즈 핸들/zero-width 문자/내부 줄바꿈이 그대로 직렬화되면
   *      탭/줄 구분이 깨져 붙여넣기 grid가 왜곡될 수 있다.
   * How: 복제 노드에서 핸들을 제거하고, 줄바꿈/탭/중복 공백을 축약해 단일 셀 문자열을 만든다.
   */
  private getCellClipboardText(cell: HTMLTableCellElement): string {
    // TSV 직렬화 안정성을 위해 셀 내부 줄바꿈/탭을 공백으로 정규화한다.
    const cloned = cell.cloneNode(true) as HTMLTableCellElement;
    for (const handle of Array.from(cloned.querySelectorAll(".re-col-handle, .re-row-handle"))) {
      handle.remove();
    }

    const raw = cloned.innerText ?? cloned.textContent ?? "";
    return raw
      .replace(/\r\n/g, "\n")
      .replace(/\u200B/g, "")
      .replace(/\n+/g, " ")
      .replace(/\t+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  /**
   * 클립보드에서 2차원 grid payload를 파싱한다.
   * 우선순위:
   * 1) text/html 내 table
   * 2) text/plain TSV
   * Why: 앱 간 복사에서 html table과 plain tsv가 섞여 들어올 수 있다.
   * Pitfall: html table 파싱 시 colspan은 빈 칸으로 확장하지 않으면 열 수가 어긋난다.
   */
  private parseClipboardTableGrid(clipboard: DataTransfer): {
    grid: string[][];
    headerRows: boolean[];
    htmlGrid: Array<Array<string | null>>;
    styleGrid: Array<Array<string | null>>;
    headerCellGrid: Array<Array<boolean | null>>;
  } | null {
    const html = clipboard.getData("text/html")?.trim() ?? "";
    if (html) {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const tables = Array.from(doc.querySelectorAll("table"));
      if (tables.length !== 1) {
        this.debugLog(`clipboard grid skip: html contains tables=${tables.length} (requires single-table-only html)`);
        return null;
      }

      const table = tables[0];
      const bodyClone = doc.body.cloneNode(true) as HTMLElement;
      for (const clonedTable of Array.from(bodyClone.querySelectorAll("table"))) {
        clonedTable.remove();
      }

      const hasMeaningfulOutsideTable = this.isMeaningfulEditableText(bodyClone.textContent ?? "");
      const hasNonTextOutsideTable = Boolean(bodyClone.querySelector("img,.re-image-wrap,hr,ul,ol,blockquote,pre"));
      if (hasMeaningfulOutsideTable || hasNonTextOutsideTable) {
        this.debugLog("clipboard grid skip: html is mixed content (table + other blocks)");
        return null;
      }

      if (table) {
        const grid: string[][] = [];
        const headerRows: boolean[] = [];
        const htmlGrid: Array<Array<string | null>> = [];
        const styleGrid: Array<Array<string | null>> = [];
        const headerCellGrid: Array<Array<boolean | null>> = [];
        for (const row of Array.from(table.rows)) {
          const values: string[] = [];
          const htmlValues: Array<string | null> = [];
          const styleValues: Array<string | null> = [];
          const headerValues: Array<boolean | null> = [];
          headerRows.push(
            Array.from(row.cells).some((cell) => cell.tagName.toLowerCase() === "th" || cell.classList.contains("re-table-header-cell")),
          );
          for (const cell of Array.from(row.cells)) {
            const text = (cell.textContent ?? "").replace(/\r\n/g, "\n");
            values.push(text);
            htmlValues.push(cell.innerHTML ?? null);
            styleValues.push(cell.getAttribute("style"));
            headerValues.push(cell.tagName.toLowerCase() === "th" || cell.classList.contains("re-table-header-cell"));

            const colSpan = Math.max(1, cell.colSpan || 1);
            for (let i = 1; i < colSpan; i += 1) {
              values.push("");
              htmlValues.push(null);
              styleValues.push(null);
              headerValues.push(null);
            }
          }
          grid.push(values);
          htmlGrid.push(htmlValues);
          styleGrid.push(styleValues);
          headerCellGrid.push(headerValues);
        }

        if (grid.length > 0 && grid.some((row) => row.length > 0)) {
          this.debugLog(`clipboard grid parsed from html rows=${grid.length} cols=${Math.max(0, ...grid.map((row) => row.length))}`);
          return { grid, headerRows, htmlGrid, styleGrid, headerCellGrid };
        }
        this.debugLog("clipboard grid html table found but empty after parsing");
      }
      this.debugLog("clipboard grid html present but not eligible for strict table-grid mode");
    }

    const plain = clipboard.getData("text/plain") ?? "";
    if (!plain.includes("\t") && !plain.includes("\n")) {
      this.debugLog("clipboard grid skip: plain text is single cell");
      return null;
    }

    const rows = plain.replace(/\r\n/g, "\n").split("\n");
    if (rows.length > 0 && rows[rows.length - 1] === "") {
      rows.pop();
    }

    const grid = rows.map((row) => row.split("\t"));
    if (grid.length === 0 || grid.every((row) => row.length === 0)) {
      this.debugLog("clipboard grid skip: plain text parsed empty grid");
      return null;
    }
    this.debugLog(`clipboard grid parsed from plain rows=${grid.length} cols=${Math.max(0, ...grid.map((row) => row.length))}`);
    return {
      grid,
      headerRows: grid.map(() => false),
      htmlGrid: grid.map((row) => row.map(() => null)),
      styleGrid: grid.map((row) => row.map(() => null)),
      headerCellGrid: grid.map((row) => row.map(() => null)),
    };
  }

  /**
   * 시작 셀이 없을 때 grid를 "새 테이블"로 삽입하는 fallback 경로.
   * Why: 표 밖 클릭 후 paste가 no-start-cell로 막히면 UX가 크게 저하된다.
   * How: 현재 selection(가능하면 restoreSelection)을 기준으로 table+p를 삽입하고,
   *      첫 셀에 선택/커서를 복구해 다음 편집을 이어갈 수 있게 한다.
   * Pitfall: insertNodeAtCaret는 selection이 editor 밖이면 append로 떨어질 수 있으므로
   *         active range 유무를 체크해 append 분기를 함께 제공한다.
   */
  private insertGridAsNewTable(payload: {
    grid: string[][];
    headerRows: boolean[];
    htmlGrid: Array<Array<string | null>>;
    styleGrid: Array<Array<string | null>>;
    headerCellGrid: Array<Array<boolean | null>>;
  }): HTMLTableElement | null {
    if (payload.grid.length === 0) {
      return null;
    }

    const maxCols = Math.max(0, ...payload.grid.map((row) => row.length));
    if (maxCols <= 0) {
      return null;
    }

    // table 밖에서 붙여넣는 fallback 경로에서는 이전 expanded range로 되돌아가면
    // 의도와 다르게 "기존 테이블 내부"에 삽입될 수 있으므로 확장 fallback을 끈다.
    this.restoreSelection(false);

    const table = document.createElement("table");
    table.className = "re-table";

    for (let r = 0; r < payload.grid.length; r += 1) {
      const tr = document.createElement("tr");
      const row = payload.grid[r];
      const sourceHeaderRow = payload.headerRows[r] ?? false;

      for (let c = 0; c < maxCols; c += 1) {
        const cell = document.createElement("td");
        cell.contentEditable = "true";
        cell.style.minWidth = "80px";
        this.applyBodyCellTypography(cell);

        const sourceHeaderCell = payload.headerCellGrid[r]?.[c] ?? sourceHeaderRow;
        if (sourceHeaderCell) {
          cell.classList.add("re-table-header-cell");
        }

        const styleValue = payload.styleGrid[r]?.[c] ?? null;
        if (styleValue !== null) {
          if (styleValue.trim().length > 0) {
            cell.setAttribute("style", styleValue);
          } else {
            cell.removeAttribute("style");
          }
        }

        const htmlValue = payload.htmlGrid[r]?.[c] ?? null;
        this.setCellContentFromClipboard(cell, row[c] ?? "", htmlValue);
        tr.appendChild(cell);
      }

      table.appendChild(tr);
    }

    const active = this.getActiveEditorRange();
    if (active) {
      this.insertTableNodeAtCaret(table);
      this.insertTrailingParagraphAfterTopLevelAnchor(table);
    } else {
      this.editor.appendChild(table);
      this.insertTrailingParagraphAfterTopLevelAnchor(table);
      this.captureSelection();
    }

    this.normalizeTopLevelParagraphs();

    this.enableTableColumnResize(table);
    this.clearSelectedCells();

    const firstCell = table.rows[0]?.cells[0] as HTMLTableCellElement | null;
    if (firstCell) {
      this.selectedCells.add(firstCell);
      firstCell.classList.add("re-cell-selected");
      this.keyboardAnchorCell = firstCell;
      this.keyboardFocusCell = firstCell;
      this.lastTableAnchorCell = firstCell;
      this.placeCaretInCell(firstCell, "start");
    }

    this.updateMergePreview();
    this.debouncedSave();
    return table;
  }

  private appendRowForGridPaste(table: HTMLTableElement): void {
    const tableData = this.buildTableMatrix(table);
    const columnCount = Math.max(1, ...tableData.matrix.map((row) => row.length));

    const row = document.createElement("tr");
    for (let i = 0; i < columnCount; i += 1) {
      const cell = document.createElement("td");
      cell.contentEditable = "true";
      cell.style.minWidth = "80px";
      cell.innerHTML = "<br>";
      this.applyBodyCellTypography(cell);
      row.appendChild(cell);
    }

    table.appendChild(row);
  }

  private appendColForGridPaste(table: HTMLTableElement): void {
    const headerLikeFirstRow = Array.from(table.rows[0]?.cells ?? []).some((cell) => cell.classList.contains("re-table-header-cell") || cell.tagName.toLowerCase() === "th");

    for (const tr of Array.from(table.rows)) {
      const cell = document.createElement("td");
      cell.contentEditable = "true";
      cell.style.minWidth = "80px";
      this.applyBodyCellTypography(cell);

      if (headerLikeFirstRow && tr.rowIndex === 0) {
        cell.classList.add("re-table-header-cell");
        cell.textContent = "Header";
      } else {
        cell.innerHTML = "<br>";
      }

      tr.appendChild(cell);
    }
  }

  private ensureCellAt(table: HTMLTableElement, targetRow: number, targetCol: number): HTMLTableCellElement | null {
    for (let guard = 0; guard < 200; guard += 1) {
      const tableData = this.buildTableMatrix(table);
      const existing = tableData.matrix[targetRow]?.[targetCol] ?? null;
      if (existing) {
        return existing;
      }

      if (targetRow >= table.rows.length) {
        this.appendRowForGridPaste(table);
        continue;
      }

      this.appendColForGridPaste(table);
    }

    return null;
  }

  private isHeaderLikeCell(cell: HTMLTableCellElement): boolean {
    return cell.tagName.toLowerCase() === "th" || cell.classList.contains("re-table-header-cell");
  }

  private applyTableCellBackground(cell: HTMLTableCellElement, value: string): void {
    if (value.length === 0) {
      cell.style.removeProperty("background");
      cell.style.removeProperty("background-color");
      return;
    }

    cell.style.background = value;
  }

  private shouldKeepHeaderOnPaste(targetCell: HTMLTableCellElement, sourceRowHeader: boolean): boolean {
    if (targetCell.tagName.toLowerCase() === "th") {
      return true;
    }

    if (this.headerPasteMode === "followSource") {
      return sourceRowHeader;
    }

    return this.isHeaderLikeCell(targetCell);
  }

  private getHeaderPasteMode(): HeaderPasteMode {
    const value = this.headerPasteModeSelect.value as HeaderPasteMode;
    if (value === "preserveTarget" || value === "followSource") {
      return value;
    }
    return "preserveTarget";
  }

  private syncHeaderPasteModeFromUi(): void {
    this.headerPasteMode = this.getHeaderPasteMode();
  }

  private setCellTextFromClipboard(cell: HTMLTableCellElement, value: string): void {
    const normalized = value.replace(/\r\n/g, "\n");
    if (normalized.length === 0) {
      cell.innerHTML = "<br>";
      return;
    }

    cell.innerHTML = "";
    const lines = normalized.split("\n");
    lines.forEach((line, index) => {
      if (index > 0) {
        cell.appendChild(document.createElement("br"));
      }
      cell.appendChild(document.createTextNode(line));
    });
  }

  private setCellContentFromClipboard(cell: HTMLTableCellElement, textValue: string, htmlValue: string | null): void {
    if (htmlValue && htmlValue.trim().length > 0) {
      const clean = cleanPasteHtml(htmlValue);
      if (clean.trim().length > 0) {
        cell.innerHTML = clean;
        return;
      }
    }

    this.setCellTextFromClipboard(cell, textValue);
  }

  // 테이블 매트릭스 helper 위임.
  private buildTableMatrix(table: HTMLTableElement): TableMatrix {
    return buildTableMatrixHelper(table);
  }

  // span으로 인해 찢어진 선택 사각형을 정상 범위로 확장한다.
  private normalizeRectForSpans(
    tableData: TableMatrix,
    startMinRow: number,
    startMaxRow: number,
    startMinCol: number,
    startMaxCol: number,
  ): { minRow: number; maxRow: number; minCol: number; maxCol: number } {
    return normalizeRectForSpansHelper(tableData, startMinRow, startMaxRow, startMinCol, startMaxCol);
  }

  // 정규화된 사각형 내 실제 셀 목록을 수집한다.
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
    // 미리보기 클래스만 제거하고 실제 선택(selectedCells)은 건드리지 않는다.
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

    // 선택 영역을 매트릭스로 해석해야 rowspan/colspan이 섞여도 예측 가능한 preview가 가능하다.
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

    // 실제 병합 예정 크기(행x열)를 표시해 사용자가 결과를 미리 판단할 수 있게 한다.
    const rows = normalized.maxRow - normalized.minRow + 1;
    const cols = normalized.maxCol - normalized.minCol + 1;
    this.updateMergeActionUi(this.previewCells.size, rows, cols);
  }

  private setPendingExpandedMerge(next: boolean): void {
    this.pendingExpandedMerge = next;
    if (!next) {
      // 확정 상태 해제 시 버튼/배지 상태도 초기화한다.
      this.updateMergeActionUi(0, 0, 0);
      return;
    }
    this.updateMergePreview();
  }

  private updateMergeActionUi(previewCount: number, rows: number, cols: number): void {
    if (this.pendingExpandedMerge) {
      // 2단계 병합 UX: 첫 클릭은 preview, 두 번째 클릭은 confirm.
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

    // CSS animation class를 짧게 부여/해제해 시각 피드백만 제공한다.
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

  // 사용자 설정 UI(분리 정책/플래시 강도/디버그 가시성)를 localStorage에 저장한다.
  private saveUiPrefs(): void {
    this.syncHeaderPasteModeFromUi();
    const prefs: EditorUiPrefs = {
      flashIntensity: this.getFlashIntensity(),
      unmergeMode: this.getUnmergeContentMode(),
      headerPasteMode: this.headerPasteMode,
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

      if (parsed.headerPasteMode === "preserveTarget" || parsed.headerPasteMode === "followSource") {
        this.headerPasteModeSelect.value = parsed.headerPasteMode;
      }

      this.syncHeaderPasteModeFromUi();

      this.setDebugPanelVisible(parsed.debugPanelVisible === true);
    } catch {
      // Ignore malformed localStorage data and keep defaults.
    }
  }

  // 디버그 패널 가시성/토글 버튼 상태를 동기화한다.
  private setDebugPanelVisible(next: boolean): void {
    this.debugPanelVisible = next;
    this.debugPanelWrap.classList.toggle("is-visible", next);
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

  // 테이블 셀마다 col/row 리사이즈 핸들을 다시 생성한다.
  private enableTableColumnResize(table: HTMLTableElement): void {
    if (table.rows.length === 0) {
      return;
    }

    // 재렌더 시 핸들이 중첩되지 않도록 기존 핸들을 먼저 제거한다.
    for (const oldHandle of Array.from(table.querySelectorAll(".re-col-handle, .re-row-handle, .re-table-corner-handle"))) {
      oldHandle.remove();
    }

    Array.from(table.rows).forEach((row, rowIndex) => {
      Array.from(row.cells).forEach((cell, colIndex) => {
        const el = cell as HTMLElement;
        el.style.position = "relative";

        // 컬럼 리사이즈 핸들은 첫 행에만 배치해 시각적 밀도를 낮춘다.
        if (rowIndex === 0) {
          const colHandle = document.createElement("span");
          colHandle.className = "re-col-handle";
          colHandle.contentEditable = "false";

          colHandle.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const startX = event.clientX;
            // 동일 열의 각 행 폭을 초기 스냅샷으로 저장한 뒤 delta를 누적 적용한다.
            const widths = Array.from(table.rows).map((r) => {
              const targetCell = r.cells[colIndex] as HTMLElement | undefined;
              return targetCell?.getBoundingClientRect().width ?? 0;
            });

            const onMove = (moveEvent: MouseEvent): void => {
              const delta = moveEvent.clientX - startX;
              Array.from(table.rows).forEach((r, currentRowIndex) => {
                const targetCell = r.cells[colIndex] as HTMLElement | undefined;
                if (!targetCell) {
                  return;
                }
                const nextWidth = Math.max(40, widths[currentRowIndex] + delta);
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
        }

        // 행 리사이즈 핸들은 각 행의 첫 번째 셀에만 배치한다.
        if (colIndex === 0) {
          const rowHandle = document.createElement("span");
          rowHandle.className = "re-row-handle";
          rowHandle.contentEditable = "false";

          rowHandle.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const startY = event.clientY;
            // 한 행의 셀 높이를 동기 조정해 행 경계가 틀어지지 않게 한다.
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
        }
      });
    });

    this.attachTableCornerResizeHandles(table);

    this.updateTableResizeHandleLayout(table);
  }

  private attachTableCornerResizeHandles(table: HTMLTableElement): void {
    type Corner = "nw" | "ne" | "sw" | "se";
    const corners: Corner[] = ["nw", "ne", "sw", "se"];
    const minTableWidth = 120;
    const minTableHeight = 72;

    for (const corner of corners) {
      const handle = document.createElement("span");
      handle.className = `re-table-corner-handle re-table-corner-handle-${corner}`;
      handle.contentEditable = "false";

      handle.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const startX = event.clientX;
        const startY = event.clientY;
        const tableRect = table.getBoundingClientRect();
        const startWidth = Math.max(minTableWidth, tableRect.width);
        const startHeight = Math.max(minTableHeight, tableRect.height);
        const startAspectRatio = startWidth / startHeight;

        const cornerSigns = this.getCornerResizeSigns(corner);

        const firstRow = table.rows[0] as HTMLTableRowElement | undefined;
        const colWidths = firstRow
          ? Array.from(firstRow.cells).map((cell) => (cell as HTMLElement).getBoundingClientRect().width)
          : [];
        const rowHeights = Array.from(table.rows).map((row) => row.getBoundingClientRect().height);

        const onMove = (moveEvent: MouseEvent): void => {
          const deltaX = moveEvent.clientX - startX;
          const deltaY = moveEvent.clientY - startY;

          let nextWidth = Math.max(minTableWidth, startWidth + deltaX * cornerSigns.signX);
          let nextHeight = Math.max(minTableHeight, startHeight + deltaY * cornerSigns.signY);

          if (moveEvent.shiftKey) {
            const widthProgress = Math.abs((nextWidth - startWidth) / startWidth);
            const heightProgress = Math.abs((nextHeight - startHeight) / startHeight);

            if (widthProgress >= heightProgress) {
              nextHeight = Math.max(minTableHeight, nextWidth / startAspectRatio);
              nextWidth = Math.max(minTableWidth, nextHeight * startAspectRatio);
            } else {
              nextWidth = Math.max(minTableWidth, nextHeight * startAspectRatio);
              nextHeight = Math.max(minTableHeight, nextWidth / startAspectRatio);
            }
          }

          const scaleX = nextWidth / startWidth;
          const scaleY = nextHeight / startHeight;

          this.applyScaledTableResize(table, colWidths, rowHeights, scaleX, scaleY);

          this.updateTableResizeHandleLayout(table);
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

      table.appendChild(handle);
    }
  }

  private getCornerResizeSigns(corner: "nw" | "ne" | "sw" | "se"): { signX: -1 | 1; signY: -1 | 1 } {
    return {
      signX: corner === "nw" || corner === "sw" ? -1 : 1,
      signY: corner === "nw" || corner === "ne" ? -1 : 1,
    };
  }

  private applyScaledTableResize(
    table: HTMLTableElement,
    colWidths: number[],
    rowHeights: number[],
    scaleX: number,
    scaleY: number,
  ): void {
    for (let colIndex = 0; colIndex < colWidths.length; colIndex += 1) {
      const baseWidth = colWidths[colIndex] ?? 0;
      const targetWidth = Math.max(40, baseWidth * scaleX);
      for (const row of Array.from(table.rows)) {
        const targetCell = row.cells[colIndex] as HTMLElement | undefined;
        if (targetCell) {
          targetCell.style.width = `${Math.round(targetWidth)}px`;
        }
      }
    }

    for (let rowIndex = 0; rowIndex < rowHeights.length; rowIndex += 1) {
      const row = table.rows[rowIndex] as HTMLTableRowElement | undefined;
      if (!row) {
        continue;
      }
      const baseHeight = rowHeights[rowIndex] ?? 0;
      const targetHeight = Math.max(24, baseHeight * scaleY);
      for (const cell of Array.from(row.cells) as HTMLElement[]) {
        cell.style.height = `${Math.round(targetHeight)}px`;
      }
    }
  }

  private updateTableResizeHandleLayout(table: HTMLTableElement): void {
    if (table.rows.length === 0) {
      return;
    }

    // 핸들 hit-area를 고정 두께로 유지해 작은 셀에서도 드래그 가능하도록 한다.
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
          const rowRect = row.getBoundingClientRect();
          rowHandle.style.width = `${rowRect.width}px`;
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
    this.setActiveImageWrapper(wrapper);
    this.placeCaretAroundImageWrapper(wrapper, "after");
    this.setActiveImageWrapper(null);
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

    // 기존 선택 내용은 교체하고, 삽입 노드 뒤로 caret을 이동시켜 연속 입력 UX를 보장한다.
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    this.captureSelection();
  }

  private insertTableNodeAtCaret(table: HTMLTableElement): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.editor.appendChild(table);
      this.captureSelection();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!this.editor.contains(range.commonAncestorContainer)) {
      this.editor.appendChild(table);
      this.captureSelection();
      return;
    }

    const startElement = this.getRangeStartContainerElement(range);
    
    // p 태그 처리: p 밖으로 테이블 삽입 (형제로)
    const paragraph = startElement?.closest("p") as HTMLParagraphElement | null;
    if (paragraph && paragraph.parentElement === this.editor) {
      range.deleteContents();
      paragraph.insertAdjacentElement("afterend", table);

      const nextRange = document.createRange();
      nextRange.setStartAfter(table);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      this.captureSelection();
      return;
    }

    // div 태그 처리: div 내부에 테이블 삽입
    const div = startElement?.closest("div") as HTMLDivElement | null;
    if (div && div !== this.editor && div.parentElement === this.editor) {
      range.deleteContents();
      div.appendChild(table);

      const nextRange = document.createRange();
      nextRange.setStartAfter(table);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      this.captureSelection();
      return;
    }

    this.insertNodeAtCaret(table);
  }

  private insertNodesAtCaret(nodes: Node[]): void {
    if (nodes.length === 0) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      for (const node of nodes) {
        this.editor.appendChild(node);
      }
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const fragment = document.createDocumentFragment();
    for (const node of nodes) {
      fragment.appendChild(node);
    }
    const last = fragment.lastChild;
    range.insertNode(fragment);

    if (last) {
      range.setStartAfter(last);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    this.captureSelection();
  }

  // 블록 요소(table 등) 뒤 기본 입력 문단은
  // "해당 앵커가 editor의 마지막 top-level 요소"일 때만 생성한다.
  private insertTrailingParagraphAfterTopLevelAnchor(anchor: Node): HTMLParagraphElement | null {
    const anchorElement = anchor instanceof HTMLElement ? anchor : anchor.parentElement;
    const top = anchorElement ? this.getTopLevelEditorChild(anchorElement) : null;
    if (!top || top.parentElement !== this.editor) {
      return null;
    }

    if (top !== this.editor.lastElementChild) {
      // 마지막 top-level 요소가 아니면 trailing p를 만들지 않는다.
      return null;
    }

    const paragraph = document.createElement("p");
    // 비어 있는 p는 브라우저/레이아웃에 따라 클릭 타겟이 작아져 캐럿 진입이 어려울 수 있다.
    // 테이블 뒤 기본 입력 줄은 placeholder <br>로 즉시 편집 가능 상태를 보장한다.
    paragraph.innerHTML = "<br>";
    top.insertAdjacentElement("afterend", paragraph);

    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      this.captureSelection();
    }

    return paragraph;
  }

  // 이모지 팝업 버튼 렌더링 및 선택 시 복원/삽입 흐름을 담당한다.
  private renderEmojiPicker(): void {
    renderEmojiButtons(this.emojiPicker, (emoji) => {
      const beforeRange = this.getActiveEditorRange();
      const beforeCell = this.getSelectedCell();
      this.debugLog(`emoji select start emoji=${emoji} range=${this.describeRange(beforeRange)} cell=${beforeCell ? this.describeCell(beforeCell) : "none"}`);

      // 이모지 삽입은 현재 caret 위치를 보존해야 하므로,
      // lastExpandedRange fallback을 끄고 즉시 편집 범위를 복원한다.
      this.restoreSelection(false);

      // 복원 후에도 셀 컨텍스트를 잃으면(예: stale expanded range 개입) 클릭했던 셀로 강제 복구한다.
      if (!this.getSelectedCell() && beforeCell && beforeCell.isConnected) {
        this.placeCaretInCell(beforeCell, "start");
        this.debugLog(`emoji select caret recovered cell=${this.describeCell(beforeCell)}`);
      }

      const restoredRange = this.getActiveEditorRange();
      const restoredCell = this.getSelectedCell();
      this.debugLog(`emoji select restored range=${this.describeRange(restoredRange)} cell=${restoredCell ? this.describeCell(restoredCell) : "none"}`);
      this.insertTextAtCaret(emoji);
      const insertedRange = this.getActiveEditorRange();
      const insertedCell = this.getSelectedCell();
      this.debugLog(`emoji select inserted range=${this.describeRange(insertedRange)} cell=${insertedCell ? this.describeCell(insertedCell) : "none"}`);
      this.emojiPicker.hidden = true;
      this.captureSelection();
    });
  }

  private renderColorPalette(): void {
    renderColorSwatches(this.root);
  }

  private toggleColorPalette(): void {
    if (this.colorPalette.hidden) {
      // 오픈 직전에 툴바 상태를 갱신해 팔레트 selected 표시를 최신화한다.
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

  // 테이블 크기 picker(10x10)의 hover/drag/click 상호작용을 연결한다.
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
      // 팝업 오픈 전에 selection을 고정해 삽입 지점이 변하지 않게 한다.
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
    // picker에서 실제 삽입할 때는 toolbar snapshot보다 최신 편집 범위(savedRange)를 우선한다.
    // stale toolbarInteractionRange가 남아 있으면 첫 줄 등 이전 위치에 삽입될 수 있다.
    this.toolbarInteractionRange = null;
    this.restoreSelection(false);
    this.debugLog(`table insert apply rows=${rows} cols=${cols} range=${this.describeRange(this.getActiveEditorRange())}`);
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
    // 이모지 삽입 위치 보존을 위해 오픈 시점 selection을 캡처한다.
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

  private isMentionPopupVisible(): boolean {
    return !this.mentionPopup.hidden;
  }

  private openMentionPopupFromMatch(match: { query: string; range: Range }): boolean {
    this.mentionQuery = match.query;
    this.mentionReplaceRange = match.range;
    this.mentionCandidates = this.getMentionCandidates(match.query);
    if (this.mentionCandidates.length === 0) {
      this.hideMentionPopup();
      return false;
    }

    this.mentionActiveIndex = 0;
    this.renderMentionCandidates();
    this.positionMentionPopup(match.range);
    window.requestAnimationFrame(() => this.scrollActiveMentionIntoView());
    return true;
  }

  private hideMentionPopup(): void {
    this.mentionPopup.hidden = true;
    this.mentionCandidates = [];
    this.mentionActiveIndex = 0;
    this.mentionQuery = "";
    this.mentionReplaceRange = null;
    this.mentionList.innerHTML = "";
  }

  private updateMentionAutocompleteFromSelection(compositionText = ""): void {
    if (!this.mentionEnabled) {
      this.hideMentionPopup();
      return;
    }

    if (this.isSelectionOnMentionToken()) {
      this.hideMentionPopup();
      return;
    }

    const match = this.getMentionMatchAtSelection(compositionText);
    if (!match) {
      this.hideMentionPopup();
      return;
    }

    if (this.isRangeTouchingMentionToken(match.range)) {
      this.hideMentionPopup();
      return;
    }

    if (match.query.length === 0 && !this.isMentionPopupVisible()) {
      this.openMentionPopupFromMatch(match);
      return;
    }

    const prevQuery = this.mentionQuery;

    this.mentionQuery = match.query;
    this.mentionReplaceRange = match.range;
    this.mentionCandidates = this.getMentionCandidates(match.query);
    if (this.mentionCandidates.length === 0) {
      this.hideMentionPopup();
      return;
    }

    if (prevQuery !== match.query || !this.isMentionPopupVisible()) {
      this.mentionActiveIndex = 0;
    } else {
      this.mentionActiveIndex = Math.min(this.mentionActiveIndex, this.mentionCandidates.length - 1);
    }
    this.renderMentionCandidates();
    this.positionMentionPopup(match.range);
    window.requestAnimationFrame(() => this.scrollActiveMentionIntoView());
  }

  private getMentionCandidates(query: string): string[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [...this.mentionItems];
    }

    const startsWith = this.mentionItems.filter((item) => item.toLowerCase().startsWith(normalized));
    const includes = this.mentionItems.filter(
      (item) => !item.toLowerCase().startsWith(normalized) && item.toLowerCase().includes(normalized),
    );
    return [...startsWith, ...includes].slice(0, this.mentionMaxResults);
  }

  private getMentionMatchAtSelection(compositionText = ""): { query: string; range: Range } | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    if (!this.editor.contains(range.startContainer) || !this.editor.contains(range.endContainer)) {
      return null;
    }

    const block = this.getSelectionBlock();
    if (!block || !this.editor.contains(block)) {
      return null;
    }

    const beforeRange = range.cloneRange();
    beforeRange.selectNodeContents(block);
    const caretContainer = range.collapsed ? range.startContainer : range.endContainer;
    const caretOffset = range.collapsed ? range.startOffset : range.endOffset;
    beforeRange.setEnd(caretContainer, caretOffset);
    const beforeFromDom = beforeRange.toString().replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
    const before = compositionText.length > 0 && !beforeFromDom.endsWith(compositionText)
      ? `${beforeFromDom}${compositionText}`
      : beforeFromDom;
    const match = before.match(/(?:^|[\s/,.])@([\w가-힣._-]{0,30})$/);
    if (!match) {
      return null;
    }

    const mentionRange = range.cloneRange();
    const query = match[1] ?? "";
    const mentionStartOffset = Math.max(0, before.length - (query.length + 1));
    const startPosition = this.resolveEditorTextPosition(mentionStartOffset, block);
    const endPosition = this.resolveEditorTextPosition(before.length, block);
    if (!startPosition || !endPosition) {
      return null;
    }

    mentionRange.setStart(startPosition.node, startPosition.offset);
    mentionRange.setEnd(endPosition.node, endPosition.offset);

    return {
      query,
      range: mentionRange,
    };
  }

  private isSelectionOnMentionToken(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return false;
    }

    const range = selection.getRangeAt(0);
    const getToken = (node: Node | null): HTMLElement | null => {
      if (!node) {
        return null;
      }

      if (node instanceof HTMLElement) {
        return node.closest(".re-mention-token");
      }

      return node.parentElement?.closest(".re-mention-token") ?? null;
    };

    if (getToken(range.startContainer) || getToken(range.endContainer) || getToken(range.commonAncestorContainer)) {
      return true;
    }

    const block = this.getSelectionBlock();
    if (block) {
      const tokens = Array.from(block.querySelectorAll(".re-mention-token")) as HTMLElement[];
      if (tokens.some((token) => range.intersectsNode(token))) {
        return true;
      }
    }

    if (!range.collapsed) {
      return false;
    }

    const caretNode = range.startContainer;
    if (caretNode instanceof Text) {
      if (range.startOffset <= 0 && getToken(caretNode.previousSibling)) {
        return true;
      }
      if (range.startOffset >= caretNode.length && getToken(caretNode.nextSibling)) {
        return true;
      }
      return false;
    }

    if (caretNode instanceof HTMLElement) {
      const index = range.startOffset;
      const rightNode = index >= 0 && index < caretNode.childNodes.length ? caretNode.childNodes[index] : null;
      const leftNode = index - 1 >= 0 && index - 1 < caretNode.childNodes.length ? caretNode.childNodes[index - 1] : null;

      if (getToken(rightNode) || getToken(leftNode)) {
        return true;
      }

      const findMentionAcrossWhitespace = (startIndex: number, step: 1 | -1): boolean => {
        let i = startIndex;
        while (i >= 0 && i < caretNode.childNodes.length) {
          const sibling = caretNode.childNodes[i] ?? null;
          if (!sibling) {
            return false;
          }

          if (getToken(sibling)) {
            return true;
          }

          if (sibling instanceof Text && !this.isMeaningfulEditableText(sibling.textContent ?? "")) {
            i += step;
            continue;
          }

          return false;
        }

        return false;
      };

      return findMentionAcrossWhitespace(index, 1) || findMentionAcrossWhitespace(index - 1, -1);
    }

    return false;
  }

  private isRangeTouchingMentionToken(range: Range): boolean {
    const getToken = (node: Node | null): HTMLElement | null => {
      if (!node) {
        return null;
      }

      if (node instanceof HTMLElement) {
        return node.closest(".re-mention-token");
      }

      return node.parentElement?.closest(".re-mention-token") ?? null;
    };

    if (getToken(range.startContainer) || getToken(range.endContainer) || getToken(range.commonAncestorContainer)) {
      return true;
    }

    const block = this.getSelectionBlock();
    if (!block) {
      return false;
    }

    const tokens = Array.from(block.querySelectorAll(".re-mention-token")) as HTMLElement[];
    return tokens.some((token) => range.intersectsNode(token));
  }

  private resolveEditorTextPosition(offset: number, root: ParentNode = this.editor): { node: Text; offset: number } | null {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (textNode) => this.isMeaningfulEditableText(textNode.textContent ?? "")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP,
    });

    let consumed = 0;
    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      const length = textNode.data.length;
      if (offset <= consumed + length) {
        return { node: textNode, offset: Math.max(0, offset - consumed) };
      }
      consumed += length;
    }

    return null;
  }

  private renderMentionCandidates(): void {
    const options = this.mentionCandidates
      .map((name, index) => {
        const activeClass = index === this.mentionActiveIndex ? " is-active" : "";
        return `<button type="button" class="re-mention-item${activeClass}" data-mention-index="${index}" data-mention-value="${name}">${this.mentionTrigger}${name}</button>`;
      })
      .join("");

    this.mentionList.innerHTML = options;
    this.mentionPopup.hidden = false;
    this.scrollActiveMentionIntoView();
  }

  private scrollActiveMentionIntoView(): void {
    const active = this.mentionList.querySelector(".re-mention-item.is-active") as HTMLElement | null;
    if (active && typeof active.scrollIntoView === "function") {
      active.scrollIntoView({ block: "nearest" });
    }
  }

  private positionMentionPopup(anchorRange: Range): void {
    const shell = this.root.querySelector(".re-shell") as HTMLElement | null;
    if (!shell) {
      return;
    }

    if (typeof anchorRange.getBoundingClientRect !== "function") {
      this.mentionPopup.style.visibility = "";
      this.mentionPopup.hidden = false;
      return;
    }

    const rect = anchorRange.getBoundingClientRect();
    const x = rect.left;
    const y = rect.bottom;
    this.mentionPopup.style.visibility = "hidden";
    this.mentionPopup.hidden = false;
    positionPopupAtPoint(shell, this.mentionPopup, x, y + 4);
    this.mentionPopup.style.visibility = "";
  }

  private moveMentionActiveIndex(step: 1 | -1): void {
    if (this.mentionCandidates.length === 0) {
      return;
    }

    const length = this.mentionCandidates.length;
    this.mentionActiveIndex = (this.mentionActiveIndex + step + length) % length;
    this.renderMentionCandidates();
  }

  private applyMentionAtActiveIndex(): boolean {
    const value = this.mentionCandidates[this.mentionActiveIndex];
    if (!value || !this.mentionReplaceRange) {
      return false;
    }

    this.focusEditor();
    const selection = window.getSelection();
    if (!selection) {
      return false;
    }

    const range = this.mentionReplaceRange.cloneRange();
    selection.removeAllRanges();
    selection.addRange(range);

    const token = document.createElement("span");
    token.className = "re-mention-token";
    token.dataset.mention = value;
    token.contentEditable = "false";
    token.textContent = `${this.mentionTrigger}${value}`;

    const spacer = document.createTextNode(" ");
    // 이미지 삽입과 동일하게 공통 caret 삽입 경로를 사용해, 삽입 직후 연속 입력 위치를 안정화한다.
    this.insertNodesAtCaret([token, spacer]);

    this.focusEditor();
    const selectionAfterInsert = window.getSelection();
    if (selectionAfterInsert && selectionAfterInsert.rangeCount > 0) {
      const caretRange = selectionAfterInsert.getRangeAt(0);
      selectionAfterInsert.removeAllRanges();
      selectionAfterInsert.addRange(caretRange);
    }
    window.requestAnimationFrame(() => {
      this.getSelectionBlock()?.scrollIntoView({ block: "nearest" });
    });

    this.hideMentionPopup();
    this.updateToolbarState();
    this.debouncedSave();
    return true;
  }

  private handleMentionKeydown(event: KeyboardEvent): boolean {
    if (!this.isMentionPopupVisible()) {
      return false;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.moveMentionActiveIndex(1);
      return true;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.moveMentionActiveIndex(-1);
      return true;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      return this.applyMentionAtActiveIndex();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.hideMentionPopup();
      return true;
    }

    return false;
  }

  private isCaretAfterMentionToken(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return false;
    }

    const range = selection.getRangeAt(0);
    if (!this.editor.contains(range.commonAncestorContainer)) {
      return false;
    }

    const resolveMentionToken = (node: Node | null): HTMLElement | null => {
      if (!node) {
        return null;
      }

      const element = node instanceof HTMLElement ? node : node.parentElement;
      const token = element?.closest(".re-mention-token") as HTMLElement | null;
      return token && this.editor.contains(token) ? token : null;
    };

    if (range.startContainer instanceof HTMLElement) {
      const index = range.startOffset - 1;
      if (index >= 0) {
        const candidate = range.startContainer.childNodes[index] ?? null;
        if (resolveMentionToken(candidate)) {
          return true;
        }

        if (candidate instanceof Text && !this.isMeaningfulEditableText(candidate.textContent ?? "")) {
          const previous = candidate.previousSibling;
          if (resolveMentionToken(previous)) {
            return true;
          }
        }
      }
      return false;
    }

    if (range.startContainer instanceof Text) {
      const text = range.startContainer;
      if (range.startOffset <= 0 && resolveMentionToken(text.previousSibling)) {
        return true;
      }

      if (range.startOffset >= text.length && resolveMentionToken(text.nextSibling)) {
        return true;
      }
    }

    return false;
  }

  private handleMentionContinuationEnterKeydown(event: KeyboardEvent): boolean {
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    if (!this.isCaretAfterMentionToken()) {
      return false;
    }

    event.preventDefault();
    if (!this.insertParagraphAfterCaretBlock()) {
      this.exec("insertParagraph");
    } else {
      this.debouncedSave();
      this.updateToolbarState();
    }
    return true;
  }

  private handleMentionLeadingHomeKeydown(event: KeyboardEvent): boolean {
    if (event.key !== "Home") {
      return false;
    }

    // Ctrl/Cmd+Home 등 문서 단위 이동 단축키는 기본 동작을 유지한다.
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return false;
    }

    const range = selection.getRangeAt(0);
    if (!this.editor.contains(range.commonAncestorContainer)) {
      return false;
    }

    const block = this.getSelectionBlock();
    if (!block || block === this.editor) {
      return false;
    }

    const firstMeaningfulChild = Array.from(block.childNodes).find((node) => {
      if (node instanceof Text) {
        return this.isMeaningfulEditableText(node.textContent ?? "");
      }
      return true;
    });

    const firstMentionToken = firstMeaningfulChild instanceof HTMLElement
      && firstMeaningfulChild.classList.contains("re-mention-token");
    if (!firstMentionToken) {
      return false;
    }

    event.preventDefault();
    const caretRange = document.createRange();
    caretRange.setStart(block, 0);
    caretRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caretRange);
    this.captureSelection();
    return true;
  }

  private insertParagraphAfterCaretBlock(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return false;
    }

    const range = selection.getRangeAt(0);
    if (!this.editor.contains(range.commonAncestorContainer)) {
      return false;
    }

    const block = this.getSelectionBlock();
    if (!block || block === this.editor) {
      return false;
    }

    const tag = block.tagName.toLowerCase();
    if (!/^(p|div|li|blockquote|pre|h1|h2|h3|h4|h5|h6)$/.test(tag)) {
      return false;
    }

    const paragraph = document.createElement("p");
    paragraph.innerHTML = "<br>";
    block.insertAdjacentElement("afterend", paragraph);

    const caretRange = document.createRange();
    caretRange.selectNodeContents(paragraph);
    caretRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caretRange);
    this.captureSelection();
    return true;
  }

  private handleMentionClick(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const option = target.closest("[data-mention-index]") as HTMLElement | null;
    if (!option || !this.mentionPopup.contains(option)) {
      return false;
    }

    const index = Number(option.dataset.mentionIndex);
    if (!Number.isInteger(index) || index < 0 || index >= this.mentionCandidates.length) {
      return false;
    }

    this.mentionActiveIndex = index;
    return this.applyMentionAtActiveIndex();
  }

  private handleCopy(event: ClipboardEvent): void {
    if (!event.clipboardData) {
      this.debugLog("copy skipped: clipboardData unavailable");
      return;
    }

    if (this.shouldUseNativeClipboardSelection()) {
      // 범위 선택(특히 다중 테이블/텍스트 혼합)은 브라우저 기본 복사를 우선한다.
      // 커스텀 셀 payload가 개입하면 첫 테이블만 복사되는 현상이 생길 수 있다.
      if (this.selectedCells.size > 0) {
        this.clearSelectedCells();
      }
      this.debugLog("copy native-preferred: non-collapsed mixed/table-spanning range");
      return;
    }

    const payload = this.buildSelectedCellsClipboardPayload();
    if (!payload) {
      if (this.selectedCells.size > 1) {
        this.showSaveStatus("Copy blocked: select a full rectangle");
        this.debugLog(`copy blocked selected=${this.selectedCells.size}`);
      } else {
        this.debugLog(`copy pass-through native selected=${this.selectedCells.size}`);
      }
      return;
    }

    event.preventDefault();
    event.clipboardData.setData("text/plain", payload.text);
    event.clipboardData.setData("text/html", payload.html);

    // 선택 영역의 빈 칸 비율을 함께 기록해,
    // "복사는 됐는데 내용이 비었다"는 사용자 리포트를 로그만으로 판별할 수 있게 한다.
    const emptyRatio = payload.totalCells > 0 ? payload.emptyCells / payload.totalCells : 0;
    this.debugLog(
      `copy applied selected=${this.selectedCells.size} textLen=${payload.text.length} empty=${payload.emptyCells}/${payload.totalCells}`,
    );
    if (emptyRatio >= 0.7) {
      this.showSaveStatus("Cells copied (selected range is mostly empty)");
    } else {
      this.showSaveStatus("Cells copied");
    }
  }

  private handleCut(event: ClipboardEvent): void {
    if (!event.clipboardData) {
      return;
    }

    if (this.shouldUseNativeClipboardSelection()) {
      if (this.selectedCells.size > 0) {
        this.clearSelectedCells();
      }
      this.debugLog("cut native-preferred: non-collapsed mixed/table-spanning range");
      return;
    }

    const payload = this.buildSelectedCellsClipboardPayload();
    if (!payload) {
      if (this.selectedCells.size > 1) {
        this.showSaveStatus("Cut blocked: select a full rectangle");
        this.debugLog(`cut blocked selected=${this.selectedCells.size}`);
      }
      return;
    }

    event.preventDefault();
    event.clipboardData.setData("text/plain", payload.text);
    event.clipboardData.setData("text/html", payload.html);
    this.debugLog(
      `cut applied selected=${this.selectedCells.size} textLen=${payload.text.length} empty=${payload.emptyCells}/${payload.totalCells}`,
    );

    const selected = Array.from(this.selectedCells);
    for (const cell of selected) {
      this.setCellTextFromClipboard(cell, "");
    }

    const first = selected[0] ?? null;
    if (first) {
      this.placeCaretInCell(first, "start");
    }

    this.captureSelection();
    this.debouncedSave();
    this.showSaveStatus("Cells cut");
  }

  private shouldUseNativeClipboardSelection(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return false;
    }

    const range = selection.getRangeAt(0);
    if (!this.editor.contains(range.commonAncestorContainer)) {
      return false;
    }

    if (this.selectedCells.size === 0) {
      return true;
    }

    const selected = Array.from(this.selectedCells);
    const table = selected[0]?.closest("table") as HTMLTableElement | null;
    if (!table || selected.some((cell) => cell.closest("table") !== table)) {
      return true;
    }

    if (!table.contains(range.startContainer) || !table.contains(range.endContainer)) {
      return true;
    }

    const fragment = range.cloneContents();
    const tableCount = fragment.querySelectorAll("table").length;
    if (tableCount > 1) {
      return true;
    }

    return false;
  }

  private insertTextAtCaret(text: string): void {
    this.exec("insertText", text);
  }

  private handleGridPaste(event: ClipboardEvent): boolean {
    const clipboard = event.clipboardData;
    if (!clipboard) {
      return false;
    }

    const payload = this.parseClipboardTableGrid(clipboard);
    if (!payload || payload.grid.length === 0) {
      this.debugLog("grid paste skip: no tabular clipboard payload");
      return false;
    }

    const maxCols = Math.max(...payload.grid.map((row) => row.length));

    const startCandidates = [
      this.getSelectedCell(),
      Array.from(this.selectedCells)[0] ?? null,
      this.keyboardFocusCell,
      this.keyboardAnchorCell,
      this.lastTableAnchorCell,
    ];
    const startCell = startCandidates.find(
      (candidate): candidate is HTMLTableCellElement => Boolean(candidate && candidate.isConnected),
    ) ?? null;

    // 시작 셀이 없으면 두 케이스로 분기한다.
    // - caret이 table 내부: 대상 셀이 모호하므로 차단(명시적 셀 선택 유도)
    // - caret이 table 외부: 새 테이블 fallback 삽입
    if (!startCell) {
      event.preventDefault();
      const activeRange = this.getActiveEditorRange();
      const rangeNode = activeRange?.startContainer ?? null;
      const rangeElement = rangeNode
        ? (rangeNode instanceof HTMLElement ? rangeNode : rangeNode.parentElement)
        : null;
      const activeTable = rangeElement?.closest("table") as HTMLTableElement | null;

      if (activeTable) {
        this.debugLog("grid paste blocked: no start cell (caret is inside table, target ambiguous)");
        this.showSaveStatus("Paste blocked: choose a target cell");
        return true;
      }

      const insertedTable = this.insertGridAsNewTable(payload);
      if (insertedTable) {
        this.debugLog(
          `grid paste fallback inserted new table rows=${payload.grid.length} cols=${maxCols} reason=noStartCellOutsideTable`,
        );
        this.showSaveStatus("Cells pasted as new table");
      } else {
        this.debugLog("grid paste blocked: no start cell");
        this.showSaveStatus("Paste blocked: choose a target cell");
      }
      return true;
    }

    const table = startCell.closest("table") as HTMLTableElement | null;
    if (!table) {
      event.preventDefault();
      this.debugLog("grid paste blocked: start cell has no table");
      this.showSaveStatus("Paste blocked: choose a target cell");
      return true;
    }
    let startRow: number;
    let startCol: number;

    if (this.selectedCells.size > 1) {
      // 다중 선택 paste는 반드시 "완전 직사각형 + 크기 일치"를 만족해야 한다.
      // 그렇지 않으면 비의도 영역 덮어쓰기가 발생할 수 있어 차단한다.
      const rectInfo = this.getSelectedRectInfo(table);
      if (!rectInfo || !rectInfo.isCompleteRect) {
        event.preventDefault();
        this.showSaveStatus("Paste blocked: select a full rectangle");
        this.debugLog(`grid paste blocked: incomplete rectangle selected=${this.selectedCells.size}`);
        return true;
      }

      const rectRows = rectInfo.maxRow - rectInfo.minRow + 1;
      const rectCols = rectInfo.maxCol - rectInfo.minCol + 1;
      if (rectRows !== payload.grid.length || rectCols !== maxCols) {
        event.preventDefault();
        this.showSaveStatus("Paste blocked: range size mismatch");
        this.debugLog(
          `grid paste blocked: size mismatch target=${rectRows}x${rectCols} source=${payload.grid.length}x${maxCols} selected=${this.selectedCells.size}`,
        );
        return true;
      }

      startRow = rectInfo.minRow;
      startCol = rectInfo.minCol;
    } else {
      const startTableData = this.buildTableMatrix(table);
      const startAnchor = startTableData.anchors.get(startCell);
      if (!startAnchor) {
        event.preventDefault();
        this.debugLog(`grid paste blocked: missing anchor for start=${this.describeCell(startCell)}`);
        this.showSaveStatus("Paste blocked: invalid target cell");
        return true;
      }
      startRow = startAnchor.row;
      startCol = startAnchor.col;
    }

    event.preventDefault();

    const pastedCells = new Set<HTMLTableCellElement>();
    const sourceHeaderRows = payload.headerRows.filter(Boolean).length;
    let headerChanged = 0;
    let headerApplied = 0;

    this.debugLog(
      `grid paste start mode=${this.headerPasteMode} rows=${payload.grid.length} cols=${maxCols} sourceHeaderRows=${sourceHeaderRows} start=${this.describeCell(startCell)} targetRect=${this.selectedCells.size > 1 ? "multi" : "single"}`,
    );

    for (let r = 0; r < payload.grid.length; r += 1) {
      const row = payload.grid[r];
      const sourceRowHeader = payload.headerRows[r] ?? false;
      for (let c = 0; c < row.length; c += 1) {
        const target = this.ensureCellAt(table, startRow + r, startCol + c);
        if (!target) {
          continue;
        }

        const keepHeader = this.shouldKeepHeaderOnPaste(target, sourceRowHeader);
        const hadHeader = target.classList.contains("re-table-header-cell");
        target.classList.toggle("re-table-header-cell", keepHeader);
        if (keepHeader) {
          headerApplied += 1;
        }
        if (hadHeader !== keepHeader) {
          headerChanged += 1;
        }

        const sourceStyle = payload.styleGrid[r]?.[c] ?? null;
        if (sourceStyle !== null) {
          if (sourceStyle.trim().length > 0) {
            target.setAttribute("style", sourceStyle);
          } else {
            target.removeAttribute("style");
          }
        }

        const sourceHtml = payload.htmlGrid[r]?.[c] ?? null;
        this.setCellContentFromClipboard(target, row[c] ?? "", sourceHtml);
        pastedCells.add(target);
      }
    }

    this.clearSelectedCells();
    for (const cell of pastedCells) {
      this.selectedCells.add(cell);
      cell.classList.add("re-cell-selected");
    }

    const pastedList = Array.from(pastedCells);
    const firstPasted = pastedList[0] ?? startCell;
    const lastPasted = pastedList[pastedList.length - 1] ?? startCell;
    this.keyboardAnchorCell = firstPasted;
    this.keyboardFocusCell = lastPasted;
    this.updateMergePreview();

    this.enableTableColumnResize(table);
    this.placeCaretInCell(firstPasted, "start");
    this.captureSelection();
    this.debouncedSave();
    this.debugLog(
      `grid paste applied cells=${pastedCells.size} headerApplied=${headerApplied} headerChanged=${headerChanged} anchor=${this.describeCell(firstPasted)} focus=${this.describeCell(lastPasted)}`,
    );
    this.showSaveStatus("Cells pasted");
    return true;
  }

  // 붙여넣기 데이터를 정제 후 삽입한다.
  // HTML이 있으면 sanitize 후 insertHTML, 아니면 plain text 정규화 후 insertText.
  private handlePaste(event: ClipboardEvent): void {
    if (this.handleGridPaste(event)) {
      return;
    }

    event.preventDefault();

    const html = event.clipboardData?.getData("text/html")?.trim();
    const plain = event.clipboardData?.getData("text/plain") ?? "";

    if (html) {
      const clean = cleanPasteHtml(html);
      const normalized = this.removeTableAdjacentEmptyParagraphsFromHtml(clean);
      this.debugLog(`plain paste html mode len=${normalized.length}`);

      this.skipNormalizeOnNextInput = true;
      this.exec("insertHTML", normalized);
      this.decorateSpecialNodes();
      return;
    }

    this.debugLog(`plain paste text mode len=${plain.length}`);
    this.skipNormalizeOnNextInput = true;
    this.exec("insertText", cleanPasteText(plain));
  }

  private consumeSkipNormalizeOnNextInput(): boolean {
    if (!this.skipNormalizeOnNextInput) {
      return false;
    }

    this.skipNormalizeOnNextInput = false;
    return true;
  }

  private removeTableAdjacentEmptyParagraphsFromHtml(html: string): string {
    if (!html.includes("<table")) {
      return html;
    }

    const doc = new DOMParser().parseFromString(html, "text/html");
    const isEmptyParagraph = (p: HTMLParagraphElement): boolean => {
      const hasMeaningfulText = this.isMeaningfulEditableText(p.textContent ?? "");
      const hasEmbedded = Boolean(p.querySelector("img,table,.re-image-wrap"));
      return !hasMeaningfulText && !hasEmbedded;
    };

    for (const p of Array.from(doc.body.querySelectorAll("p"))) {
      const prevTag = p.previousElementSibling?.tagName.toLowerCase() ?? "";
      const nextTag = p.nextElementSibling?.tagName.toLowerCase() ?? "";
      const nearTable = prevTag === "table" || nextTag === "table";
      if (!nearTable) {
        continue;
      }

      if (isEmptyParagraph(p)) {
        p.remove();
      }
    }

    return doc.body.innerHTML;
  }

  private decorateSpecialNodes(): void {
    // 복구/붙여넣기 후에는 동적으로 생성한 리사이즈 핸들이 유실될 수 있어 재장식이 필요하다.
    for (const table of Array.from(this.editor.querySelectorAll("table"))) {
      const tableElement = table as HTMLTableElement;
      tableElement.classList.add("re-table");
      this.enableTableColumnResize(tableElement);
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
    if (this.handleMentionLeadingHomeKeydown(event)) {
      return;
    }

    if (this.handleMentionKeydown(event)) {
      return;
    }

    if (this.handleMentionContinuationEnterKeydown(event)) {
      return;
    }

    if (this.handleImageArrowNavigationKeydown(event)) {
      return;
    }

    if (this.handleTableArrowBoundaryNavigationKeydown(event)) {
      return;
    }

    if (this.handleImageBoundaryDeleteKeydown(event)) {
      return;
    }

    if (this.handleInterTableGapDeleteKeydown(event)) {
      return;
    }

    if (this.handleTableBoundaryDeleteKeydown(event)) {
      return;
    }

    // 병합 미리보기 단축키 -> 셀 선택 확장 단축키 -> 셀 내비게이션 순으로 우선 처리.
    if (this.handleMergePreviewKeydown(event)) {
      return;
    }

    const isArrowKey = event.key === "ArrowLeft"
      || event.key === "ArrowRight"
      || event.key === "ArrowUp"
      || event.key === "ArrowDown";

    // TinyMCE 스타일 책임 분리:
    // Shift + Arrow는 selection 경로만, Arrow 단독은 navigation 경로만 처리한다.
    if (event.shiftKey && isArrowKey) {
      if (this.handleTableSelectionKeydown(event)) {
        return;
      }
    } else if (this.handleTableSelectionKeydown(event)) {
      return;
    }

    if (!event.shiftKey || !isArrowKey) {
      if (this.handleTableNavigationKeydown(event)) {
        return;
      }
    }

    this.handleModifierShortcuts(event);
  }

  private handleInterTableGapDeleteKeydown(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    if (event.key !== "Delete" && event.key !== "Backspace") {
      return false;
    }

    const activeRange = this.getCollapsedEditorRange();
    if (!activeRange) {
      return false;
    }

    const container = this.getRangeStartContainerElement(activeRange);
    if (!container) {
      return false;
    }

    const top = this.getTopLevelEditorChild(container);
    if (!top || top.tagName.toLowerCase() === "table") {
      return false;
    }

    const emptySelector = "img,table,.re-image-wrap";
    const isBlockHostTag = (tag: string): boolean => /^(p|div|li|blockquote|pre|h1|h2|h3|h4|h5|h6)$/.test(tag);

    const findGapHostFromRange = (): HTMLElement | null => {
      const start = activeRange.startContainer;
      if (start instanceof Text) {
        const parent = start.parentElement;
        return parent && this.isVisuallyEmptyBlock(parent, emptySelector) ? parent : null;
      }

      if (!(start instanceof HTMLElement)) {
        return null;
      }

      const idx = activeRange.startOffset;
      const candidates: HTMLElement[] = [];

      if (idx >= 0 && idx < start.childNodes.length) {
        const node = start.childNodes[idx];
        if (node instanceof HTMLElement) {
          candidates.push(node);
        } else if (node?.parentElement) {
          candidates.push(node.parentElement);
        }
      }

      if (idx - 1 >= 0 && idx - 1 < start.childNodes.length) {
        const node = start.childNodes[idx - 1];
        if (node instanceof HTMLElement) {
          candidates.push(node);
        } else if (node?.parentElement) {
          candidates.push(node.parentElement);
        }
      }

      if (this.isVisuallyEmptyBlock(start, emptySelector)) {
        candidates.push(start);
      }

      for (const candidate of candidates) {
        if (this.editor.contains(candidate) && this.isVisuallyEmptyBlock(candidate, emptySelector)) {
          return candidate;
        }
      }

      return null;
    };

    let gapHost: HTMLElement = findGapHostFromRange() ?? top;
    if (gapHost === top) {
      let probe: HTMLElement | null = container;
      while (probe && probe !== top) {
        const tag = probe.tagName.toLowerCase();
        if (isBlockHostTag(tag)) {
          gapHost = probe;
          break;
        }
        probe = probe.parentElement;
      }
    }

    const isEmptyGapHost = (host: HTMLElement): boolean => this.isVisuallyEmptyBlock(host, emptySelector);
    if (!isEmptyGapHost(gapHost)) {
      if (gapHost !== top && isEmptyGapHost(top)) {
        gapHost = top;
      } else {
        this.debugLog(`table gap collapse skip key=${event.key} reason=gap-host-not-empty host=${gapHost.tagName.toLowerCase()}`);
        return false;
      }
    }

    const resolveTableFromHost = (host: HTMLElement | null): HTMLTableElement | null => {
      if (!host) {
        return null;
      }

      if (host.tagName.toLowerCase() === "table") {
        return host as HTMLTableElement;
      }

      const directTableChild = host.children.length === 1 && host.firstElementChild instanceof HTMLTableElement
        ? host.firstElementChild
        : null;
      if (directTableChild) {
        return directTableChild;
      }

      // 일부 브라우저/붙여넣기 경로에서는 table이 래퍼(div/figure 등) 내부에 배치된다.
      // 단일 자식 래퍼뿐 아니라 일반 하위 구조에서도 첫 번째 table을 주변 테이블로 인정한다.
      const nested = host.querySelector("table") as HTMLTableElement | null;
      if (nested) {
        return nested;
      }

      return null;
    };

    const findNeighborTable = (start: HTMLElement | null, direction: "prev" | "next"): HTMLTableElement | null => {
      let cursor = start;
      while (cursor) {
        const table = resolveTableFromHost(cursor);
        if (table) {
          return table;
        }

        // 빈 블록은 건너뛰고, 의미 있는 비테이블 블록을 만나면 중단한다.
        if (!this.isVisuallyEmptyBlock(cursor, emptySelector)) {
          return null;
        }

        cursor = (direction === "prev"
          ? cursor.previousElementSibling
          : cursor.nextElementSibling) as HTMLElement | null;
      }

      return null;
    };

    const prevTable = findNeighborTable(gapHost.previousElementSibling as HTMLElement | null, "prev");
    const nextTable = findNeighborTable(gapHost.nextElementSibling as HTMLElement | null, "next");
    if (!prevTable || !nextTable) {
      const prevTag = gapHost.previousElementSibling instanceof HTMLElement
        ? `${gapHost.previousElementSibling.tagName.toLowerCase()}.${gapHost.previousElementSibling.className || "-"}`
        : "none";
      const nextTag = gapHost.nextElementSibling instanceof HTMLElement
        ? `${gapHost.nextElementSibling.tagName.toLowerCase()}.${gapHost.nextElementSibling.className || "-"}`
        : "none";
      this.debugLog(`table gap collapse skip key=${event.key} reason=no-surrounding-tables prev=${prevTag} next=${nextTag}`);
      return false;
    }

    event.preventDefault();
    gapHost.remove();

    if (event.key === "Backspace") {
      const targetCell = this.getLastTableCell(prevTable);
      if (targetCell) {
        this.setActiveTableElement(prevTable);
        this.clearSelectedCells();
        this.placeCaretInCell(targetCell, "end");
        this.keyboardAnchorCell = targetCell;
        this.keyboardFocusCell = targetCell;
        this.lastTableAnchorCell = targetCell;
      }
      this.debugLog("table gap collapse key=Backspace removed=true target=prev-table-end");
      return true;
    }

    const targetCell = this.getFirstTableCell(nextTable);
    if (targetCell) {
      this.setActiveTableElement(nextTable);
      this.clearSelectedCells();
      this.placeCaretInCell(targetCell, "start");
      this.keyboardAnchorCell = targetCell;
      this.keyboardFocusCell = targetCell;
      this.lastTableAnchorCell = targetCell;
    }
    this.debugLog("table gap collapse key=Delete removed=true target=next-table-start");
    return true;
  }

  private handleTableArrowBoundaryNavigationKeydown(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return false;
    }

    const hit = this.getBoundaryTableForArrowNavigation(event.key as "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown");
    if (!hit) {
      return false;
    }

    event.preventDefault();
    const targetCell = hit.enter === "start"
      ? this.getFirstTableCell(hit.table)
      : this.getLastTableCell(hit.table);
    if (!targetCell) {
      return true;
    }

    this.setActiveImageWrapper(null);
    this.setActiveTableElement(hit.table);
    this.clearSelectedCells();
    this.placeCaretInCell(targetCell, hit.enter === "start" ? "start" : "end");
    this.keyboardAnchorCell = targetCell;
    this.keyboardFocusCell = targetCell;
    this.lastTableAnchorCell = targetCell;
    this.debugLog(
      `table nav boundary-enter key=${event.key} enter=${hit.enter} target=${this.describeCell(targetCell)} source=${hit.source}`,
    );
    return true;
  }

  private getBoundaryTableForArrowNavigation(
    key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown",
  ): { table: HTMLTableElement; enter: "start" | "end"; source: "marker" | "block-boundary" } | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return null;
    }

    const range = selection.getRangeAt(0);
    if (!this.editor.contains(range.commonAncestorContainer)) {
      return null;
    }

    const resolveTable = (node: Node | null): HTMLTableElement | null => {
      if (!node) {
        return null;
      }
      if (node instanceof HTMLTableElement) {
        return node;
      }
      const element = node instanceof HTMLElement ? node : node.parentElement;
      const table = element?.closest("table") as HTMLTableElement | null;
      return table && this.editor.contains(table) ? table : null;
    };

    const start = range.startContainer;
    if (start instanceof Text) {
      const text = start.textContent ?? "";
      const isOnlyZeroWidthMarker = text.replace(/\u200B/g, "").length === 0;
      if (isOnlyZeroWidthMarker) {
        const prevTable = resolveTable(start.previousSibling);
        const nextTable = resolveTable(start.nextSibling);
        if ((key === "ArrowRight" || key === "ArrowDown") && nextTable) {
          return { table: nextTable, enter: "start", source: "marker" };
        }
        if ((key === "ArrowLeft" || key === "ArrowUp") && prevTable) {
          return { table: prevTable, enter: "end", source: "marker" };
        }
      }
    }

    const rangeElement = start instanceof HTMLElement ? start : start.parentElement;
    if (!rangeElement) {
      return null;
    }

    const top = this.getTopLevelEditorChild(rangeElement);
    if (!top) {
      return null;
    }

    if (key === "ArrowRight" || key === "ArrowDown") {
      if (!this.isRangeAtElementBoundary(range, top, "end")) {
        return null;
      }
      const next = top.nextElementSibling as HTMLElement | null;
      const table = resolveTable(next);
      return table ? { table, enter: "start", source: "block-boundary" } : null;
    }

    if (!this.isRangeAtElementBoundary(range, top, "start")) {
      return null;
    }
    const prev = top.previousElementSibling as HTMLElement | null;
    const table = resolveTable(prev);
    return table ? { table, enter: "end", source: "block-boundary" } : null;
  }

  private getFirstTableCell(table: HTMLTableElement): HTMLTableCellElement | null {
    for (const row of Array.from(table.rows)) {
      const cell = row.cells[0] as HTMLTableCellElement | undefined;
      if (cell) {
        return cell;
      }
    }
    return null;
  }

  private getLastTableCell(table: HTMLTableElement): HTMLTableCellElement | null {
    for (let r = table.rows.length - 1; r >= 0; r -= 1) {
      const row = table.rows[r];
      const cell = row.cells[row.cells.length - 1] as HTMLTableCellElement | undefined;
      if (cell) {
        return cell;
      }
    }
    return null;
  }

  private handleImageArrowNavigationKeydown(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return false;
    }

    // active 상태가 남아 있어도 캐럿이 이미지 경계에 없으면 화살표를 가로채지 않는다.
    const directImage = this.getActiveImageWrapper();
    const boundaryImage = this.getBoundaryImageForArrowShortcut(event.key);
    const targetImage = directImage ?? boundaryImage;
    if (!targetImage) {
      if (this.activeImageWrapper) {
        this.setActiveImageWrapper(null);
      }
      return false;
    }

    event.preventDefault();
    const moved = this.placeCaretAroundImageWrapper(targetImage, event.key === "ArrowRight" ? "after" : "before");
    if (moved) {
      this.debugLog(
        `image nav key=${event.key} move=${event.key === "ArrowRight" ? "after" : "before"} source=${directImage ? "active" : "boundary"}`,
      );
    } else {
      this.debugLog(`image nav key=${event.key} move-failed`);
    }
    this.syncActiveImageWithCaret();
    return true;
  }

  private getImageWrapperNearCollapsedCaret(): HTMLElement | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return null;
    }

    const range = selection.getRangeAt(0);
    if (!this.editor.contains(range.commonAncestorContainer)) {
      return null;
    }

    const resolveImage = (node: Node | null): HTMLElement | null => {
      if (!node) {
        return null;
      }
      const element = node instanceof HTMLElement ? node : node.parentElement;
      const wrapper = element?.closest(".re-image-wrap") as HTMLElement | null;
      return wrapper && this.editor.contains(wrapper) ? wrapper : null;
    };

    const direct = resolveImage(range.startContainer);
    if (direct) {
      return direct;
    }

    if (range.startContainer instanceof Text) {
      const text = range.startContainer;
      if (range.startOffset <= 0) {
        const prev = resolveImage(text.previousSibling) ?? resolveImage(text.parentElement?.previousSibling ?? null);
        if (prev) {
          return prev;
        }
      }
      if (range.startOffset >= text.length) {
        const next = resolveImage(text.nextSibling) ?? resolveImage(text.parentElement?.nextSibling ?? null);
        if (next) {
          return next;
        }
      }
    } else if (range.startContainer instanceof HTMLElement) {
      const container = range.startContainer;
      const idx = range.startOffset;
      const nearRight = idx >= 0 && idx < container.childNodes.length ? container.childNodes[idx] : null;
      const nearLeft = idx - 1 >= 0 && idx - 1 < container.childNodes.length ? container.childNodes[idx - 1] : null;
      const right = resolveImage(nearRight);
      if (right) {
        return right;
      }
      const left = resolveImage(nearLeft);
      if (left) {
        return left;
      }
    }

    const rangeElement = range.startContainer instanceof HTMLElement
      ? range.startContainer
      : range.startContainer.parentElement;
    if (!rangeElement) {
      return null;
    }

    const top = this.getTopLevelEditorChild(rangeElement);
    if (!top) {
      return null;
    }

    if (this.isRangeAtElementBoundary(range, top, "start")) {
      const prevTop = resolveImage(top.previousSibling);
      if (prevTop) {
        return prevTop;
      }
    }
    if (this.isRangeAtElementBoundary(range, top, "end")) {
      const nextTop = resolveImage(top.nextSibling);
      if (nextTop) {
        return nextTop;
      }
    }

    return null;
  }

  private syncActiveImageWithCaret(): void {
    const near = this.getImageWrapperNearCollapsedCaret();
    this.setActiveImageWrapper(near);
  }

  private getBoundaryImageForArrowShortcut(key: "ArrowLeft" | "ArrowRight"): HTMLElement | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return null;
    }

    const range = selection.getRangeAt(0);
    if (!this.editor.contains(range.commonAncestorContainer)) {
      return null;
    }

    const resolveImageFromNode = (node: Node | null): HTMLElement | null => {
      if (!node) {
        return null;
      }
      const element = node instanceof HTMLElement ? node : node.parentElement;
      const wrapper = element?.closest(".re-image-wrap") as HTMLElement | null;
      return wrapper && this.editor.contains(wrapper) ? wrapper : null;
    };

    // 1) collapsed caret 주변(같은 블록 내부)에서 인접 이미지를 우선 찾는다.
    const container = range.startContainer;
    if (container instanceof Text) {
      const text = container.textContent ?? "";
      const isOnlyZeroWidthMarker = text.replace(/\u200B/g, "").length === 0;
      if (isOnlyZeroWidthMarker) {
        const prevImage = resolveImageFromNode(container.previousSibling);
        const nextImage = resolveImageFromNode(container.nextSibling);
        if (key === "ArrowRight" && nextImage) {
          return nextImage;
        }
        if (key === "ArrowLeft" && prevImage) {
          return prevImage;
        }
      }

      if (key === "ArrowRight" && range.startOffset >= container.length) {
        const image = resolveImageFromNode(container.nextSibling);
        if (image) {
          return image;
        }
      }
      if (key === "ArrowLeft" && range.startOffset <= 0) {
        const image = resolveImageFromNode(container.previousSibling);
        if (image) {
          return image;
        }
      }
    } else if (container instanceof HTMLElement) {
      const idx = range.startOffset;
      const probe = key === "ArrowRight"
        ? (idx >= 0 && idx < container.childNodes.length ? container.childNodes[idx] : null)
        : (idx - 1 >= 0 && idx - 1 < container.childNodes.length ? container.childNodes[idx - 1] : null);
      const image = resolveImageFromNode(probe);
      if (image) {
        return image;
      }
    }

    // 2) 블록 경계 캐럿에서는 이전/다음 top-level 이미지도 확인한다.
    const rangeElement = range.startContainer instanceof HTMLElement
      ? range.startContainer
      : range.startContainer.parentElement;
    if (!rangeElement) {
      return null;
    }

    const top = this.getTopLevelEditorChild(rangeElement);
    if (!top) {
      return null;
    }

    if (key === "ArrowRight") {
      if (!this.isRangeAtElementBoundary(range, top, "end")) {
        return null;
      }
      const next = top.nextElementSibling as HTMLElement | null;
      return next?.classList.contains("re-image-wrap") ? next : null;
    }

    if (!this.isRangeAtElementBoundary(range, top, "start")) {
      return null;
    }
    const prev = top.previousElementSibling as HTMLElement | null;
    return prev?.classList.contains("re-image-wrap") ? prev : null;
  }

  private placeCaretAroundImageWrapper(wrapper: HTMLElement, side: "before" | "after"): boolean {
    const selection = window.getSelection();
    if (!selection || !wrapper.isConnected) {
      return false;
    }

    // 이전 버전에서 남았을 수 있는 caret-anchor span을 일반 텍스트 노드로 풀어준다.
    const normalizeLegacyAnchor = (node: Node | null): void => {
      if (!(node instanceof HTMLElement) || !node.classList.contains("re-image-caret-anchor")) {
        return;
      }
      const plain = document.createTextNode((node.textContent ?? "").replace(/\u200B/g, ""));
      node.replaceWith(plain);
    };
    normalizeLegacyAnchor(wrapper.previousSibling);
    normalizeLegacyAnchor(wrapper.nextSibling);

    const anchorTextNode = document.createTextNode("\u200B");
    if (side === "after") {
      wrapper.parentNode?.insertBefore(anchorTextNode, wrapper.nextSibling);
    } else {
      wrapper.parentNode?.insertBefore(anchorTextNode, wrapper);
    }

    const range = document.createRange();
    range.setStart(anchorTextNode, anchorTextNode.textContent?.length ?? 1);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    this.captureSelection();
    this.updateToolbarState();
    return true;
  }

  private normalizeInlineCaretMarkerAtSelection(): void {
    if (this.isComposing) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return;
    }

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (!(node instanceof Text)) {
      return;
    }

    const text = node.textContent ?? "";
    if (!text.includes("\u200B") || text.length <= 1) {
      return;
    }

    const nextText = text.replace(/\u200B/g, "");

    const parent = node.parentElement;
    let targetNode: Text = node;

    if (parent?.classList.contains("re-image-caret-anchor")) {
      const plainText = document.createTextNode(nextText);
      parent.replaceWith(plainText);
      targetNode = plainText;
    } else {
      node.textContent = nextText;
      targetNode = node;
    }

    const nextRange = document.createRange();
    nextRange.setStart(targetNode, targetNode.textContent?.length ?? 0);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
  }

  // 에디터 루트의 줄 단위를 p로 강제한다.
  // div/span/text 직계 노드는 p로 정규화하고, 불필요한 래퍼는 펼쳐 중첩 p 구조를 줄인다.
  private normalizeTopLevelParagraphs(): void {
    if (this.isComposing) {
      return;
    }

    const selection = window.getSelection();
    let marker: HTMLElement | null = null;
    if (selection && selection.rangeCount > 0) {
      const activeRange = selection.getRangeAt(0);
      if (this.editor.contains(activeRange.commonAncestorContainer)) {
        marker = document.createElement("span");
        marker.setAttribute("data-re-caret-marker", "true");
        marker.textContent = "\u200B";
        const markerRange = activeRange.cloneRange();
        markerRange.collapse(true);
        markerRange.insertNode(marker);
      }
    }

    const isParagraphHostTag = (tag: string): boolean => /^(p|div|span)$/.test(tag);
    const isPreservedTopLevelTag = (tag: string): boolean => /^(p|table|ul|ol|blockquote|pre|h1|h2|h3|h4|h5|h6)$/.test(tag);

    const ensureParagraphContent = (p: HTMLParagraphElement): void => {
      // 원본 구조 보존을 위해 기존 empty paragraph에 <br>를 강제 주입하지 않는다.
      // (fallback으로 새 블록을 만든 경우는 생성 시점에서만 제어)
      void p;
    };

    const unwrapTablesFromParagraph = (p: HTMLParagraphElement): boolean => {
      if (!p.querySelector("table")) {
        return false;
      }

      const parent = p.parentElement;
      if (!parent) {
        return false;
      }

      let changedLocal = false;
      const segmentNodes: Node[] = [];
      const flushSegment = (): void => {
        if (segmentNodes.length === 0) {
          return;
        }

        const nextP = document.createElement("p");
        while (segmentNodes.length > 0) {
          const node = segmentNodes.shift();
          if (node) {
            nextP.appendChild(node);
          }
        }

        const hasMarker = Boolean(marker && nextP.contains(marker));
        const meaningful = this.isMeaningfulEditableText(nextP.textContent ?? "");
        const hasSpecialNode = Boolean(nextP.querySelector("img,.re-image-wrap"));

        // table 분리 과정에서 생긴 <br> 전용 문단은 제거해 table 뒤 불필요한 BR 누적을 막는다.
        if (!hasMarker && !meaningful && !hasSpecialNode) {
          return;
        }

        ensureParagraphContent(nextP);
        parent.insertBefore(nextP, p);
      };

      for (const child of Array.from(p.childNodes)) {
        if (child instanceof HTMLTableElement) {
          flushSegment();
          parent.insertBefore(child, p);
          changedLocal = true;
          continue;
        }

        if (child instanceof HTMLElement && child.tagName.toLowerCase() === "br" && segmentNodes.length === 0) {
          // table 앞/뒤 선행 BR은 보존 가치가 낮아 건너뛴다.
          changedLocal = true;
          child.remove();
          continue;
        }

        segmentNodes.push(child);
      }

      flushSegment();
      p.remove();
      return true;
    };

    const normalizeTableStructure = (table: HTMLTableElement): boolean => {
      const tableParent = table.parentNode;
      if (!tableParent) {
        return false;
      }

      let changedLocal = false;
      let insertAfter: Node = table;

      const moveOutside = (node: Node): void => {
        tableParent.insertBefore(node, insertAfter.nextSibling);
        insertAfter = node;
        changedLocal = true;
      };

      const moveInvalidChildren = (parent: Node, allowedTags: Set<string>): void => {
        for (const child of Array.from(parent.childNodes)) {
          if (child instanceof HTMLElement) {
            const tag = child.tagName.toLowerCase();
            if (!allowedTags.has(tag)) {
              moveOutside(child);
            }
            continue;
          }

          if (child.nodeType === Node.TEXT_NODE) {
            const text = (child.textContent ?? "").replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
            if (text.trim().length > 0) {
              const p = document.createElement("p");
              p.textContent = text;
              moveOutside(p);
              child.remove();
            } else {
              child.remove();
              changedLocal = true;
            }
          }
        }
      };

      moveInvalidChildren(table, new Set(["caption", "colgroup", "thead", "tbody", "tfoot", "tr"]));

      for (const group of Array.from(table.querySelectorAll("colgroup"))) {
        moveInvalidChildren(group, new Set(["col"]));
      }

      for (const section of Array.from(table.querySelectorAll("thead,tbody,tfoot"))) {
        moveInvalidChildren(section, new Set(["tr"]));
      }

      for (const row of Array.from(table.querySelectorAll("tr"))) {
        moveInvalidChildren(row, new Set(["td", "th"]));
      }

      return changedLocal;
    };

    const isVisuallyEmptyParagraph = (p: HTMLParagraphElement): boolean => {
      const meaningful = this.isMeaningfulEditableText(p.textContent ?? "");
      const hasSpecialNode = Boolean(p.querySelector("img,table,.re-image-wrap"));
      return !meaningful && !hasSpecialNode;
    };

    const cleanupTableAdjacentEmptyParagraphs = (): boolean => {
      let changedLocal = false;
      for (const p of Array.from(this.editor.querySelectorAll(":scope > p")) as HTMLParagraphElement[]) {
        if (marker && p.contains(marker)) {
          continue;
        }

        if (!isVisuallyEmptyParagraph(p)) {
          continue;
        }

        const prev = p.previousElementSibling as HTMLElement | null;
        const next = p.nextElementSibling as HTMLElement | null;
        const prevTag = prev?.tagName.toLowerCase() ?? "";
        const nextTag = next?.tagName.toLowerCase() ?? "";

        const prevIsEmptyParagraph = prev?.tagName.toLowerCase() === "p"
          && isVisuallyEmptyParagraph(prev as HTMLParagraphElement)
          && !(marker && prev.contains(marker));
        if (prevIsEmptyParagraph) {
          p.remove();
          changedLocal = true;
          continue;
        }

        const nearTable = prevTag === "table" || nextTag === "table";
        if (!nearTable) {
          continue;
        }

        const keepSingleTrailingAfterLastTable = prevTag === "table" && !next;
        if (keepSingleTrailingAfterLastTable) {
          p.removeAttribute("style");
          p.innerHTML = "<br>";
          continue;
        }

        p.remove();
        changedLocal = true;
      }

      return changedLocal;
    };

    let changed = true;
    let guard = 0;
    while (changed && guard < 10) {
      changed = false;
      guard += 1;

      for (const node of Array.from(this.editor.childNodes)) {
        if (node === marker) {
          continue;
        }

        if (node.nodeType === Node.TEXT_NODE) {
          const textNode = node as Text;
          if (!this.isMeaningfulEditableText(textNode.textContent ?? "")) {
            textNode.remove();
            changed = true;
            continue;
          }

          const p = document.createElement("p");
          p.textContent = textNode.textContent ?? "";
          textNode.replaceWith(p);
          changed = true;
          continue;
        }

        if (!(node instanceof HTMLElement)) {
          node.parentNode?.removeChild(node);
          changed = true;
          continue;
        }

        if (node.classList.contains("re-image-wrap")) {
          continue;
        }

        const tag = node.tagName.toLowerCase();

        if (tag === "table") {
          if (normalizeTableStructure(node as HTMLTableElement)) {
            changed = true;
          }
          continue;
        }

        if (tag === "br") {
          const p = document.createElement("p");
          node.replaceWith(p);
          changed = true;
          continue;
        }

        if (tag === "p") {
          if (unwrapTablesFromParagraph(node as HTMLParagraphElement)) {
            changed = true;
            continue;
          }
          ensureParagraphContent(node as HTMLParagraphElement);
          continue;
        }

        if (isPreservedTopLevelTag(tag)) {
          continue;
        }

        const hasStructuralChild = Array.from(node.children).some((child) => {
          const childTag = child.tagName.toLowerCase();
          return isPreservedTopLevelTag(childTag) || isParagraphHostTag(childTag) || child.classList.contains("re-image-wrap");
        });

        if (hasStructuralChild) {
          while (node.firstChild) {
            this.editor.insertBefore(node.firstChild, node);
          }
          node.remove();
          changed = true;
          continue;
        }

        const p = document.createElement("p");
        while (node.firstChild) {
          p.appendChild(node.firstChild);
        }
        ensureParagraphContent(p);
        node.replaceWith(p);
        changed = true;
      }

      if (cleanupTableAdjacentEmptyParagraphs()) {
        changed = true;
      }
    }

    if (!this.editor.firstChild) {
      const p = document.createElement("p");
      this.editor.appendChild(p);
    }

    if (selection && marker?.isConnected) {
      const nextRange = document.createRange();
      nextRange.setStartBefore(marker);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      marker.remove();
      this.captureSelection();
    }
  }

  private handleModifierShortcuts(event: KeyboardEvent): void {
    const hasModifier = event.ctrlKey || event.metaKey;
    if (!hasModifier) {
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

  private handleImageBoundaryDeleteKeydown(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    if (event.key !== "Delete" && event.key !== "Backspace") {
      return false;
    }

    const activeImage = (this.activeImageWrapper && this.activeImageWrapper.isConnected)
      ? this.activeImageWrapper
      : this.getActiveImageWrapper();
    if (activeImage) {
      event.preventDefault();
      return this.confirmAndDeleteImage(event.key, activeImage, "active-image");
    }

    const boundaryImage = this.getBoundaryImageForDeleteShortcut(event.key);
    if (!boundaryImage) {
      return false;
    }

    event.preventDefault();
    return this.confirmAndDeleteImage(event.key, boundaryImage, "outside-image-boundary");
  }

  private confirmAndDeleteImage(
    key: "Delete" | "Backspace",
    wrapper: HTMLElement,
    source: "outside-image-boundary" | "active-image",
  ): true {
    const confirmed = window.confirm(DELETE_UI_TEXT.imageConfirm);
    this.debugLog(`image delete shortcut key=${key} confirmed=${String(confirmed)} source=${source}`);
    if (!confirmed) {
      this.showSaveStatus(DELETE_UI_TEXT.imageCanceled);
      return true;
    }

    this.deleteSpecificImage(wrapper, source);
    return true;
  }

  private getActiveImageWrapper(): HTMLElement | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);

    const nodeElement = range.startContainer instanceof HTMLElement
      ? range.startContainer
      : range.startContainer.parentElement;
    const direct = nodeElement?.closest(".re-image-wrap") as HTMLElement | null;
    if (direct && this.editor.contains(direct)) {
      return direct;
    }

    // contenteditable=false 이미지 래퍼는 부모 컨테이너의 child index로 선택되는 경우가 있어
    // startOffset 인접 노드도 함께 확인한다.
    const container = range.startContainer;
    if (!(container instanceof HTMLElement)) {
      return null;
    }

    const idx = range.startOffset;
    const candidates: Node[] = [];
    if (idx >= 0 && idx < container.childNodes.length) {
      candidates.push(container.childNodes[idx]);
    }
    if (idx - 1 >= 0 && idx - 1 < container.childNodes.length) {
      candidates.push(container.childNodes[idx - 1]);
    }

    for (const node of candidates) {
      const element = node instanceof HTMLElement ? node : node.parentElement;
      const wrapper = element?.closest(".re-image-wrap") as HTMLElement | null;
      if (wrapper && this.editor.contains(wrapper)) {
        return wrapper;
      }
    }

    return null;
  }

  private getBoundaryImageForDeleteShortcut(key: "Delete" | "Backspace"): HTMLElement | null {
    const activeRange = this.getCollapsedEditorRange();
    if (!activeRange) {
      return null;
    }

    const container = this.getRangeStartContainerElement(activeRange);
    if (!container) {
      return null;
    }

    const top = this.getTopLevelEditorChild(container);
    if (!top || top.classList.contains("re-image-wrap") || top.tagName.toLowerCase() === "table") {
      return null;
    }

    const isVisuallyEmptyBlock = this.isVisuallyEmptyBlock(top, "img,table,.re-image-wrap");

    if (key === "Delete") {
      if (!this.isRangeAtElementBoundary(activeRange, top, "end") && !isVisuallyEmptyBlock) {
        return null;
      }

      const next = top.nextElementSibling as HTMLElement | null;
      if (next?.classList.contains("re-image-wrap")) {
        return next;
      }
      return null;
    }

    if (!this.isRangeAtElementBoundary(activeRange, top, "start") && !isVisuallyEmptyBlock) {
      return null;
    }

    const prev = top.previousElementSibling as HTMLElement | null;
    if (prev?.classList.contains("re-image-wrap")) {
      return prev;
    }

    return null;
  }

  private handleTableBoundaryDeleteKeydown(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    if (event.key !== "Delete" && event.key !== "Backspace") {
      return false;
    }

    this.debugLog(`table delete keydown key=${event.key}`);

    const cell = this.getSelectedCell();
    if (cell) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
        this.debugLog(`table delete skip key=${event.key} reason=selection-invalid-inside-cell`);
        return false;
      }

      const activeRange = selection.getRangeAt(0);
      if (!cell.contains(activeRange.startContainer)) {
        this.debugLog(`table delete stale-cell key=${event.key} reason=range-outside-cell -> fallback-boundary-check`);
        this.clearSelectedCells();
        this.keyboardAnchorCell = null;
        this.keyboardFocusCell = null;
        this.lastTableAnchorCell = null;
      } else {
        const atStart = this.isCaretAtCellBoundary(cell, "start");
        const atEnd = this.isCaretAtCellBoundary(cell, "end");
        const isFirstCell = !this.findAdjacentCellByOrder(cell, -1);
        const isLastCell = !this.findAdjacentCellByOrder(cell, 1);
        const shouldDeleteTable = (event.key === "Delete" && isFirstCell && atStart)
          || (event.key === "Backspace" && isLastCell && atEnd);

         this.debugLog(
          `table delete inside check key=${event.key} cell=${this.describeCell(cell)} isFirst=${String(isFirstCell)} isLast=${String(isLastCell)} atStart=${String(atStart)} atEnd=${String(atEnd)} shouldDelete=${String(shouldDeleteTable)}`,
        );

        if (!shouldDeleteTable) {
          return false;
        }

        const table = cell.closest("table") as HTMLTableElement | null;
        if (!table) {
          return true;
        }

        this.setActiveTableElement(table);
        event.preventDefault();
        return this.confirmAndDeleteTable(event.key, table, "inside-cell", this.describeCell(cell));
      }
    }

    const boundaryTable = this.getBoundaryTableForDeleteShortcut(event.key);
    if (!boundaryTable) {
      this.debugLog(`table delete skip key=${event.key} reason=no-boundary-table`);
      return false;
    }

    this.setActiveTableElement(boundaryTable);
    this.debugLog(`table delete boundary target key=${event.key} target=active-table`);
    event.preventDefault();
    return this.confirmAndDeleteTable(event.key, boundaryTable, "outside-table-boundary");
  }

  private confirmAndDeleteTable(
    key: "Delete" | "Backspace",
    table: HTMLTableElement,
    source: "inside-cell" | "outside-table-boundary",
    cellDescription?: string,
  ): true {
    const confirmed = window.confirm(DELETE_UI_TEXT.tableConfirm);
    const cellPart = cellDescription ? ` cell=${cellDescription}` : "";
    this.debugLog(`table delete shortcut key=${key} confirmed=${String(confirmed)}${cellPart} source=${source}`);
    if (!confirmed) {
      this.showSaveStatus(DELETE_UI_TEXT.tableCanceled);
      return true;
    }

    this.deleteSpecificTable(table, source);
    return true;
  }

  private getBoundaryTableForDeleteShortcut(key: "Delete" | "Backspace"): HTMLTableElement | null {
    const activeRange = this.getCollapsedEditorRange();
    if (!activeRange) {
      this.debugLog(`table delete boundary skip key=${key} reason=selection-invalid`);
      return null;
    }

    const container = this.getRangeStartContainerElement(activeRange);
    if (!container) {
      this.debugLog(`table delete boundary skip key=${key} reason=missing-container`);
      return null;
    }

    const top = this.getTopLevelEditorChild(container);
    if (!top || top.tagName.toLowerCase() === "table") {
      this.debugLog(`table delete boundary skip key=${key} reason=top-is-table-or-missing`);
      return null;
    }

    // 빈 문단(또는 zero-width marker만 남은 블록)에서는 caret이 정확히 start/end가 아니어도
    // 사용자 체감상 "테이블 경계"로 인식되므로 삭제 단축키를 허용한다.
    const isVisuallyEmptyBlock = this.isVisuallyEmptyBlock(top, "img,table");

    if (key === "Delete") {
      if (!this.isRangeAtElementBoundary(activeRange, top, "end") && !isVisuallyEmptyBlock) {
        this.debugLog(`table delete boundary skip key=${key} reason=not-at-end`);
        return null;
      }
      if (isVisuallyEmptyBlock) {
        this.debugLog(`table delete boundary relax key=${key} reason=empty-block`);
      }
      const next = top.nextElementSibling as HTMLElement | null;
      if (next?.tagName.toLowerCase() === "table") {
        this.debugLog(`table delete boundary hit key=${key} side=next-table`);
        return next as HTMLTableElement;
      }
      this.debugLog(`table delete boundary skip key=${key} reason=no-next-table`);
      return null;
    }

    if (!this.isRangeAtElementBoundary(activeRange, top, "start") && !isVisuallyEmptyBlock) {
      this.debugLog(`table delete boundary skip key=${key} reason=not-at-start`);
      return null;
    }
    if (isVisuallyEmptyBlock) {
      this.debugLog(`table delete boundary relax key=${key} reason=empty-block`);
    }
    const prev = top.previousElementSibling as HTMLElement | null;
    if (prev?.tagName.toLowerCase() === "table") {
      this.debugLog(`table delete boundary hit key=${key} side=prev-table`);
      return prev as HTMLTableElement;
    }
    this.debugLog(`table delete boundary skip key=${key} reason=no-prev-table`);
    return null;
  }

  private getCollapsedEditorRange(): Range | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return null;
    }

    const activeRange = selection.getRangeAt(0);
    if (!this.editor.contains(activeRange.commonAncestorContainer)) {
      return null;
    }

    return activeRange;
  }

  private getRangeStartContainerElement(range: Range): HTMLElement | null {
    if (range.startContainer instanceof HTMLElement) {
      if (range.startContainer !== this.editor) {
        return range.startContainer;
      }

      // 빈 블록/경계 캐럿에서는 startContainer가 editor 자신이 될 수 있다.
      // 이때는 startOffset 인접 자식을 top-level 컨테이너 후보로 사용한다.
      const index = range.startOffset;
      const candidates: Node[] = [];
      if (index >= 0 && index < this.editor.childNodes.length) {
        candidates.push(this.editor.childNodes[index]);
      }
      if (index - 1 >= 0 && index - 1 < this.editor.childNodes.length) {
        candidates.push(this.editor.childNodes[index - 1]);
      }

      for (const candidate of candidates) {
        const element = candidate instanceof HTMLElement ? candidate : candidate.parentElement;
        if (element && element !== this.editor) {
          return element;
        }
      }

      return null;
    }

    return range.startContainer.parentElement;
  }

  private isVisuallyEmptyBlock(top: HTMLElement, blockedSelector: string): boolean {
    const hasMeaningfulText = this.isMeaningfulEditableText(top.textContent ?? "");
    return !hasMeaningfulText && !top.querySelector(blockedSelector);
  }

  private getTopLevelEditorChild(node: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = node;
    while (current && current.parentElement && current.parentElement !== this.editor) {
      current = current.parentElement;
    }
    if (!current || current.parentElement !== this.editor) {
      return null;
    }
    return current;
  }

  private setActiveImageWrapper(next: HTMLElement | null): void {
    if (this.activeImageWrapper && this.activeImageWrapper !== next) {
      this.activeImageWrapper.classList.remove("re-active");
    }

    this.activeImageWrapper = next && next.isConnected ? next : null;

    if (this.activeImageWrapper) {
      this.activeImageWrapper.classList.add("re-active");
    }
  }

  private setActiveTableElement(next: HTMLTableElement | null): void {
    if (this.activeTableElement && this.activeTableElement !== next) {
      this.activeTableElement.classList.remove("re-active");
    }

    this.activeTableElement = next && next.isConnected ? next : null;

    if (this.activeTableElement) {
      this.activeTableElement.classList.add("re-active");
    }
  }

  private isRangeAtElementBoundary(range: Range, element: HTMLElement, boundary: "start" | "end"): boolean {
    // 브라우저가 caret을 editor 루트 컨테이너 기준으로 표현하는 경우가 있다.
    // (예: 블록 맨 앞/뒤 클릭) 이때는 top-level child index로 경계를 직접 판정한다.
    if (range.startContainer === this.editor) {
      const children = Array.from(this.editor.childNodes);
      const elementIndex = children.indexOf(element);
      if (elementIndex < 0) {
        return false;
      }

      if (boundary === "start") {
        return range.startOffset === elementIndex;
      }

      return range.startOffset === elementIndex + 1;
    }

    const probe = document.createRange();
    probe.selectNodeContents(element);
    if (boundary === "start") {
      try {
        probe.setEnd(range.startContainer, range.startOffset);
      } catch {
        return false;
      }
    } else {
      try {
        probe.setStart(range.startContainer, range.startOffset);
      } catch {
        return false;
      }
    }

    return !this.isMeaningfulEditableText(probe.toString());
  }

  private deleteSpecificTable(table: HTMLTableElement, source: "inside-cell" | "outside-table-boundary"): void {
    const placeholder = document.createElement("p");
    placeholder.innerHTML = "<br>";
    table.insertAdjacentElement("afterend", placeholder);

    this.clearSelectedCells();
    this.keyboardAnchorCell = null;
    this.keyboardFocusCell = null;
    this.lastTableAnchorCell = null;
    this.setActiveTableElement(null);
    table.remove();

    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(placeholder);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    this.captureSelection();
    this.updateToolbarState();
    this.debugLog(`table deleted source=${source}`);
    this.showSaveStatus(DELETE_UI_TEXT.tableDeleted);
    this.debouncedSave();
  }

  private deleteSpecificImage(wrapper: HTMLElement, source: "outside-image-boundary" | "active-image"): void {
    const placeholder = document.createElement("p");
    placeholder.innerHTML = "<br>";
    wrapper.insertAdjacentElement("afterend", placeholder);

    wrapper.remove();
    this.setActiveImageWrapper(null);

    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(placeholder);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    this.captureSelection();
    this.updateToolbarState();
    this.debugLog(`image deleted source=${source}`);
    this.showSaveStatus(DELETE_UI_TEXT.imageDeleted);
    this.debouncedSave();
  }

  private placeCaretOutsideTableFromCell(cell: HTMLTableCellElement, direction: "up" | "down"): boolean {
    const table = cell.closest("table") as HTMLTableElement | null;
    if (!table) {
      return false;
    }

    const tableHost = this.getTopLevelEditorChild(table) ?? table;

    const resolveTargetFromNode = (node: Node): { element: HTMLElement | null; textNode: Text | null } => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (this.isMeaningfulEditableText(node.textContent ?? "")) {
          return { element: null, textNode: node as Text };
        }
        return { element: null, textNode: null };
      }

      if (!(node instanceof HTMLElement)) {
        return { element: null, textNode: null };
      }

      const tag = node.tagName.toLowerCase();
      if (tag === "table") {
        return { element: null, textNode: null };
      }

      if (node.contentEditable === "false") {
        return { element: null, textNode: null };
      }

      const isBlockHost = /^(p|div|li|blockquote|pre|h1|h2|h3|h4|h5|h6)$/.test(tag);
      if (isBlockHost) {
        return { element: node, textNode: null };
      }

      const textWalker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
        acceptNode: (textNode) => this.isMeaningfulEditableText(textNode.textContent ?? "")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP,
      });

      let firstText: Text | null = null;
      let lastText: Text | null = null;
      while (textWalker.nextNode()) {
        const currentText = textWalker.currentNode as Text;
        if (!firstText) {
          firstText = currentText;
        }
        lastText = currentText;
      }

      const chosenText = direction === "up" ? lastText : firstText;
      return { element: null, textNode: chosenText };
    };

    let targetElement: HTMLElement | null = null;
    let targetTextNode: Text | null = null;
    let createdFallbackBlock = false;

    // 1) table과 같은 컨테이너 내부에서 먼저 앞/뒤 콘텐츠를 찾는다.
    let inlineProbe: Node | null = direction === "up" ? table.previousSibling : table.nextSibling;
    while (inlineProbe) {
      const resolved = resolveTargetFromNode(inlineProbe);
      if (resolved.textNode) {
        targetTextNode = resolved.textNode;
        break;
      }
      if (resolved.element) {
        targetElement = resolved.element;
        break;
      }
      inlineProbe = direction === "up" ? inlineProbe.previousSibling : inlineProbe.nextSibling;
    }

    // 2) 같은 컨테이너 내부에서 못 찾으면 top-level 형제 블록을 찾는다.
    let probe: Node | null = direction === "up" ? tableHost.previousSibling : tableHost.nextSibling;

    while (!targetElement && !targetTextNode && probe) {
      const resolved = resolveTargetFromNode(probe);
      if (resolved.textNode) {
        targetTextNode = resolved.textNode;
        break;
      }
      if (resolved.element) {
        targetElement = resolved.element;
        break;
      }
      probe = direction === "up" ? probe.previousSibling : probe.nextSibling;
    }

    const selection = window.getSelection();
    if (!selection) {
      return false;
    }

    if (!targetElement && !targetTextNode) {
      // 우선 DOM을 변경하지 않고 tableHost 경계(앞/뒤)로 캐럿 이동을 시도한다.
      // 이 단계가 성공하면 "테이블 위에 빈 줄 생성" 회귀를 방지할 수 있다.
      const boundaryRange = document.createRange();
      try {
        if (direction === "up") {
          boundaryRange.setStartBefore(tableHost);
        } else {
          boundaryRange.setStartAfter(tableHost);
        }
        boundaryRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(boundaryRange);

        this.clearSelectedCells();
        this.keyboardAnchorCell = null;
        this.keyboardFocusCell = null;
        this.lastTableAnchorCell = null;
        this.setActiveTableElement(null);
        this.captureSelection();
        this.updateToolbarState();
        this.debugLog(
          `table nav outside caret direction=${direction} target=table-host-boundary empty=false collapse=start range=${this.describeRange(boundaryRange)}`,
        );
        this.debugLog(`table nav exit direction=${direction} from=${this.describeCell(cell)}`);
        return true;
      } catch {
        // 경계 배치가 불가능한 구조면 기존 fallback으로 새 문단을 생성한다.
      }

      const adjacent = direction === "up"
        ? tableHost.previousElementSibling as HTMLElement | null
        : tableHost.nextElementSibling as HTMLElement | null;
      const canReuseAdjacentParagraph = adjacent
        && adjacent.tagName.toLowerCase() === "p"
        && !this.isMeaningfulEditableText(adjacent.textContent ?? "")
        && !adjacent.querySelector("img,table,.re-image-wrap");

      if (canReuseAdjacentParagraph) {
        targetElement = adjacent;
      } else {
        targetElement = document.createElement("p");
        targetElement.innerHTML = "<br>";
        createdFallbackBlock = true;
        if (direction === "up") {
          tableHost.insertAdjacentElement("beforebegin", targetElement);
        } else {
          tableHost.insertAdjacentElement("afterend", targetElement);
        }
      }

      if (!this.isMeaningfulEditableText(targetElement.textContent ?? "")) {
        targetElement.removeAttribute("style");
        targetElement.innerHTML = "<br>";
      }
    }

    const range = document.createRange();
    let collapseToStart = direction === "down";
    let isEmptyTarget = false;
    let targetLabel = "unknown";

    if (targetTextNode) {
      const textLength = targetTextNode.textContent?.length ?? 0;
      const offset = direction === "up" ? textLength : 0;
      range.setStart(targetTextNode, offset);
      range.collapse(true);
      targetLabel = "text-node";
    } else if (targetElement) {
      isEmptyTarget = !this.isMeaningfulEditableText(targetElement.textContent ?? "");

      range.selectNodeContents(targetElement);
      // 빈 블록은 caret이 더 안정적으로 보이도록 항상 시작점에 둔다.
      // 일반 텍스트 블록은 위/아래 이동 방향에 맞춰 끝/시작으로 배치한다.
      collapseToStart = isEmptyTarget ? true : direction === "down";
      range.collapse(collapseToStart);
      targetLabel = targetElement.tagName.toLowerCase();
    } else {
      return false;
    }

    selection.removeAllRanges();
    selection.addRange(range);

    this.clearSelectedCells();
    this.keyboardAnchorCell = null;
    this.keyboardFocusCell = null;
    this.lastTableAnchorCell = null;
    this.setActiveTableElement(null);
    this.captureSelection();
    this.updateToolbarState();
    this.debugLog(
      `table nav outside caret direction=${direction} target=${targetLabel} empty=${String(isEmptyTarget)} collapse=${collapseToStart ? "start" : "end"} range=${this.describeRange(range)}`,
    );
    this.debugLog(`table nav exit direction=${direction} from=${this.describeCell(cell)}`);
    return true;
  }

  private placeCaretOutsideTableHorizontalFromCell(cell: HTMLTableCellElement, side: "before" | "after"): boolean {
    const table = cell.closest("table") as HTMLTableElement | null;
    if (!table) {
      return false;
    }

    const selection = window.getSelection();
    if (!selection) {
      return false;
    }

    const tableHost = this.getTopLevelEditorChild(table) ?? table;
    const pickAdjacentEditableBlock = (node: Node | null): HTMLElement | null => {
      let probe = node;
      while (probe) {
        if (probe instanceof HTMLElement) {
          const tag = probe.tagName.toLowerCase();
          if (tag === "table") {
            probe = side === "after" ? probe.nextSibling : probe.previousSibling;
            continue;
          }
          if (probe.contentEditable === "false") {
            probe = side === "after" ? probe.nextSibling : probe.previousSibling;
            continue;
          }
          return probe;
        }
        probe = side === "after" ? probe.nextSibling : probe.previousSibling;
      }
      return null;
    };

    let target = pickAdjacentEditableBlock(side === "after" ? tableHost.nextSibling : tableHost.previousSibling);
    let created = false;

    if (!target) {
      // 인접 편집 블록이 없어도 먼저 tableHost 경계로 캐럿 배치를 시도해
      // 불필요한 fallback 문단 생성을 줄인다.
      try {
        const boundaryRange = document.createRange();
        if (side === "after") {
          boundaryRange.setStartAfter(tableHost);
        } else {
          boundaryRange.setStartBefore(tableHost);
        }
        boundaryRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(boundaryRange);

        this.clearSelectedCells();
        this.keyboardAnchorCell = null;
        this.keyboardFocusCell = null;
        this.lastTableAnchorCell = null;
        this.setActiveTableElement(null);
        this.captureSelection();
        this.updateToolbarState();
        this.debugLog(
          `table nav outside caret direction=${side === "after" ? "right" : "left"} target=table-host-boundary created=false range=${this.describeRange(boundaryRange)}`,
        );
        return true;
      } catch {
        // 경계 배치가 불가능한 구조에서만 fallback 문단을 생성한다.
      }

      const adjacent = side === "after"
        ? tableHost.nextElementSibling as HTMLElement | null
        : tableHost.previousElementSibling as HTMLElement | null;
      const canReuseAdjacentParagraph = adjacent
        && adjacent.tagName.toLowerCase() === "p"
        && !this.isMeaningfulEditableText(adjacent.textContent ?? "")
        && !adjacent.querySelector("img,table,.re-image-wrap");

      if (canReuseAdjacentParagraph) {
        target = adjacent;
      } else {
        target = document.createElement("p");
        target.innerHTML = "<br>";
        if (side === "after") {
          tableHost.insertAdjacentElement("afterend", target);
        } else {
          tableHost.insertAdjacentElement("beforebegin", target);
        }
        created = true;
      }

      if (!this.isMeaningfulEditableText(target.textContent ?? "")) {
        target.removeAttribute("style");
        target.innerHTML = "<br>";
      }
    }

    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(side === "after");
    selection.removeAllRanges();
    selection.addRange(range);

    this.clearSelectedCells();
    this.keyboardAnchorCell = null;
    this.keyboardFocusCell = null;
    this.lastTableAnchorCell = null;
    this.setActiveTableElement(null);
    this.captureSelection();
    this.updateToolbarState();
    this.debugLog(
      `table nav outside caret direction=${side === "after" ? "right" : "left"} target=${target.tagName.toLowerCase()} created=${String(created)} range=${this.describeRange(range)}`,
    );
    return true;
  }

  // 테이블 방향키 이동 로직은 모듈로 분리해 위임한다.
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

  // 현재 selection 기준으로 툴바 버튼/폰트/색상 표시 상태를 동기화한다.
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

    // px 단위는 폰트 크기로 나눠 ratio로 환산한 뒤 가장 가까운 프리셋을 선택한다.
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

    // 선택 블록마다 리스트 포함 여부를 계산해 on/off/mixed를 산출한다.
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

    // 텍스트 노드 단위로 실제 적용 여부를 세어 mixed 상태를 판단한다.
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

    // 부모 체인을 순회하며 semantic tag + computed style을 함께 확인한다.
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
    // 텍스트 노드 기준으로 교차 블록을 수집하면 중첩 인라인 구조에서도 안정적으로 동작한다.
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

    // rgb/rgba 포맷만 파싱해 6자리 hex로 정규화한다(alpha는 무시).
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) {
      return null;
    }

    const [r, g, b] = match.slice(1, 4).map((value) => Number.parseInt(value, 10));
    const toHex = (value: number): string => value.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private save(): void {
    this.normalizeTopLevelParagraphs();
    // 편집 HTML을 그대로 저장하므로 스타일/테이블 구조를 보존할 수 있다.
    localStorage.setItem(this.options.storageKey, this.editor.innerHTML);
    this.showSaveStatus("Saved");
  }

  private restore(): void {
    const saved = localStorage.getItem(this.options.storageKey);
    if (!saved) {
      return;
    }

    // 저장된 문서 HTML을 복구한 뒤, 동적 핸들을 재생성한다.
    this.editor.innerHTML = saved;
    this.normalizeTopLevelParagraphs();
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
    // 고빈도 입력 이벤트에서 저장 호출을 합쳐 성능과 저장 빈도를 제어한다.
    let timerId: number | undefined;
    return (...args: T) => {
      if (timerId) {
        window.clearTimeout(timerId);
      }
      timerId = window.setTimeout(() => callback(...args), delay);
    };
  }
}
