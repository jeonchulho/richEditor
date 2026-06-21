import {
  ICON_ALIGN_CENTER,
  ICON_ALIGN_FULL,
  ICON_ALIGN_LEFT,
  ICON_ALIGN_RIGHT,
  ICON_BULLET_LIST,
  ICON_CHECKBOX,
  ICON_DEBUG,
  ICON_EMOJI,
  ICON_FORM_BORDER_SCOPE_ALL,
  ICON_FORM_BORDER_SCOPE_INPUT,
  ICON_FORM_LABEL_BOTTOM,
  ICON_FORM_LABEL_LEFT,
  ICON_FORM_LABEL_RIGHT,
  ICON_FORM_LABEL_TOP,
  ICON_FORM_ALIGN_CENTER,
  ICON_FORM_ALIGN_LEFT,
  ICON_FORM_ALIGN_RIGHT,
  ICON_IMAGE,
  ICON_INPUT,
  ICON_MEMO,
  ICON_ORDERED_LIST,
  ICON_RADIO,
  ICON_REDO,
  ICON_SAVE,
  ICON_STATUS_IDLE,
  ICON_TABLE_ADD_COL,
  ICON_TABLE_ADD_ROW,
  ICON_TABLE_ALIGN_CENTER,
  ICON_TABLE_ALIGN_LEFT,
  ICON_TABLE_ALIGN_RIGHT,
  ICON_TABLE_DELETE_COL,
  ICON_TABLE_DELETE_ROW,
  ICON_TABLE_INSERT,
  ICON_TABLE_MERGE,
  ICON_TABLE_UNMERGE,
  ICON_UNDO,
} from "./svg";

