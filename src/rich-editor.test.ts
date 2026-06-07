import { afterEach, describe, expect, it, vi } from "vitest";
import { RichEditor } from "./rich-editor";

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("RichEditor mention enter handling", () => {
  it("keeps mention autocomplete working on the next line after Enter", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      getMentionMatchAtSelection: () => { query: string; range: Range } | null;
      updateMentionAutocompleteFromSelection: () => void;
      isMentionPopupVisible: () => boolean;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<p>Hello <span class="re-mention-token" contenteditable="false" data-mention="김민지">@김민지</span> </p>';

    const paragraph = editor.querySelector("p") as HTMLParagraphElement;
    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(paragraph, paragraph.childNodes.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
      }),
    );

    const paragraphs = Array.from(editor.querySelectorAll("p"));
    expect(paragraphs.length).toBe(2);

    const nextParagraph = paragraphs[1] as HTMLParagraphElement;
    nextParagraph.innerHTML = "@";

    const nextText = nextParagraph.firstChild;
    if (!(nextText instanceof Text)) {
      throw new Error("next line text node missing");
    }

    const nextRange = document.createRange();
    nextRange.setStart(nextText, nextText.length);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);

    const match = editorInstance.getMentionMatchAtSelection();
    expect(match).not.toBeNull();

    editorInstance.updateMentionAutocompleteFromSelection();

    expect(editorInstance.isMentionPopupVisible()).toBe(true);
  });

  it("filters mention candidates for @김 even when the query spans inline nodes", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      getMentionMatchAtSelection: () => { query: string; range: Range } | null;
      updateMentionAutocompleteFromSelection: () => void;
      isMentionPopupVisible: () => boolean;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<p>@<span>김</span></p>';

    const spanText = editor.querySelector("span")?.firstChild;
    if (!(spanText instanceof Text)) {
      throw new Error("span text node missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(spanText, spanText.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    const match = editorInstance.getMentionMatchAtSelection();
    expect(match?.query).toBe("김");

    editorInstance.updateMentionAutocompleteFromSelection();
    expect(editorInstance.isMentionPopupVisible()).toBe(true);

    const firstCandidate = root.querySelector('[data-role="mentionList"] .re-mention-item') as HTMLButtonElement | null;
    expect(firstCandidate?.textContent).toContain("@김민지");
  });
});

describe("RichEditor IME autosave", () => {
  it("waits for a normal input after compositionend before autosaving", () => {
    vi.useFakeTimers();

    const root = document.createElement("div");
    document.body.appendChild(root);
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");

    new RichEditor(root, { storageKey: "ime-autosave-test", autosaveDelay: 10 });

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.textContent = "전";

    editor.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, cancelable: true }));
    editor.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    vi.advanceTimersByTime(20);
    expect(storageSpy).not.toHaveBeenCalled();

    editor.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, cancelable: true }));
    vi.advanceTimersByTime(20);
    expect(storageSpy).not.toHaveBeenCalled();

    editor.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    vi.advanceTimersByTime(20);

    expect(storageSpy).toHaveBeenCalled();
  });
});

describe("RichEditor mention filtering during composition", () => {
  it("filters while composing Korean text without waiting for composition end", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root, { storageKey: "mention-compose-test" });

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = "<p>@</p>";

    const textNode = editor.querySelector("p")?.firstChild;
    if (!(textNode instanceof Text)) {
      throw new Error("text node missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(textNode, 1);
    range.setEnd(textNode, textNode.length);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, cancelable: true }));
    textNode.textContent = "@김";
    const composedRange = document.createRange();
    composedRange.setStart(textNode, 1);
    composedRange.setEnd(textNode, textNode.length);
    selection.removeAllRanges();
    selection.addRange(composedRange);
    editor.dispatchEvent(new CompositionEvent("compositionupdate", { bubbles: true, cancelable: true, data: "김" }));
    editor.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));

    const mentionList = root.querySelector('[data-role="mentionList"]') as HTMLDivElement;
    expect(mentionList.textContent).toContain("@김민지");
  });

  it("hides mention popup when the caret is on an existing mention token", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      updateMentionAutocompleteFromSelection: () => void;
      isMentionPopupVisible: () => boolean;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<p><span class="re-mention-token" contenteditable="false" data-mention="김민지">@김민지</span></p>';

    const token = editor.querySelector(".re-mention-token") as HTMLElement;
    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStartBefore(token);
    range.setEndAfter(token);
    selection.removeAllRanges();
    selection.addRange(range);

    editorInstance.updateMentionAutocompleteFromSelection();
    expect(editorInstance.isMentionPopupVisible()).toBe(false);
  });
});

describe("RichEditor table insertion trailing paragraph", () => {
  it("keeps an editable paragraph after inserting a table at document end", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      insertTable: (rows: number, cols: number) => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = "<p><br></p>";

    const paragraph = editor.querySelector("p") as HTMLParagraphElement;
    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.selectNodeContents(paragraph);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    editorInstance.insertTable(2, 2);

    const last = editor.lastElementChild as HTMLElement | null;
    expect(last?.tagName.toLowerCase()).toBe("p");
    expect((last as HTMLParagraphElement).innerHTML.toLowerCase()).toContain("br");
  });

  it("does not add a trailing paragraph when a next paragraph already exists", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      insertTrailingParagraphAfterTopLevelAnchor: (anchor: Node) => HTMLParagraphElement | null;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = "<table><tr><td>a</td></tr></table><p>next</p>";

    const anchor = editor.querySelector("table") as HTMLTableElement;
    const inserted = editorInstance.insertTrailingParagraphAfterTopLevelAnchor(anchor);

    expect(inserted).toBeNull();
    const paragraphs = editor.querySelectorAll(":scope > p");
    expect(paragraphs.length).toBe(1);
  });

  it("does not add a trailing paragraph when a next table already exists", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      insertTrailingParagraphAfterTopLevelAnchor: (anchor: Node) => HTMLParagraphElement | null;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = "<table><tr><td>a</td></tr></table><table><tr><td>existing</td></tr></table>";

    const anchor = editor.querySelector("table") as HTMLTableElement;
    const inserted = editorInstance.insertTrailingParagraphAfterTopLevelAnchor(anchor);

    expect(inserted).toBeNull();
    const topLevelParagraphs = editor.querySelectorAll(":scope > p");
    expect(topLevelParagraphs.length).toBe(0);
  });
});