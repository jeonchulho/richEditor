import type { CellAnchor } from "../types";

export function addRow(ctx: any): void {
  const cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell) {
    return;
  }

  const row = cell.parentElement as HTMLTableRowElement;
  const table = row.closest("table");
  if (!table) {
    return;
  }

  const newRow = document.createElement("tr");
  const columnCount = row.cells.length;

  for (let i = 0; i < columnCount; i += 1) {
    const newCell = document.createElement("td");
    newCell.contentEditable = "true";
    newCell.style.minWidth = "80px";
    newCell.innerHTML = "<br>";
    ctx.applyBodyCellTypography(newCell);
    newRow.appendChild(newCell);
  }

  row.insertAdjacentElement("afterend", newRow);
  ctx.enableTableColumnResize(table as HTMLTableElement);
  ctx.debouncedSave();
}

export function addCol(ctx: any): void {
  const cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell) {
    return;
  }

  const row = cell.parentElement as HTMLTableRowElement;
  const table = row.closest("table") as HTMLTableElement | null;
  if (!table) {
    return;
  }

  const colIndex = Array.from(row.cells).indexOf(cell);
  for (const tr of Array.from(table.rows)) {
    const newCell = document.createElement("td");
    newCell.contentEditable = "true";
    newCell.style.minWidth = "80px";
    ctx.applyBodyCellTypography(newCell as HTMLTableCellElement);
    if (tr.rowIndex === 0) {
      newCell.classList.add("re-table-header-cell");
      newCell.textContent = "Header";
    } else {
      newCell.innerHTML = "<br>";
    }

    const refCell = tr.cells[colIndex + 1];
    if (refCell) {
      tr.insertBefore(newCell, refCell);
    } else {
      tr.appendChild(newCell);
    }
  }

  ctx.enableTableColumnResize(table);
  ctx.debouncedSave();
}

export function deleteRow(ctx: any): void {
  const cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell) {
    return;
  }

  const row = cell.parentElement as HTMLTableRowElement | null;
  const table = row?.closest("table") as HTMLTableElement | null;
  if (!row || !table) {
    return;
  }

  const rowIndex = row.rowIndex;
  const colIndex = Array.from(row.cells).indexOf(cell);

  const nextRow = row.nextElementSibling as HTMLTableRowElement | null;
  const prevRow = row.previousElementSibling as HTMLTableRowElement | null;
  row.remove();

  if (table.rows.length === 0) {
    table.remove();
    ctx.insertNodeAtCaret(document.createElement("p"));
    ctx.debouncedSave();
    return;
  }

  ctx.updateTableResizeHandleLayout(table);
  const fallbackRow = table.rows[rowIndex] ?? prevRow ?? nextRow ?? table.rows[rowIndex - 1] ?? table.rows[0] ?? null;
  const fallbackCell = (fallbackRow?.cells[colIndex] ?? fallbackRow?.cells[colIndex - 1] ?? fallbackRow?.cells[0] ?? null) as HTMLTableCellElement | null;
  if (fallbackCell) {
    ctx.placeCaretInCell(fallbackCell as HTMLTableCellElement, "start");
  }

  ctx.debouncedSave();
}

export function deleteCol(ctx: any): void {
  const cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell) {
    return;
  }

  const row = cell.parentElement as HTMLTableRowElement | null;
  const table = row?.closest("table") as HTMLTableElement | null;
  if (!row || !table) {
    return;
  }

  const rowIndex = row.rowIndex;
  const colIndex = Array.from(row.cells).indexOf(cell);
  if (colIndex < 0) {
    return;
  }

  for (const currentRow of Array.from(table.rows)) {
    const targetCell = currentRow.cells[colIndex] as HTMLTableCellElement | undefined;
    if (targetCell) {
      targetCell.remove();
    }
  }

  if (table.rows[0]?.cells.length === 0) {
    table.remove();
    ctx.insertNodeAtCaret(document.createElement("p"));
    ctx.debouncedSave();
    return;
  }

  ctx.updateTableResizeHandleLayout(table);
  const fallbackRow = table.rows[rowIndex] ?? table.rows[rowIndex - 1] ?? table.rows[rowIndex + 1] ?? table.rows[0] ?? null;
  const fallbackCell = (fallbackRow?.cells[colIndex] ?? fallbackRow?.cells[colIndex - 1] ?? fallbackRow?.cells[0] ?? null) as HTMLTableCellElement | null;
  if (fallbackCell) {
    ctx.placeCaretInCell(fallbackCell as HTMLTableCellElement, "start");
  }

  ctx.debouncedSave();
}

