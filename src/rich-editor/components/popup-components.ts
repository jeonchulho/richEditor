import { STANDARD_COLOR_SWATCHES, THEME_COLOR_SWATCHES } from "../constants";

type AnchorPositionOptions = {
  centerAnchor?: boolean;
};

type TableSizeGridHandlers = {
  onHover: (row: number, col: number) => void;
  onMouseDown: (row: number, col: number, event: MouseEvent) => void;
  onMouseUp: (row: number, col: number, event: MouseEvent) => void;
  onClick: (row: number, col: number) => void;
};

// 이모지 버튼 목록을 렌더링하고 선택 콜백을 연결한다.
export function renderEmojiButtons(
  emojiPicker: HTMLDivElement,
  onSelect: (emoji: string) => void,
): void {
  const emojis = ["😀", "😁", "😂", "🤣", "😊", "😍", "😎", "🤔", "👍", "👏", "🔥", "🎉", "✅", "🚀", "💡", "📌"];
  emojiPicker.innerHTML = "";

  for (const emoji of emojis) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = emoji;
    btn.addEventListener("click", () => onSelect(emoji));
    emojiPicker.appendChild(btn);
  }
}

// 텍스트/배경 색상 스와치를 동적으로 생성한다.
export function renderColorSwatches(root: HTMLElement): void {
  const themeGrid = root.querySelector('[data-role="themeColorGrid"]') as HTMLDivElement;
  const standardGrid = root.querySelector('[data-role="standardColorGrid"]') as HTMLDivElement;
  const recentGrid = root.querySelector('[data-role="recentColorGrid"]') as HTMLDivElement;

  themeGrid.innerHTML = "";
  standardGrid.innerHTML = "";
  recentGrid.innerHTML = "";

  for (const color of THEME_COLOR_SWATCHES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "re-color-swatch";
    button.dataset.colorValue = color;
    button.title = color;
    button.innerHTML = `<span class="re-swatch-preview" style="background:${color}"></span>`;
    themeGrid.appendChild(button);
  }

  for (const color of STANDARD_COLOR_SWATCHES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "re-color-swatch re-color-swatch-standard";
    button.dataset.colorValue = color;
    button.title = color;
    button.innerHTML = `<span class="re-swatch-preview" style="background:${color}"></span>`;
    standardGrid.appendChild(button);
  }

  for (let index = 0; index < 10; index += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "re-color-swatch re-color-swatch-empty";
    button.disabled = true;
    button.title = "최근 색상 없음";
    recentGrid.appendChild(button);
  }
}

// 테이블 삽입 크기 선택(최대 10x10) 그리드를 렌더링한다.
export function renderTableSizeGrid(
  grid: HTMLDivElement,
  handlers: TableSizeGridHandlers,
): void {
  grid.innerHTML = "";

  for (let row = 1; row <= 10; row += 1) {
    for (let col = 1; col <= 10; col += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "re-table-size-cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);

      cell.addEventListener("mouseenter", () => {
        handlers.onHover(row, col);
      });

      cell.addEventListener("mousedown", (event) => {
        handlers.onMouseDown(row, col, event);
      });

      cell.addEventListener("mouseup", (event) => {
        handlers.onMouseUp(row, col, event);
      });

      cell.addEventListener("click", () => {
        handlers.onClick(row, col);
      });

      grid.appendChild(cell);
    }
  }
}

// 현재 hover된 행/열에 맞춰 안내 텍스트와 그리드 하이라이트를 갱신한다.
export function updateTableSizeGridPreview(
  tableSizeInfo: HTMLDivElement,
  tableSizePicker: HTMLDivElement,
  hoverRows: number,
  hoverCols: number,
): void {
  tableSizeInfo.textContent = `${hoverCols} x ${hoverRows}`;

  const cells = tableSizePicker.querySelectorAll(".re-table-size-cell");
  for (const node of Array.from(cells)) {
    const cell = node as HTMLButtonElement;
    const row = Number.parseInt(cell.dataset.row ?? "0", 10);
    const col = Number.parseInt(cell.dataset.col ?? "0", 10);
    const active = row <= hoverRows && col <= hoverCols;
    cell.classList.toggle("is-active", active);
  }
}

// 기준 anchor 요소 근처에 팝업을 배치한다.
// 화면 밖으로 벗어나지 않도록 좌표를 보정한다.
export function positionPopupNearAnchor(
  shell: HTMLElement,
  anchor: HTMLElement,
  popup: HTMLElement,
  options: AnchorPositionOptions = {},
): void {
  const shellRect = shell.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();

  const gap = 8;
  const minLeft = 8;
  const maxLeft = Math.max(minLeft, shellRect.width - popupRect.width - 8);
  const preferredLeft = options.centerAnchor
    ? anchorRect.left - shellRect.left + (anchorRect.width / 2) - (popupRect.width / 2)
    : anchorRect.left - shellRect.left;
  const left = Math.min(maxLeft, Math.max(minLeft, preferredLeft));

  const belowTop = anchorRect.bottom - shellRect.top + gap;
  const aboveTop = anchorRect.top - shellRect.top - popupRect.height - gap;
  const maxTop = Math.max(gap, shellRect.height - popupRect.height - gap);
  const top = belowTop + popupRect.height <= shellRect.height - gap
    ? belowTop
    : Math.max(gap, Math.min(maxTop, aboveTop));

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

// 마우스 좌표(주로 컨텍스트 메뉴 호출 위치)에 팝업을 배치한다.
export function positionPopupAtPoint(
  shell: HTMLElement,
  popup: HTMLElement,
  clientX: number,
  clientY: number,
): void {
  const shellRect = shell.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const gap = 8;
  const minLeft = gap;
  const minTop = gap;
  const maxLeft = Math.max(minLeft, shellRect.width - popupRect.width - gap);
  const maxTop = Math.max(minTop, shellRect.height - popupRect.height - gap);
  const preferredLeft = clientX - shellRect.left;
  const preferredTop = clientY - shellRect.top;
  const left = Math.min(maxLeft, Math.max(minLeft, preferredLeft));
  const top = Math.min(maxTop, Math.max(minTop, preferredTop));

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}
