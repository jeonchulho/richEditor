import { BG_COLOR_SWATCHES, TEXT_COLOR_SWATCHES } from "../constants";

type AnchorPositionOptions = {
  centerAnchor?: boolean;
};

type TableSizeGridHandlers = {
  onHover: (row: number, col: number) => void;
  onMouseDown: (row: number, col: number, event: MouseEvent) => void;
  onMouseUp: (row: number, col: number, event: MouseEvent) => void;
  onClick: (row: number, col: number) => void;
};

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

export function renderColorSwatches(root: HTMLElement): void {
  const textGrid = root.querySelector('[data-role="textColorGrid"]') as HTMLDivElement;
  const bgGrid = root.querySelector('[data-role="bgColorGrid"]') as HTMLDivElement;
  textGrid.innerHTML = "";
  bgGrid.innerHTML = "";

  for (const color of TEXT_COLOR_SWATCHES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "re-color-swatch";
    button.dataset.colorRole = "foreColor";
    button.dataset.colorValue = color;
    button.title = color;
    button.innerHTML = `<span class="re-swatch-label" style="color:${color}">A</span>`;
    textGrid.appendChild(button);
  }

  const none = document.createElement("button");
  none.type = "button";
  none.className = "re-color-swatch re-color-swatch-none";
  none.dataset.colorRole = "hiliteColor";
  none.dataset.colorValue = "transparent";
  none.title = "배경 없음";
  none.innerHTML = "<span class=\"re-swatch-none-line\"></span>";
  bgGrid.appendChild(none);

  for (const color of BG_COLOR_SWATCHES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "re-color-swatch";
    button.dataset.colorRole = "hiliteColor";
    button.dataset.colorValue = color;
    button.title = color;
    button.innerHTML = `<span class="re-swatch-preview" style="background:${color}"></span>`;
    bgGrid.appendChild(button);
  }
}

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
