export function handleTableNavigationKeydown(ctx: any, event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return false;
  }

  const cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell) {
    return false;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    ctx.debugLog(`table nav key=Tab shift=${String(event.shiftKey)} cell=${ctx.describeCell(cell)}`);
    const next = ctx.findAdjacentCellByOrder(cell, event.shiftKey ? -1 : 1) as HTMLTableCellElement | null;
    if (next) {
      ctx.placeCaretInCell(next, "start");
      ctx.keyboardAnchorCell = next;
      ctx.keyboardFocusCell = next;
      return true;
    }

    ctx.debugLog(`table nav edge-lock key=Tab shift=${String(event.shiftKey)} reason=no-adjacent`);
    return true;
  }

  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "ArrowUp" && event.key !== "ArrowDown") {
    return false;
  }

  ctx.debugLog(`table nav key=${event.key} cell=${ctx.describeCell(cell)}`);
  const selection = window.getSelection();
  // Let the browser handle expanded selections in-cell first.
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    ctx.debugLog(`table nav skip key=${event.key} reason=selection-not-collapsed`);
    return false;
  }

  const activeRange = selection.getRangeAt(0);
  if (!cell.contains(activeRange.startContainer)) {
    ctx.debugLog(`table nav skip key=${event.key} reason=range-outside-cell range=${ctx.describeRange(activeRange)}`);
    return false;
  }

  const atStart = ctx.isCaretAtCellBoundary(cell, "start") as boolean;
  const atEnd = ctx.isCaretAtCellBoundary(cell, "end") as boolean;
  ctx.debugLog(`table nav boundaries key=${event.key} atStart=${String(atStart)} atEnd=${String(atEnd)} range=${ctx.describeRange(activeRange)}`);

  const next = ctx.getAdjacentCell(cell, event.key) as HTMLTableCellElement | null;
  if (!next) {
    const shouldLockAtEdge = (
      (event.key === "ArrowLeft" || event.key === "ArrowUp") ? atStart : atEnd
    );
    if (shouldLockAtEdge && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      const wrapped = ctx.getWrappedHorizontalCell(cell, event.key) as HTMLTableCellElement | null;
      if (wrapped) {
        event.preventDefault();
        ctx.placeCaretInCell(wrapped, "start");
        ctx.keyboardAnchorCell = wrapped;
        ctx.keyboardFocusCell = wrapped;
        ctx.debugLog(`table nav wrap key=${event.key} from=${ctx.describeCell(cell)} to=${ctx.describeCell(wrapped)}`);
        return true;
      }
    }

    if (shouldLockAtEdge && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      const wrapped = ctx.getWrappedVerticalCell(cell, event.key) as HTMLTableCellElement | null;
      if (wrapped) {
        event.preventDefault();
        ctx.placeCaretInCell(wrapped, "start");
        ctx.keyboardAnchorCell = wrapped;
        ctx.keyboardFocusCell = wrapped;
        ctx.debugLog(`table nav wrap key=${event.key} from=${ctx.describeCell(cell)} to=${ctx.describeCell(wrapped)}`);
        return true;
      }
    }

    if (shouldLockAtEdge) {
      event.preventDefault();
      ctx.debugLog(`table nav edge-lock key=${event.key} reason=no-adjacent`);
      return true;
    }

    ctx.debugLog(`table nav skip key=${event.key} reason=no-adjacent`);
    return false;
  }

  if (event.key === "ArrowLeft" && !atStart) {
    return false;
  }

  if (event.key === "ArrowRight" && !atEnd) {
    return false;
  }

  if (event.key === "ArrowUp" && !atStart) {
    return false;
  }

  if (event.key === "ArrowDown" && !atEnd) {
    return false;
  }

  event.preventDefault();
  ctx.placeCaretInCell(next, "start");
  ctx.keyboardAnchorCell = next;
  ctx.keyboardFocusCell = next;
  return true;
}
