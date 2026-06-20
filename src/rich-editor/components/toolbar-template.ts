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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 7h14M5 11h10M5 15h14M5 19h10"></path>
            </svg>
          </button>
          <button class="re-icon-btn" data-cmd="justifyCenter" title="텍스트 가운데 정렬">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 7h14M7 11h10M5 15h14M7 19h10"></path>
            </svg>
          </button>
          <button class="re-icon-btn" data-cmd="justifyRight" title="텍스트 오른쪽 정렬">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 7h14M9 11h10M5 15h14M9 19h10"></path>
            </svg>
          </button>
          <button class="re-icon-btn" data-cmd="justifyFull" title="텍스트 양쪽 정렬">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 7h14M5 11h14M5 15h14M5 19h14"></path>
            </svg>
          </button>
        </div>
        <div class="re-group re-group-row">
          <button class="re-icon-btn" data-cmd="undo" title="Undo (Ctrl+Z)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 8H4v5"></path>
              <path d="M4 8c1.8-2.2 4.5-3.5 7.5-3.5 4.9 0 8.5 3.2 8.5 8 0 3.8-2.7 6.7-6.5 7.4"></path>
            </svg>
          </button>
          <button class="re-icon-btn" data-cmd="redo" title="Redo (Ctrl+Y / Ctrl+Shift+Z)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M15 8h5v5"></path>
              <path d="M20 8c-1.8-2.2-4.5-3.5-7.5-3.5-4.9 0-8.5 3.2-8.5 8 0 3.8 2.7 6.7 6.5 7.4"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="re-group-block">
        <div class="re-group re-group-row">
          <button class="re-icon-btn" data-cmd="insertUnorderedList" title="Bullet List">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="6" cy="7" r="1.3"></circle>
              <circle cx="6" cy="12" r="1.3"></circle>
              <circle cx="6" cy="17" r="1.3"></circle>
              <path d="M10 7h9M10 12h9M10 17h9"></path>
            </svg>
          </button>
          <button class="re-icon-btn" data-cmd="insertOrderedList" title="Number List">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10 7h9M10 12h9M10 17h9"></path>
              <path d="M5 7h1v3"></path>
              <path d="M4.7 13c.3-.6.8-1 1.6-1 .8 0 1.4.5 1.4 1.2 0 .7-.5 1.1-1.1 1.5l-1.2.8h2.4"></path>
              <path d="M5 18h1.8c.7 0 1.2.4 1.2 1s-.5 1-1.2 1H5"></path>
            </svg>
          </button>
        </div>
        <div class="re-group re-group-row"></div>
      </div>

      <div class="re-group-block">
        <div class="re-group re-table-tools re-group-row">
          <button class="re-icon-btn" data-table="insert" title="Insert Table">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="5" width="11" height="11" rx="1"></rect>
              <path d="M4 10.5h11M9.5 5v11"></path>
              <path d="M18 8v8M14 12h8"></path>
            </svg>
          </button>
          <button class="re-icon-btn" data-table="addRow" title="Add Row Below">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="5" width="12" height="10" rx="1"></rect>
              <path d="M4 10h12"></path>
              <path d="M20 15v6M17 18h6"></path>
            </svg>
          </button>
          <button class="re-icon-btn" data-table="addCol" title="Add Column Right">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="5" width="10" height="12" rx="1"></rect>
              <path d="M9 5v12"></path>
              <path d="M18 12v8M14 16h8"></path>
            </svg>
          </button>
          <button class="re-icon-btn" data-table="deleteRow" title="Delete Row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="5" width="12" height="10" rx="1"></rect>
              <path d="M4 10h12"></path>
              <path d="M17 18h6"></path>
            </svg>
          </button>
          <button class="re-icon-btn" data-table="deleteCol" title="Delete Column">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="5" width="10" height="12" rx="1"></rect>
              <path d="M9 5v12"></path>
              <path d="M14 16h8"></path>
            </svg>
          </button>
          <button class="re-icon-btn" data-action="tableAlignLeft" title="테이블 왼쪽 정렬">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 6v12"></path>
              <rect x="6" y="7" width="11" height="10" rx="1"></rect>
            </svg>
          </button>
          <button class="re-icon-btn" data-action="tableAlignCenter" title="테이블 가운데 정렬">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 4v16"></path>
              <rect x="7" y="7" width="10" height="10" rx="1"></rect>
            </svg>
          </button>
          <button class="re-icon-btn" data-action="tableAlignRight" title="테이블 오른쪽 정렬">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 6v12"></path>
              <rect x="7" y="7" width="11" height="10" rx="1"></rect>
            </svg>
          </button>
        </div>
        <div class="re-group re-table-tools re-group-row">
          <button class="re-icon-btn re-table-merge-btn" data-table="mergeCells" title="Merge Selected Cells (Shift+Click)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="5" width="16" height="14" rx="1.5"></rect>
              <path d="M4 10h16"></path>
              <path d="M12 5v5"></path>
              <path d="M8 14h3"></path>
              <path d="M16 14h-3"></path>
              <path d="M10 12 12 14 10 16"></path>
              <path d="M14 12 12 14 14 16"></path>
            </svg>
          </button>
          <button class="re-icon-btn re-table-unmerge-btn" data-table="unmergeCell" title="Unmerge Current Cell">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="5" width="16" height="14" rx="1.5"></rect>
              <path d="M4 10h16"></path>
              <path d="M12 10v9"></path>
              <path d="M9 14H6"></path>
              <path d="M6 14 8 12"></path>
              <path d="M6 14 8 16"></path>
              <path d="M15 14h3"></path>
              <path d="M18 14 16 12"></path>
              <path d="M18 14 16 16"></path>
            </svg>
          </button>
          <select class="re-template-select" data-role="templatePreset" title="템플릿 삽입">
            <option value="" selected>템플릿</option>
            <option value="weeklyReport">주간 업무보고서</option>
            <option value="meetingNotes">회의록</option>
            <option value="projectStatus">프로젝트 현황</option>
            <option value="dailyChecklist">일일 체크리스트</option>
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8"></circle>
              <path d="M9 10h.01M15 10h.01"></path>
              <path d="M8.8 14.2c1 .9 1.9 1.3 3.2 1.3s2.2-.4 3.2-1.3"></path>
            </svg>
          </button>
          <button class="re-icon-btn" data-action="image" title="Insert Image">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="6" width="16" height="12" rx="1.5"></rect>
              <circle cx="9" cy="10" r="1.2"></circle>
              <path d="M6.5 16l4-4 3 3 2.5-2.5 1.5 1.5"></path>
            </svg>
          </button>
          <button class="re-icon-btn" data-action="insertCheckbox" title="체크박스 삽입">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4.5" y="4.5" width="15" height="15" rx="2"></rect>
              <path d="M8.2 12.2 11 15l4.8-5.2"></path>
            </svg>
          </button>
          <button class="re-icon-btn" data-action="insertRadio" title="라디오 버튼 삽입">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="7"></circle>
              <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"></circle>
            </svg>
          </button>
          <button class="re-icon-btn" data-action="insertInput" title="입력 필드 삽입">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="6" width="16" height="12" rx="2"></rect>
              <path d="M8 10h6M8 14h8"></path>
            </svg>
          </button>
          <button class="re-icon-btn" data-action="insertMemo" title="메모 필드 삽입">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M7 4h7l4 4v12H7z"></path>
              <path d="M14 4v4h4M9 12h6M9 15h6"></path>
            </svg>
          </button>
          <input data-role="imageInput" type="file" accept="image/*" hidden />
        </div>
        <div class="re-group re-group-row"></div>
      </div>

      <div class="re-group-block">
        <div class="re-group re-group-utility re-group-row">
          <button class="re-utility-action" data-action="save" title="Save (Ctrl+S)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 4v10"></path>
              <path d="M8.5 10.5 12 14l3.5-3.5"></path>
              <path d="M5 18h14"></path>
            </svg>
            <span>Save</span>
          </button>
          <button class="re-utility-action" data-action="toggleDebug" title="Toggle Debug Panel" aria-pressed="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 5h6"></path>
              <rect x="8" y="7.5" width="8" height="8" rx="2"></rect>
              <path d="M12 3.5v2M6.5 11.5h1.5M16 11.5h1.5"></path>
            </svg>
            <span data-role="debugToggleLabel">Debug Off</span>
          </button>
          <span class="re-status-badge" data-role="saveStatus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 12h12"></path>
              <path d="M12 6v12"></path>
            </svg>
            <span data-role="saveStatusText">Idle</span>
          </span>
        </div>
        <div class="re-group re-group-row"></div>
      </div>
    </div>
  </header>
`;