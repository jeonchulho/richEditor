// 앱 진입점:
// 전역 스타일을 로드하고, #app 컨테이너에 RichEditor 인스턴스를 마운트한다.
import "./styles.css";
import { RichEditor } from "./rich-editor";

const container = document.getElementById("app");
if (!container) {
  throw new Error("Missing app container");
}

new RichEditor(container, {
  // 에디터 문서 저장 키(localStorage)
  storageKey: "rich-editor:content",
  // 입력 후 자동 저장 디바운스 지연(ms)
  autosaveDelay: 2000,
});
