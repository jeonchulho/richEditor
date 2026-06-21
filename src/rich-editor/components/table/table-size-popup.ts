type TableSizeGridHandlers = {
  onHover: (row: number, col: number) => void;
  onMouseDown: (row: number, col: number, event: MouseEvent) => void;
  onMouseUp: (row: number, col: number, event: MouseEvent) => void;
  onClick: (row: number, col: number) => void;
};

export class TableSizePopupRenderer {
  // 테이블 삽입 크기 선택(최대 10x10) 그리드를 렌더링한다.
  public static renderGrid(
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
  public static updateGridPreview(
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
}

export const renderTableSizeGrid = TableSizePopupRenderer.renderGrid;
export const updateTableSizeGridPreview = TableSizePopupRenderer.updateGridPreview;
