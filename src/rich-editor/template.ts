import { PICKER_POPUPS_TEMPLATE, TABLE_CONTEXT_MENU_TEMPLATE } from "./components/popup-templates";
import { TOOLBAR_TEMPLATE } from "./components/toolbar-template";

export const RICH_EDITOR_TEMPLATE = `
  <section class="re-shell">
    ${TOOLBAR_TEMPLATE}
    ${PICKER_POPUPS_TEMPLATE}
    ${TABLE_CONTEXT_MENU_TEMPLATE}
    <article class="re-editor" contenteditable="true" spellcheck="true"></article>
    <pre class="re-debug-panel" data-role="debugPanel"></pre>
  </section>
`;

export const INITIAL_EDITOR_HTML = `
  <h2>Rich Editor</h2>
  <p>볼드/이탤릭/밑줄/취소선, 리스트, 표, 이미지, 이모지, 저장/복구가 가능한 클래스 기반 에디터입니다.</p>
  <p>표를 삽입한 뒤 첫 행의 우측 경계선을 드래그하면 컬럼 리사이징이 됩니다.</p>
`;
