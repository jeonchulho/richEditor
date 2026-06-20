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

  it("marks next input to skip normalization when pressing Enter", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      consumeSkipNormalizeOnNextInput: () => boolean;
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
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
    }));

    expect(editorInstance.consumeSkipNormalizeOnNextInput()).toBe(true);
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

  it("inserts table outside paragraph when caret is inside a top-level paragraph", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      insertTable: (rows: number, cols: number) => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = "<p>hello world</p>";

    const textNode = editor.querySelector("p")?.firstChild;
    if (!(textNode instanceof Text)) {
      throw new Error("paragraph text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(textNode, 3);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editorInstance.insertTable(2, 2);

    const paragraph = editor.querySelector(":scope > p") as HTMLParagraphElement | null;
    const tableWrap = editor.querySelector(":scope > div.re-table-wrap") as HTMLDivElement | null;
    const table = tableWrap?.querySelector(":scope > table") as HTMLTableElement | null;
    expect(paragraph).not.toBeNull();
    expect(tableWrap).not.toBeNull();
    expect(table).not.toBeNull();
    expect(paragraph?.contains(table as Node)).toBe(false);
  });
});

describe("RichEditor mention leading Home key", () => {
  it("moves caret to the start of the line when the line begins with a mention token", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<p><span class="re-mention-token" contenteditable="false" data-mention="김민지">@김민지</span> 하하</p>';

    const tailText = editor.querySelector("p")?.lastChild;
    if (!(tailText instanceof Text)) {
      throw new Error("tail text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(tailText, tailText.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Home",
    }));

    const nextSelection = window.getSelection();
    expect(nextSelection?.rangeCount).toBe(1);
    const nextRange = nextSelection?.getRangeAt(0) ?? null;
    const paragraph = editor.querySelector("p") as HTMLParagraphElement;
    expect(nextRange?.startContainer).toBe(paragraph);
    expect(nextRange?.startOffset).toBe(0);
    expect(nextRange?.collapsed).toBe(true);
  });
});

describe("RichEditor completed mention popup suppression", () => {
  it("does not reopen popup from completed mention text at mention boundary", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      updateMentionAutocompleteFromSelection: () => void;
      isMentionPopupVisible: () => boolean;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    const paragraph = document.createElement("p");
    const token = document.createElement("span");
    token.className = "re-mention-token";
    token.contentEditable = "false";
    token.dataset.mention = "박준호";
    token.textContent = "@박준호";
    paragraph.appendChild(token);
    paragraph.appendChild(document.createTextNode(" "));
    paragraph.appendChild(document.createTextNode("아니다"));
    editor.innerHTML = "";
    editor.appendChild(paragraph);

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    // 토큰 바로 뒤 경계(caretNode=paragraph)에서도 완성 토큰 기반 재매칭으로 팝업이 열리면 안 된다.
    range.setStart(paragraph, 1);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editorInstance.updateMentionAutocompleteFromSelection();
    expect(editorInstance.isMentionPopupVisible()).toBe(false);
  });
});

