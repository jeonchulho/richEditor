// 에디터 생성 옵션.
export type RichEditorOptions = {
  storageKey?: string;
  autosaveDelay?: number;
};

// 로컬에 저장되는 UI 설정.
export type EditorUiPrefs = {
  flashIntensity: FlashIntensity;
  unmergeMode: UnmergeContentMode;
  headerPasteMode: HeaderPasteMode;
  debugPanelVisible: boolean;
};

// 툴바/컨텍스트 메뉴에서 실행 가능한 테이블 액션.
export type TableAction =
  | "insert"
  | "tableProps"
  | "cellProps"
  | "rowProps"
  | "colProps"
  | "addRow"
  | "addRowAbove"
  | "addRowBelow"
  | "addCol"
  | "addColLeft"
  | "addColRight"
  | "deleteRow"
  | "deleteCol"
  | "mergeCells"
  | "unmergeCell"
  | "deleteTable";

// 단일 커맨드의 상태 표현.
export type CommandState = "on" | "off" | "mixed";

// inline 텍스트 포맷 커맨드 집합.
export type InlineCommand = "bold" | "italic" | "underline" | "strikeThrough";

// 리스트 커맨드 집합.
export type ListCommand = "insertUnorderedList" | "insertOrderedList";
// 선택/색상 관련 role 식별자.
export type FormattingRole = "fontName" | "fontSize" | "foreColor" | "hiliteColor";
// 줄간격 프리셋.
export type LineHeightOption = "1.2" | "1.4" | "1.6" | "1.8";

// 테이블 매트릭스에서 셀의 기준(anchor) 좌표.
export type CellAnchor = {
  row: number;
  col: number;
};

// 병합 셀을 포함해 좌표 기반 탐색이 가능하도록 구성한 테이블 데이터 구조.
export type TableMatrix = {
  matrix: Array<Array<HTMLTableCellElement | null>>;
  anchors: Map<HTMLTableCellElement, CellAnchor>;
};

// 셀 분리(unmerge) 시 기존 텍스트를 분배하는 정책.
export type UnmergeContentMode = "keepFirst" | "duplicateAll" | "clearAll" | "splitLines";
// 테이블 붙여넣기 시 헤더 처리 정책.
export type HeaderPasteMode = "preserveTarget" | "followSource";
// 병합 미리보기 강조 애니메이션 강도.
export type FlashIntensity = "soft" | "normal" | "strong";
