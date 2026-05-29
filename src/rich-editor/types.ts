export type RichEditorOptions = {
  storageKey?: string;
  autosaveDelay?: number;
};

export type EditorUiPrefs = {
  flashIntensity: FlashIntensity;
  unmergeMode: UnmergeContentMode;
  debugPanelVisible: boolean;
};

export type TableAction =
  | "insert"
  | "addRow"
  | "addCol"
  | "deleteRow"
  | "deleteCol"
  | "mergeCells"
  | "unmergeCell"
  | "deleteTable";

export type CommandState = "on" | "off" | "mixed";

export type InlineCommand = "bold" | "italic" | "underline" | "strikeThrough";

export type ListCommand = "insertUnorderedList" | "insertOrderedList";
export type FormattingRole = "fontName" | "fontSize" | "foreColor" | "hiliteColor";
export type LineHeightOption = "1.2" | "1.4" | "1.6" | "1.8";

export type CellAnchor = {
  row: number;
  col: number;
};

export type TableMatrix = {
  matrix: Array<Array<HTMLTableCellElement | null>>;
  anchors: Map<HTMLTableCellElement, CellAnchor>;
};

export type UnmergeContentMode = "keepFirst" | "duplicateAll" | "clearAll" | "splitLines";
export type FlashIntensity = "soft" | "normal" | "strong";