describe("RichEditor table structure normalization", () => {
  it("moves invalid direct paragraph child out of table", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      normalizeTopLevelParagraphs: () => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = "";

    const table = document.createElement("table");
    table.className = "re-table";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = "cell";
    tr.appendChild(td);
    table.appendChild(tr);

    const invalidParagraph = document.createElement("p");
    invalidParagraph.textContent = "outside target";
    table.appendChild(invalidParagraph);
    editor.appendChild(table);

    editorInstance.normalizeTopLevelParagraphs();

    expect(table.querySelector(":scope > p")).toBeNull();
    expect(editor.firstElementChild?.tagName.toLowerCase()).toBe("table");
    expect(editor.lastElementChild?.tagName.toLowerCase()).toBe("p");
    expect((editor.lastElementChild as HTMLParagraphElement).textContent).toBe("outside target");
  });

  it("moves invalid paragraph under tbody out of table", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      normalizeTopLevelParagraphs: () => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = "";

    const table = document.createElement("table");
    table.className = "re-table";
    const tbody = document.createElement("tbody");
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = "cell";
    tr.appendChild(td);
    tbody.appendChild(tr);

    const invalidParagraph = document.createElement("p");
    invalidParagraph.textContent = "tbody invalid";
    tbody.appendChild(invalidParagraph);

    table.appendChild(tbody);
    editor.appendChild(table);

    editorInstance.normalizeTopLevelParagraphs();

    expect(table.querySelector("tbody > p")).toBeNull();
    expect(editor.firstElementChild?.tagName.toLowerCase()).toBe("table");
    expect(editor.lastElementChild?.tagName.toLowerCase()).toBe("p");
    expect((editor.lastElementChild as HTMLParagraphElement).textContent).toBe("tbody invalid");
  });

  it("removes redundant empty paragraphs around table and keeps one clean trailing paragraph", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      normalizeTopLevelParagraphs: () => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<table class="re-table"><tbody><tr><td>cell</td></tr></tbody></table>',
      "<p></p>",
      "<p></p>",
      '<p style="font-size: 12px !important;">\u200B</p>',
      "<p></p>",
    ].join("");

    editorInstance.normalizeTopLevelParagraphs();

    const paragraphs = Array.from(editor.querySelectorAll(":scope > p")) as HTMLParagraphElement[];
    expect(paragraphs.length).toBe(1);
    expect(paragraphs[0]?.getAttribute("style")).toBeNull();
    expect(paragraphs[0]?.innerHTML.toLowerCase()).toContain("br");
  });

  it("wraps inserted table with div.re-table-wrap", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      insertTable: (rows: number, cols: number) => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = "<p>some text</p>";
    const paragraph = editor.querySelector("p") as HTMLParagraphElement;
    
    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    const textNode = paragraph.firstChild;
    range.setStart(textNode as Node, 5);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editorInstance.insertTable(2, 3);

    const wrapper = editor.querySelector(":scope > div.re-table-wrap") as HTMLDivElement | null;
    const wrappedTable = wrapper?.querySelector(":scope > table.re-table") as HTMLTableElement | null;

    expect(wrapper).not.toBeNull();
    expect(wrappedTable).not.toBeNull();
  });

  it("removes table wrapper when deleting a table", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      deleteTable: () => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<div class="re-table-wrap">',
      '<table class="re-table"><tr><td contenteditable="true">A</td></tr></table>',
      "</div>",
      "<p><br></p>",
    ].join("");

    const cellText = editor.querySelector("td")?.firstChild;
    if (!(cellText instanceof Text)) {
      throw new Error("cell text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(cellText, cellText.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editorInstance.deleteTable();

    expect(editor.querySelector(":scope > div.re-table-wrap")).toBeNull();
    expect(editor.querySelector(":scope > table")).toBeNull();
    const topLevelParagraphs = editor.querySelectorAll(":scope > p");
    expect(topLevelParagraphs.length).toBeGreaterThan(0);
  });

  it("moves caret outside wrapped table on ArrowDown at last row", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<div class="re-table-wrap">',
      '<table class="re-table"><tr><td contenteditable="true">A</td></tr></table>',
      "</div>",
      "<p><br></p>",
    ].join("");

    const cellText = editor.querySelector("td")?.firstChild;
    if (!(cellText instanceof Text)) {
      throw new Error("cell text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(cellText, cellText.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowDown",
    }));

    const afterSelection = window.getSelection();
    const afterRange = afterSelection?.rangeCount ? afterSelection.getRangeAt(0) : null;
    const container = afterRange?.startContainer;
    const containerElement = container instanceof HTMLElement ? container : container?.parentElement ?? null;

    expect(containerElement?.closest("table")).toBeNull();
    expect(editor.contains(containerElement as Node)).toBe(true);
  });

  it("moves caret outside wrapped table on ArrowRight at row end", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<div class="re-table-wrap">',
      '<table class="re-table"><tr><td contenteditable="true">A</td></tr></table>',
      "</div>",
      "<p><br></p>",
    ].join("");

    const cellText = editor.querySelector("td")?.firstChild;
    if (!(cellText instanceof Text)) {
      throw new Error("cell text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(cellText, cellText.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowRight",
    }));

    const afterSelection = window.getSelection();
    const afterRange = afterSelection?.rangeCount ? afterSelection.getRangeAt(0) : null;
    const container = afterRange?.startContainer;
    const containerElement = container instanceof HTMLElement ? container : container?.parentElement ?? null;

    expect(containerElement?.closest("table")).toBeNull();
    expect(editor.contains(containerElement as Node)).toBe(true);
  });

  it("deletes wrapped table with Delete at previous paragraph boundary", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    vi.spyOn(window, "confirm").mockReturnValue(true);
    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      "<p><br></p>",
      '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">A</td></tr></table></div>',
      "<p><br></p>",
    ].join("");

    const firstParagraph = editor.querySelector(":scope > p") as HTMLParagraphElement;
    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.selectNodeContents(firstParagraph);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Delete",
    }));

    expect(editor.querySelector(":scope > div.re-table-wrap")).toBeNull();
    expect(editor.querySelector(":scope > table")).toBeNull();
  });

  it("deletes wrapped table with Backspace at next paragraph boundary", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    vi.spyOn(window, "confirm").mockReturnValue(true);
    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      "<p><br></p>",
      '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">A</td></tr></table></div>',
      "<p><br></p>",
    ].join("");

    const paragraphs = editor.querySelectorAll(":scope > p");
    const lastParagraph = paragraphs[paragraphs.length - 1] as HTMLParagraphElement;
    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.selectNodeContents(lastParagraph);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Backspace",
    }));

    expect(editor.querySelector(":scope > div.re-table-wrap")).toBeNull();
    expect(editor.querySelector(":scope > table")).toBeNull();
  });

  it("moves to previous table on ArrowUp from second table first cell", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">T1</td></tr><tr><td contenteditable="true">T1B</td></tr></table></div>',
      '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">T2</td></tr><tr><td contenteditable="true">T2B</td></tr></table></div>',
      "<p><br></p>",
    ].join("");

    const wrappers = editor.querySelectorAll(":scope > div.re-table-wrap");
    const firstTable = wrappers[0]?.querySelector("table") as HTMLTableElement;
    const secondTable = wrappers[1]?.querySelector("table") as HTMLTableElement;
    const secondTableFirstCellText = secondTable.querySelector("tr:first-child td")?.firstChild;
    if (!(secondTableFirstCellText instanceof Text)) {
      throw new Error("second table first cell text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(secondTableFirstCellText, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowUp",
    }));

    const afterRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const afterElement = afterRange?.startContainer instanceof HTMLElement
      ? afterRange.startContainer
      : afterRange?.startContainer.parentElement ?? null;
    expect(afterElement?.closest("table")).toBe(firstTable);
  });

  it("moves to next table on ArrowDown from first table last cell", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">T1</td></tr><tr><td contenteditable="true">T1B</td></tr></table></div>',
      '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">T2</td></tr><tr><td contenteditable="true">T2B</td></tr></table></div>',
      "<p><br></p>",
    ].join("");

    const wrappers = editor.querySelectorAll(":scope > div.re-table-wrap");
    const firstTable = wrappers[0]?.querySelector("table") as HTMLTableElement;
    const secondTable = wrappers[1]?.querySelector("table") as HTMLTableElement;
    const firstTableLastCellText = firstTable.querySelector("tr:last-child td")?.firstChild;
    if (!(firstTableLastCellText instanceof Text)) {
      throw new Error("first table last cell text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(firstTableLastCellText, firstTableLastCellText.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowDown",
    }));

    const afterRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const afterElement = afterRange?.startContainer instanceof HTMLElement
      ? afterRange.startContainer
      : afterRange?.startContainer.parentElement ?? null;
    expect(afterElement?.closest("table")).toBe(secondTable);
  });

  it("moves to previous table on ArrowLeft from second table first cell", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">T1</td></tr><tr><td contenteditable="true">T1B</td></tr></table></div>',
      '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">T2</td></tr><tr><td contenteditable="true">T2B</td></tr></table></div>',
      "<p><br></p>",
    ].join("");

    const wrappers = editor.querySelectorAll(":scope > div.re-table-wrap");
    const firstTable = wrappers[0]?.querySelector("table") as HTMLTableElement;
    const secondTable = wrappers[1]?.querySelector("table") as HTMLTableElement;
    const secondTableFirstCellText = secondTable.querySelector("tr:first-child td")?.firstChild;
    if (!(secondTableFirstCellText instanceof Text)) {
      throw new Error("second table first cell text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(secondTableFirstCellText, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowLeft",
    }));

    const afterRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const afterElement = afterRange?.startContainer instanceof HTMLElement
      ? afterRange.startContainer
      : afterRange?.startContainer.parentElement ?? null;
    expect(afterElement?.closest("table")).toBe(firstTable);
  });

  it("moves to next table on ArrowRight from first table last cell", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">T1</td></tr><tr><td contenteditable="true">T1B</td></tr></table></div>',
      '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">T2</td></tr><tr><td contenteditable="true">T2B</td></tr></table></div>',
      "<p><br></p>",
    ].join("");

    const wrappers = editor.querySelectorAll(":scope > div.re-table-wrap");
    const firstTable = wrappers[0]?.querySelector("table") as HTMLTableElement;
    const secondTable = wrappers[1]?.querySelector("table") as HTMLTableElement;
    const firstTableLastCellText = firstTable.querySelector("tr:last-child td")?.firstChild;
    if (!(firstTableLastCellText instanceof Text)) {
      throw new Error("first table last cell text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(firstTableLastCellText, firstTableLastCellText.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowRight",
    }));

    const afterRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const afterElement = afterRange?.startContainer instanceof HTMLElement
      ? afterRange.startContainer
      : afterRange?.startContainer.parentElement ?? null;
    expect(afterElement?.closest("table")).toBe(secondTable);
  });
});