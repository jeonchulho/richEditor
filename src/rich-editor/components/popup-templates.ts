import {
  ICON_FORM_ALIGN_CENTER,
  ICON_FORM_ALIGN_LEFT,
  ICON_FORM_ALIGN_RIGHT,
  ICON_FORM_BORDER_SCOPE_ALL,
  ICON_FORM_BORDER_SCOPE_INPUT,
  ICON_FORM_LABEL_BOTTOM,
  ICON_FORM_LABEL_LEFT,
  ICON_FORM_LABEL_RIGHT,
  ICON_FORM_LABEL_TOP,
  ICON_TABLE_ALIGN_CENTER,
  ICON_TABLE_ALIGN_LEFT,
  ICON_TABLE_ALIGN_RIGHT,
  ICON_TABLE_DELETE_COL,
  ICON_TABLE_DELETE_ROW,
  ICON_TABLE_INSERT,
  ICON_TABLE_MENU_ADD,
  ICON_TABLE_MENU_ADD_COL_LEFT,
  ICON_TABLE_MENU_ADD_COL_RIGHT,
  ICON_TABLE_MENU_ADD_ROW_ABOVE,
  ICON_TABLE_MENU_ADD_ROW_BELOW,
  ICON_TABLE_MENU_CELL_PROPS,
  ICON_TABLE_MENU_COL_PROPS,
  ICON_TABLE_MENU_DELETE_TABLE,
  ICON_TABLE_MENU_DELETE_COL,
  ICON_TABLE_MENU_DELETE_ROW,
  ICON_TABLE_MENU_MERGE,
  ICON_TABLE_MENU_ROW_PROPS,
  ICON_TABLE_MENU_TABLE_PROPS,
  ICON_TABLE_MENU_UNMERGE,
  ICON_TABLE_MERGE,
  ICON_TABLE_UNMERGE,
} from "./svg";

export const EMOJI_PICKER_TEMPLATE = `
  <div class="re-emoji-picker" hidden></div>
`;

export const COLOR_PALETTE_TEMPLATE = `
  <div class="re-color-palette" data-role="colorPalette" data-mode="both" hidden>
    <button type="button" class="re-color-automatic" data-action="applyAutomaticColor">
      <span class="re-color-automatic-chip" data-role="automaticColorChip"></span>
      <span data-role="automaticColorLabel">자동</span>
    </button>

    <div class="re-color-divider re-color-divider-bottom"></div>

    <div class="re-color-palette-section">
      <p class="re-color-palette-title">테마 색</p>
      <div class="re-color-grid re-color-grid-theme" data-role="themeColorGrid"></div>
    </div>

    <div class="re-color-palette-section">
      <p class="re-color-palette-title">표준 색</p>
      <div class="re-color-grid re-color-grid-standard" data-role="standardColorGrid"></div>
    </div>

    <div class="re-color-palette-section">
      <p class="re-color-palette-title">최근 색</p>
      <div class="re-color-grid re-color-grid-recent" data-role="recentColorGrid"></div>
    </div>

    <div class="re-color-divider"></div>

    <div class="re-color-palette-actions">
      <button type="button" class="re-color-action-btn" data-action="eyedropperColor">스포이드</button>
      <button type="button" class="re-color-action-btn" data-action="moreColors">다른 색</button>
      <input type="color" data-role="moreColorInput" hidden />
    </div>
  </div>
`;

export const TABLE_SIZE_PICKER_TEMPLATE = `
  <div class="re-table-size-picker" hidden>
    <div class="re-table-size-info" data-role="tableSizeInfo">0 x 0</div>
    <div class="re-table-size-grid" data-role="tableSizeGrid"></div>
  </div>
`;

export const MENTION_POPUP_TEMPLATE = `
  <div class="re-mention-popup" data-role="mentionPopup" hidden>
    <div class="re-mention-list" data-role="mentionList"></div>
  </div>
`;

