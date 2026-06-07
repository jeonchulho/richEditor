// 툴바에서 여는 picker 팝업(이모지/색상/테이블 크기) 템플릿.
export const PICKER_POPUPS_TEMPLATE = `
  <div class="re-emoji-picker" hidden></div>

  <div class="re-color-palette" data-role="colorPalette" hidden>
    <div class="re-color-palette-section">
      <p class="re-color-palette-title">텍스트 색상</p>
      <div class="re-color-grid" data-role="textColorGrid"></div>
    </div>
    <div class="re-color-palette-section">
      <p class="re-color-palette-title">배경 색</p>
      <div class="re-color-grid" data-role="bgColorGrid"></div>
    </div>
    <button type="button" class="re-color-reset" data-action="resetColors">재설정</button>
  </div>

  <div class="re-table-size-picker" hidden>
    <div class="re-table-size-info" data-role="tableSizeInfo">0 x 0</div>
    <div class="re-table-size-grid" data-role="tableSizeGrid"></div>
  </div>

  <div class="re-mention-popup" data-role="mentionPopup" hidden>
    <div class="re-mention-list" data-role="mentionList"></div>
  </div>

  <div class="re-table-props-backdrop" data-role="tablePropsBackdrop" hidden></div>
  <div class="re-table-props-dialog" data-role="tablePropsDialog" hidden>
    <div class="re-table-props-window-head" data-role="tablePropsDragHandle">
      <div class="re-table-props-head-left">
        <div class="re-table-props-header" data-role="tablePropsTitle">테이블 속성</div>
        <span class="re-table-props-drag-indicator" aria-hidden="true">⋮⋮</span>
      </div>
      <button type="button" class="re-table-props-minimize" data-action="toggleTablePropsCollapse" aria-label="속성 창 최소화" title="최소화">−</button>
    </div>
    <div class="re-table-props-subtitle">실시간 미리보기가 적용됩니다. 취소하면 원래 상태로 복구됩니다.</div>

    <div class="re-table-props-tabs" data-role="tablePropsTabs">
      <button type="button" data-table-props-mode="table">
        <span class="re-table-props-tab-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" focusable="false">
            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
            <path d="M3 10h18M9 4v16M15 4v16"></path>
          </svg>
        </span>
        <span class="re-table-props-tab-label">테이블</span>
      </button>
      <button type="button" data-table-props-mode="row">
        <span class="re-table-props-tab-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" focusable="false">
            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
            <path d="M3 9h18M3 14h18"></path>
          </svg>
        </span>
        <span class="re-table-props-tab-label">행</span>
      </button>
      <button type="button" data-table-props-mode="col">
        <span class="re-table-props-tab-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" focusable="false">
            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
            <path d="M8 4v16M13 4v16M18 4v16"></path>
          </svg>
        </span>
        <span class="re-table-props-tab-label">열</span>
      </button>
      <button type="button" data-table-props-mode="cell">
        <span class="re-table-props-tab-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" focusable="false">
            <rect x="4" y="5" width="16" height="14" rx="2"></rect>
            <path d="M4 10h16M12 5v14"></path>
          </svg>
        </span>
        <span class="re-table-props-tab-label">셀</span>
      </button>
    </div>

    <section class="re-table-props-section" data-role="tablePropsSectionTable">
      <label>너비
        <input type="text" data-role="tablePropsWidth" placeholder="100% 또는 640px" />
      </label>
      <label>테두리 굵기(px)
        <input type="text" data-role="tablePropsBorderWidth" placeholder="1" />
      </label>
      <label>테두리 색상
        <div class="re-table-props-color-field">
          <input type="text" data-role="tablePropsBorderColor" placeholder="#cbd5e1" />
          <input type="color" data-role="tablePropsBorderColorPicker" value="#cbd5e1" />
        </div>
      </label>
      <label>배경 색상
        <div class="re-table-props-color-field">
          <input type="text" data-role="tablePropsBgColor" placeholder="#ffffff" />
          <input type="color" data-role="tablePropsBgColorPicker" value="#ffffff" />
        </div>
      </label>
      <label>정렬
        <select data-role="tablePropsAlign">
          <option value="left">left</option>
          <option value="center">center</option>
          <option value="right">right</option>
        </select>
      </label>
    </section>

    <section class="re-table-props-section" data-role="tablePropsSectionRow" hidden>
      <label>행 높이(px)
        <input type="text" data-role="tablePropsRowHeight" placeholder="36" />
      </label>
      <label>행 배경 색상
        <div class="re-table-props-color-field">
          <input type="text" data-role="tablePropsRowBgColor" placeholder="#f8fafc" />
          <input type="color" data-role="tablePropsRowBgColorPicker" value="#f8fafc" />
        </div>
      </label>
      <label>세로 정렬
        <select data-role="tablePropsRowVAlign">
          <option value="top">top</option>
          <option value="middle">middle</option>
          <option value="bottom">bottom</option>
        </select>
      </label>
    </section>

    <section class="re-table-props-section" data-role="tablePropsSectionCell" hidden>
      <label>테두리 굵기(px)
        <input type="text" data-role="tablePropsCellBorderWidth" placeholder="1" />
      </label>
      <label>테두리 스타일
        <select data-role="tablePropsCellBorderStyle">
          <option value="solid">solid</option>
          <option value="dashed">dashed</option>
          <option value="dotted">dotted</option>
          <option value="double">double</option>
        </select>
      </label>
      <label>개별 테두리(상/우/하/좌)
        <div class="re-table-props-border-sides">
          <input type="text" data-role="tablePropsCellBorderTop" placeholder="top" />
          <input type="text" data-role="tablePropsCellBorderRight" placeholder="right" />
          <input type="text" data-role="tablePropsCellBorderBottom" placeholder="bottom" />
          <input type="text" data-role="tablePropsCellBorderLeft" placeholder="left" />
        </div>
      </label>
      <label>셀 패딩(px)
        <input type="number" data-role="tablePropsCellPadding" min="0" max="64" step="1" placeholder="12" />
        <input type="range" data-role="tablePropsCellPaddingRange" min="0" max="64" step="1" value="12" />
        <div class="re-table-props-padding-presets" data-role="tablePropsCellPaddingPresets">
          <button type="button" data-table-props-cell-padding="8">8</button>
          <button type="button" data-table-props-cell-padding="12">12</button>
          <button type="button" data-table-props-cell-padding="16">16</button>
        </div>
      </label>
      <label>테두리 색상
        <div class="re-table-props-color-field">
          <input type="text" data-role="tablePropsCellBorderColor" placeholder="#cbd5e1" />
          <input type="color" data-role="tablePropsCellBorderColorPicker" value="#cbd5e1" />
        </div>
      </label>
      <label>텍스트 색상
        <div class="re-table-props-color-field">
          <input type="text" data-role="tablePropsCellTextColor" placeholder="#334155" />
          <input type="color" data-role="tablePropsCellTextColorPicker" value="#334155" />
        </div>
      </label>
      <label>셀 배경 색상
        <div class="re-table-props-color-field">
          <input type="text" data-role="tablePropsCellBgColor" placeholder="#ffffff" />
          <input type="color" data-role="tablePropsCellBgColorPicker" value="#ffffff" />
        </div>
      </label>
      <label>가로 정렬
        <select data-role="tablePropsCellAlign">
          <option value="left">left</option>
          <option value="center">center</option>
          <option value="right">right</option>
        </select>
      </label>
      <label>세로 정렬
        <select data-role="tablePropsCellVAlign">
          <option value="top">top</option>
          <option value="middle">middle</option>
          <option value="bottom">bottom</option>
        </select>
      </label>
      <label>줄바꿈
        <select data-role="tablePropsCellWrap">
          <option value="normal">normal</option>
          <option value="break-word">break-word</option>
          <option value="nowrap">nowrap</option>
        </select>
      </label>
    </section>

    <section class="re-table-props-section" data-role="tablePropsSectionCol" hidden>
      <label>열 너비(px)
        <input type="text" data-role="tablePropsColWidth" placeholder="120" />
      </label>
      <label>열 배경 색상
        <div class="re-table-props-color-field">
          <input type="text" data-role="tablePropsColBgColor" placeholder="#f8fafc" />
          <input type="color" data-role="tablePropsColBgColorPicker" value="#f8fafc" />
        </div>
      </label>
      <label>가로 정렬
        <select data-role="tablePropsColAlign">
          <option value="left">left</option>
          <option value="center">center</option>
          <option value="right">right</option>
        </select>
      </label>
    </section>

    <div class="re-table-props-validation" data-role="tablePropsValidation" hidden></div>
    <div class="re-table-props-summary" data-role="tablePropsSummary"></div>
    <div class="re-table-props-recent" data-role="tablePropsRecentWrap">
      <div class="re-table-props-recent-title">최근 사용 색상</div>
      <div class="re-table-props-recent-colors" data-role="tablePropsRecentColors"></div>
    </div>

    <div class="re-table-props-actions">
      <button type="button" data-action="resetTableProps">초기화</button>
      <button type="button" data-action="cancelTableProps">취소</button>
      <button type="button" data-action="applyTableProps">적용</button>
    </div>
  </div>
`;

