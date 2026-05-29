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
`;

export const TABLE_CONTEXT_MENU_TEMPLATE = `
  <div class="re-table-context-menu" data-role="tableContextMenu" hidden>
    <button type="button" data-table-action="mergeCells">셀 병합</button>
    <button type="button" data-table-action="unmergeCell">셀 분리</button>
    <hr />
    <button type="button" data-table-action="addRow">행 추가</button>
    <button type="button" data-table-action="deleteRow">행 삭제</button>
    <button type="button" data-table-action="addCol">열 추가</button>
    <button type="button" data-table-action="deleteCol">열 삭제</button>
    <hr />
    <button type="button" data-table-action="deleteTable">테이블 삭제</button>
  </div>
`;