// 초기 렌더에서 항상 필요한 대형 속성 다이얼로그 템플릿.
export const PICKER_POPUPS_TEMPLATE = `
  <div class="re-form-control-props" data-role="formControlPropsDialog" hidden>
    <div class="re-form-control-props-title" data-role="formControlPropsTitle">체크박스 속성</div>
    <div class="re-form-control-props-section-title" data-role="formControlPropsBasicSection">기본 정보</div>
    <label>라벨
      <input type="text" data-role="formControlPropsLabel" placeholder="표시 텍스트" />
    </label>
    <div class="re-form-control-props-section-title" data-role="formControlPropsLabelStyleSection">라벨 디자인</div>
    <label>라벨 폰트
      <div class="re-form-control-font-row re-form-control-label-font-row">
        <select data-role="formControlPropsLabelFontName">
          <option value="'Calibri', 'Segoe UI', sans-serif" selected>Calibri</option>
          <option value="'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif">맑은 고딕</option>
          <option value="'Nanum Myeongjo', 'AppleMyungjo', 'Batang', serif">Korean Serif</option>
          <option value="'Manrope', sans-serif">Manrope</option>
          <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Courier New', monospace">Courier New</option>
        </select>
        <select data-role="formControlPropsLabelFontSize">
          <option value="12px">12</option>
          <option value="13px" selected>13</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="24px">24</option>
          <option value="32px">32</option>
        </select>
        <span data-role="formControlPropsLabelFontColorField">
          <button type="button" class="re-color-trigger re-color-trigger-text" data-action="toggleFormControlColorPalette" data-target="label" title="라벨 글자 색상">
            <span class="re-color-pair re-color-pair-text">
              <span class="re-color-pair-glyph">A</span>
              <span class="re-color-pair-bar" data-role="formControlLabelColorChip"></span>
            </span>
            <span class="re-color-trigger-caret" aria-hidden="true"></span>
          </button>
        </span>
        <span data-role="formControlPropsLabelBgColorField">
          <button type="button" class="re-color-trigger re-color-trigger-bg" data-action="toggleFormControlColorPalette" data-target="labelBg" title="라벨 바탕 색상">
            <span class="re-color-pair re-color-pair-bg">
              <span class="re-color-pair-glyph">A</span>
              <span class="re-color-pair-bar" data-role="formControlLabelBgColorChip"></span>
            </span>
            <span class="re-color-trigger-caret" aria-hidden="true"></span>
          </button>
        </span>
      </div>
      <input type="hidden" data-role="formControlPropsLabelFontColor" value="#111827" />
      <input type="hidden" data-role="formControlPropsLabelBgColor" value="#ffffff" />
    </label>
    <div class="re-color-palette re-form-control-label-color-palette" data-role="formControlColorPalette" hidden>
      <button type="button" class="re-color-automatic" data-action="applyFormControlColorAutomatic">
        <span class="re-color-automatic-chip" data-role="formControlColorAutomaticChip"></span>
        <span>자동</span>
      </button>

      <div class="re-color-divider re-color-divider-bottom"></div>

      <div class="re-color-palette-section">
        <p class="re-color-palette-title">테마 색</p>
        <div class="re-color-grid re-color-grid-theme" data-role="formControlColorThemeColorGrid"></div>
      </div>

      <div class="re-color-palette-section">
        <p class="re-color-palette-title">표준 색</p>
        <div class="re-color-grid re-color-grid-standard" data-role="formControlColorStandardColorGrid"></div>
      </div>

      <div class="re-color-palette-section">
        <p class="re-color-palette-title">최근 색</p>
        <div class="re-color-grid re-color-grid-recent" data-role="formControlColorRecentColorGrid"></div>
      </div>

      <div class="re-color-divider"></div>

      <div class="re-color-palette-actions">
        <button type="button" class="re-color-action-btn" data-action="moreFormControlColors">다른 색</button>
        <input type="color" data-role="formControlColorMoreColorInput" hidden />
      </div>
    </div>
    <label data-role="formControlPropsLabelPositionField">라벨 위치
      <div class="re-form-control-position-row">
        <button type="button" data-action="setFormControlLabelPosition" data-position="left" title="라벨 왼쪽" aria-label="라벨 왼쪽">
          ${ICON_FORM_LABEL_LEFT}
        </button>
        <button type="button" data-action="setFormControlLabelPosition" data-position="right" title="라벨 오른쪽" aria-label="라벨 오른쪽">
          ${ICON_FORM_LABEL_RIGHT}
        </button>
        <button type="button" data-action="setFormControlLabelPosition" data-position="top" title="라벨 위" aria-label="라벨 위">
          ${ICON_FORM_LABEL_TOP}
        </button>
        <button type="button" data-action="setFormControlLabelPosition" data-position="bottom" title="라벨 아래" aria-label="라벨 아래">
          ${ICON_FORM_LABEL_BOTTOM}
        </button>
      </div>
      <input type="hidden" data-role="formControlPropsLabelPosition" value="left" />
    </label>
    <label>라벨 폭(px)
      <input type="number" data-role="formControlPropsLabelWidth" min="0" step="1" placeholder="자동" />
    </label>
    <label data-role="formControlPropsLabelAlignField">라벨 정렬
      <div class="re-form-control-align-row">
        <button type="button" data-action="setFormControlLabelAlign" data-align="left" title="왼쪽 정렬" aria-label="왼쪽 정렬">
          ${ICON_FORM_ALIGN_LEFT}
        </button>
        <button type="button" data-action="setFormControlLabelAlign" data-align="center" title="가운데 정렬" aria-label="가운데 정렬">
          ${ICON_FORM_ALIGN_CENTER}
        </button>
        <button type="button" data-action="setFormControlLabelAlign" data-align="right" title="오른쪽 정렬" aria-label="오른쪽 정렬">
          ${ICON_FORM_ALIGN_RIGHT}
        </button>
      </div>
      <input type="hidden" data-role="formControlPropsLabelAlign" value="left" />
    </label>
    <div class="re-form-control-props-section-title" data-role="formControlPropsTextSection">값 설정</div>
    <label data-role="formControlPropsBorderScopeField">테두리 범위
      <div class="re-form-control-border-row">
        <button type="button" data-action="setFormControlBorderScope" data-border-scope="input" title="입력박스만" aria-label="입력박스만">
          ${ICON_FORM_BORDER_SCOPE_INPUT}
        </button>
        <button type="button" data-action="setFormControlBorderScope" data-border-scope="all" title="라벨 포함 전체" aria-label="라벨 포함 전체">
          ${ICON_FORM_BORDER_SCOPE_ALL}
        </button>
      </div>
      <input type="hidden" data-role="formControlPropsBorderScope" value="input" />
    </label>
    <label data-role="formControlPropsValueFontField">값 폰트
      <div class="re-form-control-font-row re-form-control-value-font-row">
        <select data-role="formControlPropsValueFontName">
          <option value="'Calibri', 'Segoe UI', sans-serif" selected>Calibri</option>
          <option value="'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif">맑은 고딕</option>
          <option value="'Nanum Myeongjo', 'AppleMyungjo', 'Batang', serif">Korean Serif</option>
          <option value="'Manrope', sans-serif">Manrope</option>
          <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Courier New', monospace">Courier New</option>
        </select>
        <select data-role="formControlPropsValueFontSize">
          <option value="12px">12</option>
          <option value="13px" selected>13</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="24px">24</option>
          <option value="32px">32</option>
        </select>
        <span data-role="formControlPropsValueFontColorField">
          <button type="button" class="re-color-trigger re-color-trigger-text" data-action="toggleFormControlColorPalette" data-target="value" title="값 글자 색상">
            <span class="re-color-pair re-color-pair-text">
              <span class="re-color-pair-glyph">A</span>
              <span class="re-color-pair-bar" data-role="formControlValueColorChip"></span>
            </span>
            <span class="re-color-trigger-caret" aria-hidden="true"></span>
          </button>
        </span>
      </div>
      <input type="hidden" data-role="formControlPropsValueFontColor" value="#111827" />
    </label>
    <label data-role="formControlPropsPlaceholderField">placeholder
      <input type="text" data-role="formControlPropsPlaceholder" placeholder="힌트 텍스트" />
    </label>
    <label data-role="formControlPropsValueField">값(value)
      <input type="text" data-role="formControlPropsValue" placeholder="value" />
    </label>
    <div class="re-form-control-props-section-title" data-role="formControlPropsChoiceSection">선택 상태</div>
    <label class="re-form-control-props-checkline" data-role="formControlPropsCheckedField">
      <input type="checkbox" data-role="formControlPropsChecked" />
      <span>선택됨(checked)</span>
    </label>
    <label class="re-form-control-props-checkline" data-role="formControlPropsDisabledField">
      <input type="checkbox" data-role="formControlPropsDisabled" />
      <span>비활성화(disabled)</span>
    </label>
    <div class="re-form-control-props-actions">
      <button type="button" data-action="cancelFormControlProps">취소</button>
      <button type="button" data-action="applyFormControlProps">적용</button>
    </div>
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
          ${ICON_TABLE_MENU_TABLE_PROPS}
        </span>
        <span class="re-table-props-tab-label">테이블</span>
      </button>
      <button type="button" data-table-props-mode="row">
        <span class="re-table-props-tab-icon" aria-hidden="true">
          ${ICON_TABLE_MENU_ROW_PROPS}
        </span>
        <span class="re-table-props-tab-label">행</span>
      </button>
      <button type="button" data-table-props-mode="col">
        <span class="re-table-props-tab-icon" aria-hidden="true">
          ${ICON_TABLE_MENU_COL_PROPS}
        </span>
        <span class="re-table-props-tab-label">열</span>
      </button>
      <button type="button" data-table-props-mode="cell">
        <span class="re-table-props-tab-icon" aria-hidden="true">
          ${ICON_TABLE_MENU_CELL_PROPS}
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
      <label>테이블 마진
        <input type="text" data-role="tablePropsMargin" placeholder="0 auto" />
      </label>
      <label>테이블 패딩
        <input type="text" data-role="tablePropsPadding" placeholder="8" />
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
      <label>행 패딩
        <input type="text" data-role="tablePropsRowPadding" placeholder="8" />
      </label>
      <label>행 마진
        <input type="text" data-role="tablePropsRowMargin" placeholder="0" />
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
      <label>셀 마진
        <input type="text" data-role="tablePropsCellMargin" placeholder="0" />
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
      <label>열 패딩
        <input type="text" data-role="tablePropsColPadding" placeholder="8" />
      </label>
      <label>열 마진
        <input type="text" data-role="tablePropsColMargin" placeholder="0" />
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
        ${ICON_TABLE_MENU_TABLE_PROPS}
      </span>
      <span>테이블 속성</span>
    </button>
    <button type="button" data-table-action="rowProps">
      <span class="re-table-menu-icon" aria-hidden="true">
        ${ICON_TABLE_MENU_ROW_PROPS}
      </span>
      <span>행 속성</span>
    </button>
    <button type="button" data-table-action="cellProps">
      <span class="re-table-menu-icon" aria-hidden="true">
        ${ICON_TABLE_MENU_CELL_PROPS}
      </span>
      <span>셀 속성</span>
    </button>
    <button type="button" data-table-action="colProps">
      <span class="re-table-menu-icon" aria-hidden="true">
        ${ICON_TABLE_MENU_COL_PROPS}
      </span>
      <span>열 속성</span>
    </button>
    <hr />
    <button type="button" data-table-action="mergeCells">
      <span class="re-table-menu-icon" aria-hidden="true">
        ${ICON_TABLE_MENU_MERGE}
      </span>
      <span>셀 병합</span>
    </button>
    <button type="button" data-table-action="unmergeCell">
      <span class="re-table-menu-icon" aria-hidden="true">
        ${ICON_TABLE_MENU_UNMERGE}
      </span>
      <span>셀 분리</span>
    </button>
    <hr />
    <div class="re-context-menu-item" data-submenu="insert">
      <button type="button" class="re-context-submenu-trigger" aria-haspopup="menu" aria-expanded="false">
        <span class="re-table-menu-icon" aria-hidden="true">
          ${ICON_TABLE_MENU_ADD}
        </span>
        <span>추가</span>
        <span class="re-context-submenu-caret" aria-hidden="true">›</span>
      </button>
      <div class="re-context-submenu" data-submenu-for="insert" hidden>
        <button type="button" data-table-action="addRowAbove">
          <span class="re-table-menu-icon" aria-hidden="true">
            ${ICON_TABLE_MENU_ADD_ROW_ABOVE}
          </span>
          <span>행 위에 추가</span>
        </button>
        <button type="button" data-table-action="addRowBelow">
          <span class="re-table-menu-icon" aria-hidden="true">
            ${ICON_TABLE_MENU_ADD_ROW_BELOW}
          </span>
          <span>행 아래에 추가</span>
        </button>
        <button type="button" data-table-action="addColLeft">
          <span class="re-table-menu-icon" aria-hidden="true">
            ${ICON_TABLE_MENU_ADD_COL_LEFT}
          </span>
          <span>열 왼쪽에 추가</span>
        </button>
        <button type="button" data-table-action="addColRight">
          <span class="re-table-menu-icon" aria-hidden="true">
            ${ICON_TABLE_MENU_ADD_COL_RIGHT}
          </span>
          <span>열 오른쪽에 추가</span>
        </button>
      </div>
    </div>
    <button type="button" data-table-action="deleteRow">
      <span class="re-table-menu-icon" aria-hidden="true">
        ${ICON_TABLE_MENU_DELETE_ROW}
      </span>
      <span>행 삭제</span>
    </button>
    <button type="button" data-table-action="deleteCol">
      <span class="re-table-menu-icon" aria-hidden="true">
        ${ICON_TABLE_MENU_DELETE_COL}
      </span>
      <span>열 삭제</span>
    </button>
    <hr />
    <button type="button" data-table-action="deleteTable">
      <span class="re-table-menu-icon re-table-menu-icon-delete" aria-hidden="true">
        ${ICON_TABLE_MENU_DELETE_TABLE}
      </span>
      <span>테이블 삭제</span>
    </button>
  </div>
`;