export function deleteTable(ctx: any): void {
  const cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell) {
    return;
  }

  const table = cell.closest("table") as HTMLTableElement | null;
  if (!table) {
    return;
  }

  const placeholder = document.createElement("p");
  placeholder.innerHTML = "<br>";
  table.insertAdjacentElement("afterend", placeholder);

  ctx.clearSelectedCells();
  ctx.keyboardAnchorCell = null;
  ctx.keyboardFocusCell = null;
  table.remove();

  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(placeholder);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    ctx.captureSelection();
  }

  ctx.showSaveStatus("Table deleted");
  ctx.debouncedSave();
}

export function mergeCells(ctx: any): void {
  if (ctx.selectedCells.size > 1) {
    mergeSelectedCellBlock(ctx);
    return;
  }

  mergeRightCell(ctx);
}

function mergeRightCell(ctx: any): void {
  const cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell) {
    return;
  }

  const right = cell.nextElementSibling as HTMLTableCellElement | null;
  if (!right) {
    return;
  }

  const currentColspan = Number.parseInt(cell.getAttribute("colspan") ?? "1", 10);
  const rightColspan = Number.parseInt(right.getAttribute("colspan") ?? "1", 10);
  cell.colSpan = currentColspan + rightColspan;
  cell.innerHTML = `${cell.innerHTML} ${right.innerHTML}`.trim();
  right.remove();

  const table = cell.closest("table");
  if (table) {
    ctx.enableTableColumnResize(table as HTMLTableElement);
  }
  ctx.debouncedSave();
}

function mergeSelectedCellBlock(ctx: any): void {
  const selected = Array.from(ctx.selectedCells) as HTMLTableCellElement[];
  if (selected.length < 2) {
    return;
  }

  const table = selected[0].closest("table") as HTMLTableElement | null;
  if (!table) {
    ctx.clearSelectedCells();
    return;
  }

  const tableData = ctx.buildTableMatrix(table);
  const anchors = selected.map((cell) => tableData.anchors.get(cell)).filter((item): item is CellAnchor => Boolean(item));
  if (anchors.length !== selected.length) {
    ctx.clearSelectedCells();
    return;
  }

  const minRow = Math.min(...anchors.map((item) => item.row));
  const maxRow = Math.max(...anchors.map((item) => item.row));
  const minCol = Math.min(...anchors.map((item) => item.col));
  const maxCol = Math.max(...anchors.map((item) => item.col));

  const normalized = ctx.normalizeRectForSpans(tableData, minRow, maxRow, minCol, maxCol);

  const normalizedCells = ctx.collectCellsInRect(tableData, normalized.minRow, normalized.maxRow, normalized.minCol, normalized.maxCol) as HTMLTableCellElement[];
  const uncovered = normalizedCells.filter((cell) => !ctx.selectedCells.has(cell));

  if (uncovered.length > 0 && !ctx.pendingExpandedMerge) {
    ctx.setPendingExpandedMerge(true);
    ctx.updateMergePreview();
    ctx.showSaveStatus("Preview ready. Press Merge again to include expanded area.");
    return;
  }

  if (uncovered.length > 0 && ctx.pendingExpandedMerge) {
    for (const cell of normalizedCells) {
      ctx.selectedCells.add(cell);
      cell.classList.add("re-cell-selected");
    }
    ctx.showSaveStatus("Merged with expanded area");
  }

  const blockCells: HTMLTableCellElement[] = [];

  for (let r = normalized.minRow; r <= normalized.maxRow; r += 1) {
    for (let c = normalized.minCol; c <= normalized.maxCol; c += 1) {
      const cell = tableData.matrix[r]?.[c] ?? null;
      if (!cell) {
        ctx.clearSelectedCells();
        ctx.showSaveStatus("Cannot merge: invalid table selection");
        return;
      }
      if (!blockCells.includes(cell)) {
        blockCells.push(cell);
      }
    }
  }

  const master = tableData.matrix[normalized.minRow]?.[normalized.minCol] ?? null;
  if (!master) {
    ctx.clearSelectedCells();
    ctx.showSaveStatus("Cannot merge: missing anchor cell");
    return;
  }
  const mergedTexts = blockCells
    .map((currentCell) => currentCell.textContent?.trim() ?? "")
    .filter((text) => text.length > 0)
    .join("\n");

  master.rowSpan = normalized.maxRow - normalized.minRow + 1;
  master.colSpan = normalized.maxCol - normalized.minCol + 1;
  if (mergedTexts) {
    master.textContent = mergedTexts;
  }

  const removable = blockCells.filter((currentCell) => currentCell !== master);
  for (const removableCell of removable) {
    removableCell.remove();
  }

  ctx.clearSelectedCells();
  ctx.enableTableColumnResize(table);
  ctx.debouncedSave();
}

