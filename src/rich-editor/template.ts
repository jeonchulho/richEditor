import { PICKER_POPUPS_TEMPLATE } from "./components/popup-templates";
import { TOOLBAR_TEMPLATE } from "./components/toolbar-template";

// 에디터 루트 템플릿:
// 툴바, 팝업 레이어, 컨텍스트 메뉴, 편집 영역, 디버그 패널을 조합한다.
export const RICH_EDITOR_TEMPLATE = `
  <section class="re-shell">
    ${TOOLBAR_TEMPLATE}
    ${PICKER_POPUPS_TEMPLATE}
    <article class="re-editor" contenteditable="true" spellcheck="true"></article>
    <section class="re-debug-panel-wrap" data-role="debugPanelWrap">
      <div class="re-debug-panel-toolbar">
        <button type="button" data-action="clearDebugLog" class="re-debug-copy-btn">Clear Logs</button>
        <button type="button" data-action="copyDebugLog" class="re-debug-copy-btn">Copy Logs</button>
      </div>
      <pre class="re-debug-panel" data-role="debugPanel"></pre>
    </section>
  </section>
`;

// 최초 마운트 시 표시할 기본 문서 내용.
export const INITIAL_EDITOR_HTML = `
  <h2>Rich Editor</h2>
  <p>볼드/이탤릭/밑줄/취소선, 리스트, 표, 이미지, 이모지, 저장/복구가 가능한 클래스 기반 에디터입니다.</p>
  <p>표를 삽입한 뒤 첫 행의 우측 경계선을 드래그하면 컬럼 리사이징이 됩니다.</p>
`;
