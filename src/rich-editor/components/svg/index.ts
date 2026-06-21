const svg = (viewBox: string, body: string, attrs = ""): string =>
  `<svg viewBox="${viewBox}" fill="none" ${attrs}>${body}</svg>`;

export const CHEVRON_DOWN_8 = svg(
  "0 0 8 5",
  `<path d="M1 1l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.1"></path>`,
);

export const TEMPLATE_SELECT_14 = svg(
  "0 0 24 24",
  `<rect x="5" y="3.5" width="14" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"></rect><path d="M9 9.5h6M9 13h6M9 16.5h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>`,
  'width="14" height="14" focusable="false"',
);

export const ICON_ALIGN_LEFT = svg(
  "0 0 24 24",
  `<path d="M5 7h14M5 11h10M5 15h14M5 19h10"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_ALIGN_CENTER = svg(
  "0 0 24 24",
  `<path d="M5 7h14M7 11h10M5 15h14M7 19h10"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_ALIGN_RIGHT = svg(
  "0 0 24 24",
  `<path d="M5 7h14M9 11h10M5 15h14M9 19h10"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_ALIGN_FULL = svg(
  "0 0 24 24",
  `<path d="M5 7h14M5 11h14M5 15h14M5 19h14"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_UNDO = svg(
  "0 0 24 24",
  `<path d="M9 8H4v5"></path><path d="M4 8c1.8-2.2 4.5-3.5 7.5-3.5 4.9 0 8.5 3.2 8.5 8 0 3.8-2.7 6.7-6.5 7.4"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_REDO = svg(
  "0 0 24 24",
  `<path d="M15 8h5v5"></path><path d="M20 8c-1.8-2.2-4.5-3.5-7.5-3.5-4.9 0-8.5 3.2-8.5 8 0 3.8 2.7 6.7 6.5 7.4"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_BULLET_LIST = svg(
  "0 0 24 24",
  `<circle cx="6" cy="7" r="1.3"></circle><circle cx="6" cy="12" r="1.3"></circle><circle cx="6" cy="17" r="1.3"></circle><path d="M10 7h9M10 12h9M10 17h9"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_ORDERED_LIST = svg(
  "0 0 24 24",
  `<path d="M10 7h9M10 12h9M10 17h9"></path><path d="M5 7h1v3"></path><path d="M4.7 13c.3-.6.8-1 1.6-1 .8 0 1.4.5 1.4 1.2 0 .7-.5 1.1-1.1 1.5l-1.2.8h2.4"></path><path d="M5 18h1.8c.7 0 1.2.4 1.2 1s-.5 1-1.2 1H5"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_TABLE_INSERT = svg(
  "0 0 24 24",
  `<rect x="4" y="5" width="11" height="11" rx="1"></rect><path d="M4 10.5h11M9.5 5v11"></path><path d="M18 8v8M14 12h8"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_TABLE_ADD_ROW = svg(
  "0 0 24 24",
  `<rect x="4" y="5" width="12" height="10" rx="1"></rect><path d="M4 10h12"></path><path d="M20 15v6M17 18h6"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_TABLE_ADD_COL = svg(
  "0 0 24 24",
  `<rect x="4" y="5" width="10" height="12" rx="1"></rect><path d="M9 5v12"></path><path d="M18 12v8M14 16h8"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_TABLE_DELETE_ROW = svg(
  "0 0 24 24",
  `<rect x="4" y="5" width="12" height="10" rx="1"></rect><path d="M4 10h12"></path><path d="M17 18h6"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_TABLE_DELETE_COL = svg(
  "0 0 24 24",
  `<rect x="4" y="5" width="10" height="12" rx="1"></rect><path d="M9 5v12"></path><path d="M14 16h8"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_TABLE_ALIGN_LEFT = svg(
  "0 0 24 24",
  `<path d="M4 6v12"></path><rect x="6" y="7" width="11" height="10" rx="1"></rect>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_TABLE_ALIGN_CENTER = svg(
  "0 0 24 24",
  `<path d="M12 4v16"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_TABLE_ALIGN_RIGHT = svg(
  "0 0 24 24",
  `<path d="M20 6v12"></path><rect x="7" y="7" width="11" height="10" rx="1"></rect>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_TABLE_MERGE = svg(
  "0 0 24 24",
  `<rect x="4" y="5" width="16" height="14" rx="1.5"></rect><path d="M4 10h16"></path><path d="M12 5v5"></path><path d="M8 14h3"></path><path d="M16 14h-3"></path><path d="M10 12 12 14 10 16"></path><path d="M14 12 12 14 14 16"></path>`,
  'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_TABLE_UNMERGE = svg(
  "0 0 24 24",
  `<rect x="4" y="5" width="16" height="14" rx="1.5"></rect><path d="M4 10h16"></path><path d="M12 10v9"></path><path d="M9 14H6"></path><path d="M6 14 8 12"></path><path d="M6 14 8 16"></path><path d="M15 14h3"></path><path d="M18 14 16 12"></path><path d="M18 14 16 16"></path>`,
  'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_EMOJI = svg(
  "0 0 24 24",
  `<circle cx="12" cy="12" r="8"></circle><path d="M9 10h.01M15 10h.01"></path><path d="M8.8 14.2c1 .9 1.9 1.3 3.2 1.3s2.2-.4 3.2-1.3"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_IMAGE = svg(
  "0 0 24 24",
  `<rect x="4" y="6" width="16" height="12" rx="1.5"></rect><circle cx="9" cy="10" r="1.2"></circle><path d="M6.5 16l4-4 3 3 2.5-2.5 1.5 1.5"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_CHECKBOX = svg(
  "0 0 24 24",
  `<rect x="4.5" y="4.5" width="15" height="15" rx="2"></rect><path d="M8.2 12.2 11 15l4.8-5.2"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_RADIO = svg(
  "0 0 24 24",
  `<circle cx="12" cy="12" r="7"></circle><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"></circle>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_INPUT = svg(
  "0 0 24 24",
  `<rect x="4" y="6" width="16" height="12" rx="2"></rect><path d="M8 10h6M8 14h8"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_MEMO = svg(
  "0 0 24 24",
  `<path d="M7 4h7l4 4v12H7z"></path><path d="M14 4v4h4M9 12h6M9 15h6"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_SAVE = svg(
  "0 0 24 24",
  `<path d="M12 4v10"></path><path d="M8.5 10.5 12 14l3.5-3.5"></path><path d="M5 18h14"></path>`,
  'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_DEBUG = svg(
  "0 0 24 24",
  `<path d="M9 5h6"></path><rect x="8" y="7.5" width="8" height="8" rx="2"></rect><path d="M12 3.5v2M6.5 11.5h1.5M16 11.5h1.5"></path>`,
  'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_STATUS_IDLE = svg(
  "0 0 24 24",
  `<path d="M6 12h12"></path><path d="M12 6v12"></path>`,
  'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_FORM_LABEL_LEFT = svg(
  "0 0 24 24",
  `<rect x="4" y="7" width="6" height="10" rx="1"></rect><path d="M12 7h8M12 11h8M12 15h8"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_FORM_LABEL_RIGHT = svg(
  "0 0 24 24",
  `<path d="M4 7h8M4 11h8M4 15h8"></path><rect x="14" y="7" width="6" height="10" rx="1"></rect>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_FORM_LABEL_TOP = svg(
  "0 0 24 24",
  `<rect x="7" y="14" width="10" height="6" rx="1"></rect><path d="M7 10h10M10 4v6M14 4v6"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_FORM_LABEL_BOTTOM = svg(
  "0 0 24 24",
  `<path d="M7 4h10M10 4v6M14 4v6"></path><rect x="7" y="11" width="10" height="6" rx="1"></rect>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_FORM_ALIGN_LEFT = svg(
  "0 0 24 24",
  `<path d="M5 7h14M5 11h10M5 15h14M5 19h10"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_FORM_ALIGN_CENTER = svg(
  "0 0 24 24",
  `<path d="M5 7h14M7 11h10M5 15h14M7 19h10"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_FORM_ALIGN_RIGHT = svg(
  "0 0 24 24",
  `<path d="M5 7h14M9 11h10M5 15h14M9 19h10"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_FORM_BORDER_SCOPE_INPUT = svg(
  "0 0 24 24",
  `<rect x="6" y="7" width="12" height="10" rx="1.5"></rect><path d="M8 11h8M8 14h6"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_FORM_BORDER_SCOPE_ALL = svg(
  "0 0 24 24",
  `<rect x="4" y="6" width="16" height="12" rx="1.5"></rect><path d="M7 6v12M7 11h10M11 6v12"></path>`,
  'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"',
);

export const ICON_TABLE_MENU_TABLE_PROPS = svg(
  "0 0 24 24",
  `<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 10h18M9 4v16M15 4v16"></path>`,
  'focusable="false"',
);

export const ICON_TABLE_MENU_ROW_PROPS = svg(
  "0 0 24 24",
  `<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 9h18M3 14h18"></path>`,
  'focusable="false"',
);

export const ICON_TABLE_MENU_CELL_PROPS = svg(
  "0 0 24 24",
  `<rect x="4" y="5" width="16" height="14" rx="2"></rect><path d="M4 10h16M12 5v14"></path>`,
  'focusable="false"',
);

export const ICON_TABLE_MENU_COL_PROPS = svg(
  "0 0 24 24",
  `<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M8 4v16M13 4v16M18 4v16"></path>`,
  'focusable="false"',
);

export const ICON_TABLE_MENU_MERGE = svg(
  "0 0 24 24",
  `<path d="M3 7h18M3 17h18M8 7v10M16 7v10"></path><path d="M8 12h8"></path>`,
  'focusable="false"',
);

export const ICON_TABLE_MENU_UNMERGE = svg(
  "0 0 24 24",
  `<path d="M3 7h18M3 17h18M8 7v10M16 7v10"></path><path d="M12 7v10"></path>`,
  'focusable="false"',
);

export const ICON_TABLE_MENU_ADD = svg(
  "0 0 24 24",
  `<path d="M4 7h16M4 12h16M4 17h16"></path><path d="M12 4v4M10 6h4"></path>`,
  'focusable="false"',
);

export const ICON_TABLE_MENU_ADD_ROW_ABOVE = svg(
  "0 0 24 24",
  `<path d="M4 7h16M4 11h16M4 16h16"></path><path d="M12 3v4M10 5h4"></path>`,
  'focusable="false"',
);

export const ICON_TABLE_MENU_ADD_ROW_BELOW = svg(
  "0 0 24 24",
  `<path d="M4 7h16M4 12h16M4 16h16"></path><path d="M12 17v4M10 19h4"></path>`,
  'focusable="false"',
);

export const ICON_TABLE_MENU_ADD_COL_LEFT = svg(
  "0 0 24 24",
  `<path d="M7 4v16M12 4v16M17 4v16"></path><path d="M3 12h4M5 10v4"></path>`,
  'focusable="false"',
);

export const ICON_TABLE_MENU_ADD_COL_RIGHT = svg(
  "0 0 24 24",
  `<path d="M7 4v16M12 4v16M17 4v16"></path><path d="M17 12h4M19 10v4"></path>`,
  'focusable="false"',
);

export const ICON_TABLE_MENU_DELETE_ROW = svg(
  "0 0 24 24",
  `<path d="M4 7h16M4 12h16M4 17h16"></path><path d="M9 12h6"></path>`,
  'focusable="false"',
);

export const ICON_TABLE_MENU_DELETE_COL = svg(
  "0 0 24 24",
  `<path d="M7 4v16M12 4v16M17 4v16"></path><path d="M12 9v6"></path>`,
  'focusable="false"',
);

export const ICON_TABLE_MENU_DELETE_TABLE = svg(
  "0 0 24 24",
  `<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 10h18M9 5v14M15 5v14"></path><path class="re-table-menu-delete-mark" d="M8.7 8.6l6.6 6.8M15.3 8.6l-6.6 6.8"></path>`,
  'focusable="false"',
);