export function unmergeCell(ctx: any): void {
  const cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell) {
    return;
  }

  const rowSpan = cell.rowSpan || 1;
  const colSpan = cell.colSpan || 1;
  if (rowSpan === 1 && colSpan === 1) {
    return;
  }

  const row = cell.parentElement as HTMLTableRowElement;
  const table = row.closest("table") as HTMLTableElement | null;
  if (!table) {
    return;
  }

  const tableData = ctx.buildTableMatrix(table);
  const anchor = tableData.anchors.get(cell) as CellAnchor | undefined;
  if (!anchor) {
    return;
  }

  const startRowIndex = anchor.row;
  const startColIndex = anchor.col;
  const isHeader = cell.tagName.toLowerCase() === "th";
  const sourceText = cell.textContent ?? "";
  const mode = ctx.getUnmergeContentMode();
  const targetSlots: HTMLTableCellElement[] = [cell];
  const currentStyle = window.getComputedStyle(ctx.getSelectionElement() ?? ctx.editor);

  if (mode === "clearAll") {
    cell.textContent = "";
  }

  cell.rowSpan = 1;
  cell.colSpan = 1;

  for (let r = startRowIndex; r < startRowIndex + rowSpan; r += 1) {
    const targetRow = table.rows[r];
    if (!targetRow) {
      continue;
    }

    for (let c = startColIndex; c < startColIndex + colSpan; c += 1) {
      if (r === startRowIndex && c === startColIndex) {
        continue;
      }

      const newCell = document.createElement(isHeader && r === 0 ? "th" : "td");
      newCell.contentEditable = "true";
      newCell.style.minWidth = "80px";
      if (newCell.tagName.toLowerCase() === "td") {
        ctx.applyBodyCellTypography(newCell as HTMLTableCellElement);
      } else {
        newCell.style.fontFamily = currentStyle.fontFamily;
        newCell.style.fontSize = currentStyle.fontSize;
      }

      if (mode === "duplicateAll") {
        newCell.textContent = sourceText;
      } else {
        newCell.innerHTML = "<br>";
      }

      const ref = Array.from(targetRow.cells).find((current) => {
        const position = tableData.anchors.get(current as HTMLTableCellElement) as CellAnchor | undefined;
        return Boolean(position && position.col > c);
      }) ?? null;

      if (ref) {
        targetRow.insertBefore(newCell, ref);
      } else {
        targetRow.appendChild(newCell);
      }

      targetSlots.push(newCell);
    }
  }

  if (mode === "splitLines") {
    distributeLinesAcrossCells(sourceText, targetSlots);
  }

  ctx.enableTableColumnResize(table);
  ctx.debouncedSave();
  ctx.showSaveStatus(`Unmerged (${mode})`);
}

function distributeLinesAcrossCells(text: string, cells: HTMLTableCellElement[]): void {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    for (const cell of cells) {
      cell.textContent = "";
    }
    return;
  }

  for (let i = 0; i < cells.length; i += 1) {
    cells[i].textContent = lines[i] ?? "";
  }
}
