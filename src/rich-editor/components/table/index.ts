export { buildTableMatrix, collectCellsInRect, getAdjacentCell, getRowEdgeAnchoredCell, getWrappedHorizontalCell, getWrappedVerticalCell, normalizeRectForSpans } from "./table-helpers";
export { handleTableNavigationKeydown } from "./table-navigation";
export { addCol, addRow, deleteCol, deleteRow, deleteTable, mergeCells, unmergeCell } from "./table-ops";
export { clearSelectedCells, handleTableSelectionKeydown, selectCellRectangle, toggleCellSelection } from "./table-selection";
export { TableContextMenuComponent } from "./table-context-menu";
export { TablePropsDialogComponent } from "./table-props-dialog";
export { TableSizePopupRenderer, renderTableSizeGrid, updateTableSizeGridPreview } from "./table-size-popup";