// 상단 툴바 마크업 템플릿.
// 그룹 단위로 inline 서식, 리스트, 폰트/색상, 테이블, 삽입, 저장/디버그 기능을 배치한다.
export const TOOLBAR_TEMPLATE = `
  <header class="re-toolbar">
    <div class="re-toolbar-row">
      <div class="re-group-block">
        <div class="re-group re-toolbar-font-group re-group-row">
          <select data-role="fontName" title="Font Family">
            <option value="'Calibri', 'Segoe UI', sans-serif" selected>Calibri</option>
            <option value="'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif">맑은 고딕</option>
            <option value="'Nanum Myeongjo', 'AppleMyungjo', 'Batang', serif">Korean Serif</option>
            <option value="'Manrope', sans-serif">Manrope</option>
            <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Courier New', monospace">Courier New</option>
          </select>
          <select data-role="fontSize" title="Font Size">
            <option value="12px">12</option>
            <option value="13px" selected>13</option>
            <option value="14px">14</option>
            <option value="16px">16</option>
            <option value="18px">18</option>
            <option value="24px">24</option>
            <option value="32px">32</option>
          </select>
          <button class="re-font-step-btn" data-action="fontSizeDecrease" title="폰트 크기 줄이기">A-</button>
          <button class="re-font-step-btn" data-action="fontSizeIncrease" title="폰트 크기 키우기">A+</button>
        </div>
        <div class="re-group re-toolbar-font-group re-group-row">
          <button class="re-icon-btn" data-cmd="bold" title="Bold (Ctrl+B)"><b>B</b></button>
          <button class="re-icon-btn" data-cmd="italic" title="Italic (Ctrl+I)"><i>I</i></button>
          <button class="re-icon-btn" data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>
          <button class="re-icon-btn" data-cmd="strikeThrough" title="Strike"><s>S</s></button>
          <button data-action="textColorPalette" class="re-color-trigger re-color-trigger-text" title="텍스트 색상">
            <span class="re-color-pair-icon re-color-pair-text">A<span class="re-color-pair-bar" data-role="textColorChip"></span></span>
            <span class="re-color-trigger-caret" aria-hidden="true"></span>
          </button>
          <button data-action="bgColorPalette" class="re-color-trigger re-color-trigger-bg" title="배경 색상">
            <span class="re-color-pair-icon re-color-pair-bg">A<span class="re-color-pair-bar" data-role="bgColorChip"></span></span>
            <span class="re-color-trigger-caret" aria-hidden="true"></span>
          </button>
        </div>
      </div>

      <div class="re-group-block">
        <div class="re-group re-group-row">
          <button class="re-icon-btn" data-cmd="justifyLeft" title="텍스트 왼쪽 정렬">
            ${ICON_ALIGN_LEFT}
          </button>
          <button class="re-icon-btn" data-cmd="justifyCenter" title="텍스트 가운데 정렬">
            ${ICON_ALIGN_CENTER}
          </button>
          <button class="re-icon-btn" data-cmd="justifyRight" title="텍스트 오른쪽 정렬">
            ${ICON_ALIGN_RIGHT}
          </button>
          <button class="re-icon-btn" data-cmd="justifyFull" title="텍스트 양쪽 정렬">
            ${ICON_ALIGN_FULL}
          </button>
        </div>
        <div class="re-group re-group-row">
          <button class="re-icon-btn" data-cmd="undo" title="Undo (Ctrl+Z)">
            ${ICON_UNDO}
          </button>
          <button class="re-icon-btn" data-cmd="redo" title="Redo (Ctrl+Y / Ctrl+Shift+Z)">
            ${ICON_REDO}
          </button>
        </div>
      </div>

      <div class="re-group-block">
        <div class="re-group re-group-row">
          <button class="re-icon-btn" data-cmd="insertUnorderedList" title="Bullet List">
            ${ICON_BULLET_LIST}
          </button>
          <button class="re-icon-btn" data-cmd="insertOrderedList" title="Number List">
            ${ICON_ORDERED_LIST}
          </button>
        </div>
        <div class="re-group re-group-row"></div>
      </div>

      <div class="re-group-block">
        <div class="re-group re-table-tools re-group-row">
          <button class="re-icon-btn" data-table="insert" title="Insert Table">
            ${ICON_TABLE_INSERT}
          </button>
          <button class="re-icon-btn" data-table="addRow" title="Add Row Below">
            ${ICON_TABLE_ADD_ROW}
          </button>
          <button class="re-icon-btn" data-table="addCol" title="Add Column Right">
            ${ICON_TABLE_ADD_COL}
          </button>
          <button class="re-icon-btn" data-table="deleteRow" title="Delete Row">
            ${ICON_TABLE_DELETE_ROW}
          </button>
          <button class="re-icon-btn" data-table="deleteCol" title="Delete Column">
            ${ICON_TABLE_DELETE_COL}
          </button>
          <button class="re-icon-btn" data-action="tableAlignLeft" title="테이블 왼쪽 정렬">
            ${ICON_TABLE_ALIGN_LEFT}
          </button>
          <button class="re-icon-btn" data-action="tableAlignCenter" title="테이블 가운데 정렬">
            ${ICON_TABLE_ALIGN_CENTER}
          </button>
          <button class="re-icon-btn" data-action="tableAlignRight" title="테이블 오른쪽 정렬">
            ${ICON_TABLE_ALIGN_RIGHT}
          </button>
        </div>
        <div class="re-group re-table-tools re-group-row">
          <button class="re-icon-btn re-table-merge-btn" data-table="mergeCells" title="Merge Selected Cells (Shift+Click)">
            ${ICON_TABLE_MERGE}
          </button>
          <button class="re-icon-btn re-table-unmerge-btn" data-table="unmergeCell" title="Unmerge Current Cell">
            ${ICON_TABLE_UNMERGE}
          </button>
          <select class="re-template-select" data-role="templatePreset" title="템플릿 삽입">
            <option value="" selected>템플릿</option>
          </select>
          <select data-role="unmergeMode" title="Unmerge Content Distribution" hidden>
            <option value="keepFirst" selected>Keep First</option>
            <option value="duplicateAll">Duplicate</option>
            <option value="clearAll">Clear All</option>
            <option value="splitLines">Split Lines</option>
          </select>
          <select data-role="flashIntensity" title="Preview Flash Intensity" hidden>
            <option value="soft">Soft</option>
            <option value="normal" selected>Normal</option>
            <option value="strong">Strong</option>
          </select>
          <select data-role="headerPasteMode" title="Header Paste Policy" hidden>
            <option value="preserveTarget" selected>Header: Keep</option>
            <option value="followSource">Header: Source</option>
          </select>
        </div>
      </div>

      <div class="re-group-block">
        <div class="re-group re-group-row">
          <button class="re-icon-btn" data-action="emoji" title="Emoji">
            ${ICON_EMOJI}
          </button>
          <button class="re-icon-btn" data-action="image" title="Insert Image">
            ${ICON_IMAGE}
          </button>
          <button class="re-icon-btn" data-action="insertCheckbox" title="체크박스 삽입">
            ${ICON_CHECKBOX}
          </button>
          <button class="re-icon-btn" data-action="insertRadio" title="라디오 버튼 삽입">
            ${ICON_RADIO}
          </button>
          <button class="re-icon-btn" data-action="insertInput" title="입력 필드 삽입">
            ${ICON_INPUT}
          </button>
          <button class="re-icon-btn" data-action="insertMemo" title="메모 필드 삽입">
            ${ICON_MEMO}
          </button>
          <input data-role="imageInput" type="file" accept="image/*" hidden />
        </div>
        <div class="re-group re-group-row"></div>
      </div>

      <div class="re-group-block">
        <div class="re-group re-group-utility re-group-row">
          <button class="re-utility-action" data-action="save" title="Save (Ctrl+S)">
            ${ICON_SAVE}
            <span>Save</span>
          </button>
          <button class="re-utility-action" data-action="toggleDebug" title="Toggle Debug Panel" aria-pressed="false">
            ${ICON_DEBUG}
            <span data-role="debugToggleLabel">Debug Off</span>
          </button>
          <span class="re-status-badge" data-role="saveStatus">
            ${ICON_STATUS_IDLE}
            <span data-role="saveStatusText">Idle</span>
          </span>
        </div>
        <div class="re-group re-group-row"></div>
      </div>
    </div>
  </header>
`;