// 테이블 셀 우클릭 시 표시되는 컨텍스트 메뉴 템플릿.
export const TABLE_CONTEXT_MENU_TEMPLATE = `
  <div class="re-table-context-menu" data-role="tableContextMenu" hidden>
    <button type="button" data-table-action="tableProps">
      <span class="re-table-menu-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 10h18M9 4v16M15 4v16"></path></svg>
      </span>
      <span>테이블 속성</span>
    </button>
    <button type="button" data-table-action="rowProps">
      <span class="re-table-menu-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 9h18M3 14h18"></path></svg>
      </span>
      <span>행 속성</span>
    </button>
    <button type="button" data-table-action="cellProps">
      <span class="re-table-menu-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false"><rect x="4" y="5" width="16" height="14" rx="2"></rect><path d="M4 10h16M12 5v14"></path></svg>
      </span>
      <span>셀 속성</span>
    </button>
    <button type="button" data-table-action="colProps">
      <span class="re-table-menu-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M8 4v16M13 4v16M18 4v16"></path></svg>
      </span>
      <span>열 속성</span>
    </button>
    <hr />
    <button type="button" data-table-action="mergeCells">
      <span class="re-table-menu-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M3 7h18M3 17h18M8 7v10M16 7v10"></path><path d="M8 12h8"></path></svg>
      </span>
      <span>셀 병합</span>
    </button>
    <button type="button" data-table-action="unmergeCell">
      <span class="re-table-menu-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M3 7h18M3 17h18M8 7v10M16 7v10"></path><path d="M12 7v10"></path></svg>
      </span>
      <span>셀 분리</span>
    </button>
    <hr />
    <button type="button" data-table-action="addRowAbove">
      <span class="re-table-menu-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M4 7h16M4 11h16M4 16h16"></path><path d="M12 3v4M10 5h4"></path></svg>
      </span>
      <span>행 위에 추가</span>
    </button>
    <button type="button" data-table-action="addRowBelow">
      <span class="re-table-menu-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M4 7h16M4 12h16M4 16h16"></path><path d="M12 17v4M10 19h4"></path></svg>
      </span>
      <span>행 아래에 추가</span>
    </button>
    <button type="button" data-table-action="deleteRow">
      <span class="re-table-menu-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M4 7h16M4 12h16M4 17h16"></path><path d="M9 12h6"></path></svg>
      </span>
      <span>행 삭제</span>
    </button>
    <button type="button" data-table-action="addColLeft">
      <span class="re-table-menu-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M7 4v16M12 4v16M17 4v16"></path><path d="M3 12h4M5 10v4"></path></svg>
      </span>
      <span>열 왼쪽에 추가</span>
    </button>
    <button type="button" data-table-action="addColRight">
      <span class="re-table-menu-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M7 4v16M12 4v16M17 4v16"></path><path d="M17 12h4M19 10v4"></path></svg>
      </span>
      <span>열 오른쪽에 추가</span>
    </button>
    <button type="button" data-table-action="deleteCol">
      <span class="re-table-menu-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M7 4v16M12 4v16M17 4v16"></path><path d="M12 9v6"></path></svg>
      </span>
      <span>열 삭제</span>
    </button>
    <hr />
    <button type="button" data-table-action="deleteTable">
      <span class="re-table-menu-icon re-table-menu-icon-delete" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 10h18M9 5v14M15 5v14"></path><path class="re-table-menu-delete-mark" d="M8.7 8.6l6.6 6.8M15.3 8.6l-6.6 6.8"></path></svg>
      </span>
      <span>테이블 삭제</span>
    </button>
  </div>
`;