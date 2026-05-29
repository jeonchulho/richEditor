export function toggleCellSelection(ctx: any, cell: HTMLTableCellElement): void {
  if (ctx.selectedCells.size > 0) {
    const first = Array.from(ctx.selectedCells)[0] as HTMLTableCellElement;
    const firstTable = first.closest("table");
    const currentTable = cell.closest("table");
    if (firstTable !== currentTable) {
      ctx.clearSelectedCells();
    }
  }

  if (ctx.selectedCells.has(cell)) {
    ctx.selectedCells.delete(cell);
    cell.classList.remove("re-cell-selected");
    return;
  }

  ctx.selectedCells.add(cell);
  cell.classList.add("re-cell-selected");
  ctx.setPendingExpandedMerge(false);
  ctx.updateMergePreview();
}

export function selectCellRectangle(ctx: any, startCell: HTMLTableCellElement, endCell: HTMLTableCellElement): void {
  const startTable = startCell.closest("table") as HTMLTableElement | null;
  const endTable = endCell.closest("table") as HTMLTableElement | null;
  if (!startTable || startTable !== endTable) {
    return;
  }

  const tableData = ctx.buildTableMatrix(startTable);
  const startAnchor = tableData.anchors.get(startCell);
  const endAnchor = tableData.anchors.get(endCell);
  if (!startAnchor || !endAnchor) {
    return;
  }

  const minRow = Math.min(startAnchor.row, endAnchor.row);
  const maxRow = Math.max(startAnchor.row, endAnchor.row);
  const minCol = Math.min(startAnchor.col, endAnchor.col);
  const maxCol = Math.max(startAnchor.col, endAnchor.col);

  ctx.clearSelectedCells();

  for (let rowIdx = minRow; rowIdx <= maxRow; rowIdx += 1) {
    for (let colIdx = minCol; colIdx <= maxCol; colIdx += 1) {
      const cell = tableData.matrix[rowIdx]?.[colIdx] ?? null;
      if (!cell) {
        continue;
      }
      ctx.selectedCells.add(cell);
      cell.classList.add("re-cell-selected");
    }
  }

  ctx.setPendingExpandedMerge(false);
  ctx.updateMergePreview();
}

export function clearSelectedCells(ctx: any): void {
  for (const selected of ctx.selectedCells as Set<HTMLTableCellElement>) {
    selected.classList.remove("re-cell-selected");
  }
  ctx.selectedCells.clear();
  ctx.setPendingExpandedMerge(false);
  ctx.clearMergePreview();
}

export function handleTableSelectionKeydown(ctx: any, event: KeyboardEvent): boolean {
  if (!event.shiftKey) {
    return false;
  }

  const key = event.key;
  if (key !== "ArrowUp" && key !== "ArrowDown" && key !== "ArrowLeft" && key !== "ArrowRight") {
    return false;
  }

  const base = (ctx.keyboardFocusCell as HTMLTableCellElement | null) ?? ctx.getSelectedCell();
  if (!base) {
    return false;
  }

  const next = ctx.getAdjacentCell(base, key) as HTMLTableCellElement | null;
  if (!next) {
    return false;
  }

  if (!ctx.keyboardAnchorCell) {
    ctx.keyboardAnchorCell = base;
  }
  ctx.keyboardFocusCell = next;

  ctx.selectCellRectangle(ctx.keyboardAnchorCell, ctx.keyboardFocusCell);
  ctx.placeCaretInCell(next);
  event.preventDefault();
  return true;
}
