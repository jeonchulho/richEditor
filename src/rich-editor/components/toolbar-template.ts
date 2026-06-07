// 상단 툴바 마크업 템플릿.
// 그룹 단위로 inline 서식, 리스트, 폰트/색상, 테이블, 삽입, 저장/디버그 기능을 배치한다.
export const TOOLBAR_TEMPLATE = `
  <header class="re-toolbar">
    <div class="re-group">
      <button data-cmd="bold" title="Bold (Ctrl+B)"><b>B</b></button>
      <button data-cmd="italic" title="Italic (Ctrl+I)"><i>I</i></button>
      <button data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>
      <button data-cmd="strikeThrough" title="Strike"><s>S</s></button>
    </div>

    <div class="re-group">
      <button data-cmd="insertUnorderedList" title="Bullet List">• List</button>
      <button data-cmd="insertOrderedList" title="Number List">1. List</button>
    </div>

    <div class="re-group">
      <select data-role="fontName" title="Font Family">
        <option value="'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" selected>맑은 고딕</option>
        <option value="'Nanum Myeongjo', 'AppleMyungjo', 'Batang', serif">Korean Serif</option>
        <option value="'Manrope', sans-serif">Manrope</option>
        <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
        <option value="Georgia, serif">Georgia</option>
        <option value="'Courier New', monospace">Courier New</option>
      </select>
      <select data-role="fontSize" title="Font Size">
        <option value="12px" selected>12</option>
        <option value="14px">14</option>
        <option value="16px">16</option>
        <option value="18px">18</option>
        <option value="24px">24</option>
        <option value="32px">32</option>
      </select>
      <select data-role="lineHeight" title="Line Height">
        <option value="1.2">LH 1.2</option>
        <option value="1.4" selected>LH 1.4</option>
        <option value="1.6">LH 1.6</option>
        <option value="1.8">LH 1.8</option>
      </select>
      <button data-action="colorPalette" class="re-color-trigger" title="텍스트/배경 색상">
        <span class="re-color-trigger-label">A</span>
        <span class="re-color-trigger-chip" data-role="textColorChip"></span>
        <span class="re-color-trigger-chip" data-role="bgColorChip"></span>
        <span class="re-color-trigger-caret">▾</span>
      </button>
    </div>

    <div class="re-group re-table-tools">
      <select data-role="unmergeMode" title="Unmerge Content Distribution">
        <option value="keepFirst" selected>Keep First</option>
        <option value="duplicateAll">Duplicate</option>
        <option value="clearAll">Clear All</option>
        <option value="splitLines">Split Lines</option>
      </select>
      <select data-role="flashIntensity" title="Preview Flash Intensity">
        <option value="soft">Flash Soft</option>
        <option value="normal" selected>Flash Normal</option>
        <option value="strong">Flash Strong</option>
      </select>
      <select data-role="headerPasteMode" title="Header Paste Policy">
        <option value="preserveTarget" selected>Paste Header: Keep Target</option>
        <option value="followSource">Paste Header: Follow Source</option>
      </select>
      <button data-table="insert" title="Insert Table">Table +</button>
      <button data-action="insertWeeklyReportTemplate" title="주간 업무보고서 템플릿 삽입">업무보고서</button>
      <button data-table="addRow" title="Add Row Below">Row +</button>
      <button data-table="addCol" title="Add Column Right">Col +</button>
      <button data-table="deleteRow" title="Delete Row">Row -</button>
      <button data-table="deleteCol" title="Delete Column">Col -</button>
      <button data-table="mergeCells" title="Merge Selected Cells (Shift+Click)">Merge</button>
      <button data-table="unmergeCell" title="Unmerge Current Cell">Unmerge</button>
      <span data-role="mergePreviewBadge" hidden>Preview</span>
      <span data-role="mergeRangeBadge" hidden>0x0</span>
    </div>

    <div class="re-group">
      <button data-action="emoji" title="Emoji">😊</button>
      <button data-action="image" title="Insert Image">Image</button>
      <input data-role="imageInput" type="file" accept="image/*" hidden />
    </div>

    <div class="re-group">
      <button data-cmd="undo" title="Undo (Ctrl+Z)">Undo</button>
      <button data-cmd="redo" title="Redo (Ctrl+Y / Ctrl+Shift+Z)">Redo</button>
      <button data-action="save" title="Save (Ctrl+S)">Save</button>
      <button data-action="toggleDebug" title="Toggle Debug Panel" aria-pressed="false">Debug Off</button>
      <span data-role="saveStatus">Idle</span>
    </div>
  </header>
`;