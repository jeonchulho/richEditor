import "./styles.css";
import { RichEditor } from "./rich-editor";

const container = document.getElementById("app");
if (!container) {
  throw new Error("Missing app container");
}

new RichEditor(container, {
  storageKey: "rich-editor:content",
  autosaveDelay: 700,
});
