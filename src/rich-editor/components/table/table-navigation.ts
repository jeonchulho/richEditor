/**
 * 테이블 내부 키보드 내비게이션을 처리한다.
 * Why: contenteditable 기본 동작만으로는 표 편집기 수준의 예측 가능한 이동을 보장하기 어렵다.
 * How: Tab/Arrow를 가로채고, caret 경계/인접 셀/래핑 가능성에 따라 이동 또는 edge-lock을 적용한다.
 * Pitfall: 선택 범위가 collapsed가 아니거나 셀 밖 range이면 브라우저 기본 동작을 우선해야 충돌이 없다.
 */
export function handleTableNavigationKeydown(ctx: any, event: KeyboardEvent): boolean {
  // 수정 키 조합은 브라우저/OS 단축키 충돌 가능성이 높아 가로채지 않는다.
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return false;
  }

  if (
    event.shiftKey
    && (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown")
  ) {
    // Shift + 화살표는 브라우저 기본 selection 동작으로 위임한다.
    ctx.debugLog(`table nav shift-native-pass key=${event.key}`);
    return false;
  }

  const activeTable = (ctx.activeTableElement && ctx.activeTableElement.isConnected)
    ? (ctx.activeTableElement as HTMLTableElement)
    : null;

  const selection = window.getSelection();
  const activeRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  const rangeElement = activeRange
    ? (activeRange.startContainer instanceof HTMLElement ? activeRange.startContainer : activeRange.startContainer.parentElement)
    : null;
  const rangeInsideTable = Boolean(rangeElement?.closest("table"));

  // 캐럿이 이미 table 밖이면 table-navigation이 개입하지 않게 한다.
  // activeTable 잔상 때문에 no-selected-cell 로그가 연속 발생하며 UX가 흔들리는 것을 방지한다.
  if (!rangeInsideTable) {
    if (activeTable) {
      ctx.setActiveTableElement?.(null);
    }
    return false;
  }

  const inTableContext = rangeInsideTable || Boolean(activeTable);

  let cell = ctx.getSelectedCell() as HTMLTableCellElement | null;
  if (!cell && inTableContext) {

    // 간헐적으로 selection anchor가 셀이 아닌 상위 노드로 잡히면 selected cell 해석이 실패할 수 있다.
    // 이때 최근 키보드 포커스/앵커 셀을 복구 후보로 사용해 화살표 이동을 계속 처리한다.
    const fallbackCandidates = [
      { source: "keyboard-focus", cell: ctx.keyboardFocusCell as HTMLTableCellElement | null },
      { source: "keyboard-anchor", cell: ctx.keyboardAnchorCell as HTMLTableCellElement | null },
      { source: "last-table-anchor", cell: ctx.lastTableAnchorCell as HTMLTableCellElement | null },
    ];

    for (const candidate of fallbackCandidates) {
      const candidateCell = candidate.cell;
      if (!candidateCell || !candidateCell.isConnected) {
        continue;
      }

      const candidateTable = candidateCell.closest("table") as HTMLTableElement | null;
      if (!candidateTable || (activeTable && candidateTable !== activeTable)) {
        continue;
      }

      cell = candidateCell;
      ctx.placeCaretInCell(cell, "start");
      ctx.keyboardAnchorCell = cell;
      ctx.keyboardFocusCell = cell;
      ctx.debugLog(`table nav recover key=${event.key} source=${candidate.source} cell=${ctx.describeCell(cell)}`);
      break;
    }

  }

  if (!cell) {
    if ((event.key === "ArrowUp" || event.key === "ArrowDown") && inTableContext) {
      const desc = activeRange ? ctx.describeRange(activeRange) : "none";
      ctx.debugLog(`table nav skip key=${event.key} reason=no-selected-cell range=${desc}`);
    }

    // 간헐적으로 selection이 셀 대신 table/래퍼에 걸리면 첫행/첫열 경계 탈출이 막힐 수 있다.
    // active table이 있으면 boundary cell 기준으로 밖으로 이동하는 폴백을 제공한다.
    if (activeTable && (event.key === "ArrowUp" || event.key === "ArrowLeft")) {
      const edgeCell = event.key === "ArrowUp"
        ? (ctx.getFirstTableCell(activeTable) as HTMLTableCellElement | null)
        : (ctx.getFirstTableCell(activeTable) as HTMLTableCellElement | null);
      if (edgeCell) {
        event.preventDefault();
        const movedOut = (event.key === "ArrowUp"
          ? ctx.placeCaretOutsideTableFromCell(edgeCell, "up")
          : ctx.placeCaretOutsideTableHorizontalFromCell?.(edgeCell, "before")) as boolean;
        if (movedOut) {
          ctx.debugLog(`table nav active-table-exit key=${event.key} source=no-selected-cell from=${ctx.describeCell(edgeCell)}`);
          return true;
        }
        ctx.debugLog(`table nav active-table-exit-failed key=${event.key} source=no-selected-cell`);
        return true;
      }
    }

    return false;
  }

  if (event.key === "Tab") {
    // Tab은 셀 순서 이동을 강제해 표 편집기처럼 동작시킨다.
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
  const keySelection = window.getSelection();
  // 셀 내부에서 텍스트가 선택된 상태라면 기본 브라우저 선택 이동을 우선한다.
  if (!keySelection || keySelection.rangeCount === 0 || !keySelection.isCollapsed) {
    ctx.debugLog(`table nav skip key=${event.key} reason=selection-not-collapsed`);
    return false;
  }

  const keyRange = keySelection.getRangeAt(0);
  if (!cell.contains(keyRange.startContainer)) {
    ctx.debugLog(`table nav skip key=${event.key} reason=range-outside-cell range=${ctx.describeRange(keyRange)}`);
    return false;
  }

  const next = ctx.getAdjacentCell(cell, event.key) as HTMLTableCellElement | null;
  if (!next && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
    // 첫/마지막 행 탈출은 경계값(atStart/atEnd)과 무관한 정책이므로
    // 혼란을 줄이기 위해 boundary 로그보다 먼저 분기 처리한다.
    event.preventDefault();
    ctx.debugLog(
      `table nav edge-exit key=${event.key} reason=${event.key === "ArrowUp" ? "first-row" : "last-row"} from=${ctx.describeCell(cell)}`,
    );
    const movedOut = ctx.placeCaretOutsideTableFromCell(
      cell,
      event.key === "ArrowUp" ? "up" : "down",
    ) as boolean;
    if (movedOut) {
      return true;
    }

    ctx.debugLog(`table nav edge-lock key=${event.key} reason=outside-move-failed`);
    return true;
  }

  const atStart = ctx.isCaretAtCellBoundary(cell, "start") as boolean;
  const atEnd = ctx.isCaretAtCellBoundary(cell, "end") as boolean;
  ctx.debugLog(`table nav boundaries key=${event.key} atStart=${String(atStart)} atEnd=${String(atEnd)} range=${ctx.describeRange(keyRange)}`);
  if (!next) {
    // 인접 셀이 없을 때는 경계 여부에 따라 wrap 또는 edge-lock을 적용한다.
    const shouldLockAtEdge = event.key === "ArrowLeft" ? atStart : atEnd;
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

      const movedOut = ctx.placeCaretOutsideTableHorizontalFromCell?.(
        cell,
        event.key === "ArrowRight" ? "after" : "before",
      ) as boolean;
      if (movedOut) {
        ctx.debugLog(
          `table nav horizontal-exit key=${event.key} from=${ctx.describeCell(cell)} to=${event.key === "ArrowRight" ? "after-table" : "before-table"}`,
        );
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
    // 셀 내부에 왼쪽으로 이동할 텍스트가 남아 있으면 브라우저 기본 캐럿 이동을 허용한다.
    ctx.debugLog(`table nav skip key=${event.key} reason=inside-cell-not-at-start cell=${ctx.describeCell(cell)}`);
    return false;
  }

  if (event.key === "ArrowRight" && !atEnd) {
    // 셀 내부에 오른쪽으로 이동할 텍스트가 남아 있으면 브라우저 기본 캐럿 이동을 허용한다.
    ctx.debugLog(`table nav skip key=${event.key} reason=inside-cell-not-at-end cell=${ctx.describeCell(cell)}`);
    return false;
  }

  event.preventDefault();
  ctx.debugLog(`table nav inside-move key=${event.key} from=${ctx.describeCell(cell)} to=${ctx.describeCell(next)}`);
  ctx.placeCaretInCell(next, "start");
  ctx.keyboardAnchorCell = next;
  ctx.keyboardFocusCell = next;
  return true;
}
