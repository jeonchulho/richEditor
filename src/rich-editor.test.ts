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

describe("RichEditor form control clipboard", () => {
  it("copies and pastes checkbox/radio/input/memo controls", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      insertFormControl: (type: "checkbox" | "radio" | "input" | "memo", labelText: string) => void;
      setActiveFormControlWrapper: (next: HTMLElement | null) => void;
      handleCopy: (event: ClipboardEvent) => void;
      handlePaste: (event: ClipboardEvent) => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const clipboardStore = new Map<string, string>();
    const makeClipboard = (): DataTransfer => ({
      getData: (type: string) => clipboardStore.get(type) ?? "",
      setData: (type: string, value: string) => {
        clipboardStore.set(type, value);
        return true;
      },
      clearData: (type?: string) => {
        if (typeof type === "string") {
          clipboardStore.delete(type);
          return;
        }
        clipboardStore.clear();
      },
      types: [],
    } as unknown as DataTransfer);

    const scenarios: Array<{ type: "checkbox" | "radio" | "input" | "memo"; label: string }> = [
      { type: "checkbox", label: "체크 항목" },
      { type: "radio", label: "선택지" },
      { type: "input", label: "입력 항목" },
      { type: "memo", label: "메모" },
    ];

    for (const scenario of scenarios) {
      editor.innerHTML = "<p><br></p>";

      const seedRange = document.createRange();
      seedRange.selectNodeContents(editor);
      seedRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(seedRange);

      editorInstance.insertFormControl(scenario.type, scenario.label);

      const wrapper = editor.querySelector(".re-form-control-wrap") as HTMLElement | null;
      expect(wrapper).not.toBeNull();
      if (!wrapper) {
        throw new Error("wrapper missing");
      }

      editorInstance.setActiveFormControlWrapper(wrapper);

      clipboardStore.clear();
      const copyPrevent = vi.fn();
      editorInstance.handleCopy({
        clipboardData: makeClipboard(),
        preventDefault: copyPrevent,
      } as unknown as ClipboardEvent);

      expect(copyPrevent).toHaveBeenCalled();
      expect(clipboardStore.get("application/x-rich-editor-form-control")).toContain("re-form-control-wrap");

      const pasteRange = document.createRange();
      pasteRange.selectNodeContents(editor);
      pasteRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(pasteRange);

      const pastePrevent = vi.fn();
      editorInstance.handlePaste({
        clipboardData: makeClipboard(),
        preventDefault: pastePrevent,
      } as unknown as ClipboardEvent);
      expect(pastePrevent).toHaveBeenCalled();

      expect(editor.querySelectorAll(`.re-form-control-wrap[data-control-kind="${scenario.type}"]`).length).toBe(2);
    }
  });
});

describe("RichEditor form control undo/redo", () => {
  it("routes undo/redo through form-control history when active wrapper exists", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      ensureFormControlPropsHistory: (wrapper: HTMLElement) => void;
      pushFormControlPropsHistory: (wrapper: HTMLElement) => void;
      setActiveFormControlWrapper: (next: HTMLElement | null) => void;
      exec: (command: string, value?: string) => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<p>앞 문장</p>',
      '<span class="re-form-control-wrap" contenteditable="false" data-control-kind="input"><span class="re-form-control-input" contenteditable="false"><input type="text" value="값"></span><span class="re-form-control-label" contenteditable="false">초기 라벨</span></span>',
      '<p>뒤 문장</p>',
    ].join("");

    const wrapper = editor.querySelector(".re-form-control-wrap") as HTMLElement | null;
    if (!wrapper) {
      throw new Error("wrapper missing");
    }

    editorInstance.ensureFormControlPropsHistory(wrapper);

    const label = wrapper.querySelector(".re-form-control-label") as HTMLElement | null;
    if (!label) {
      throw new Error("label missing");
    }
    label.textContent = "수정 라벨";
    editorInstance.pushFormControlPropsHistory(wrapper);

    editorInstance.setActiveFormControlWrapper(wrapper);
    editorInstance.exec("undo");
    expect((editor.querySelector(".re-form-control-label") as HTMLElement | null)?.textContent).toBe("초기 라벨");

    editorInstance.exec("redo");
    expect((editor.querySelector(".re-form-control-label") as HTMLElement | null)?.textContent).toBe("수정 라벨");
  });

  it("does not advance history index when replace fails", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      ensureFormControlPropsHistory: (wrapper: HTMLElement) => void;
      pushFormControlPropsHistory: (wrapper: HTMLElement) => void;
      setActiveFormControlWrapper: (next: HTMLElement | null) => void;
      applyFormControlPropsHistory: (command: "undo" | "redo", reopenDialog: boolean) => boolean;
      formControlPropsHistory: Map<string, { states: string[]; index: number }>;
      replaceFormControlFromHtml: (current: HTMLElement, html: string) => HTMLElement | null;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<p>앞 문장</p>',
      '<span class="re-form-control-wrap" contenteditable="false" data-control-kind="input"><span class="re-form-control-input" contenteditable="false"><input type="text" value="값"></span><span class="re-form-control-label" contenteditable="false">초기 라벨</span></span>',
      '<p>뒤 문장</p>',
    ].join("");

    const wrapper = editor.querySelector(".re-form-control-wrap") as HTMLElement | null;
    if (!wrapper) {
      throw new Error("wrapper missing");
    }

    editorInstance.ensureFormControlPropsHistory(wrapper);
    const id = wrapper.dataset.controlId;
    if (!id) {
      throw new Error("control id missing");
    }

    const label = wrapper.querySelector(".re-form-control-label") as HTMLElement | null;
    if (!label) {
      throw new Error("label missing");
    }
    label.textContent = "수정 라벨";
    editorInstance.pushFormControlPropsHistory(wrapper);

    const history = editorInstance.formControlPropsHistory.get(id);
    if (!history) {
      throw new Error("history missing");
    }
    expect(history.index).toBe(1);

    editorInstance.setActiveFormControlWrapper(wrapper);
    const replaceSpy = vi.spyOn(editorInstance as unknown as { replaceFormControlFromHtml: typeof editorInstance.replaceFormControlFromHtml }, "replaceFormControlFromHtml").mockReturnValue(null);

    const ok = editorInstance.applyFormControlPropsHistory("undo", false);
    expect(ok).toBe(false);
    expect(history.index).toBe(1);
    expect((editor.querySelector(".re-form-control-label") as HTMLElement | null)?.textContent).toBe("수정 라벨");

    replaceSpy.mockRestore();
  });

  it("undoes and redoes form-control properties after dialog apply via exec", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      showFormControlPropsDialog: (wrapper: HTMLElement) => void;
      applyFormControlProps: () => void;
      setActiveFormControlWrapper: (next: HTMLElement | null) => void;
      formControlPropsLabelInput: HTMLInputElement;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<p>앞 문장</p>',
      '<span class="re-form-control-wrap" contenteditable="false" data-control-kind="input"><span class="re-form-control-input" contenteditable="false"><input type="text" value="값"></span><span class="re-form-control-label" contenteditable="false">초기 라벨</span></span>',
      '<p>뒤 문장</p>',
    ].join("");

    const wrapper = editor.querySelector(".re-form-control-wrap") as HTMLElement | null;
    if (!wrapper) {
      throw new Error("wrapper missing");
    }

    editorInstance.showFormControlPropsDialog(wrapper);
    editorInstance.formControlPropsLabelInput.value = "변경 라벨";
    editorInstance.applyFormControlProps();

    const getLabel = (): string => (editor.querySelector(".re-form-control-label") as HTMLElement | null)?.textContent ?? "";
    expect(getLabel()).toBe("변경 라벨");

    editorInstance.setActiveFormControlWrapper(editor.querySelector(".re-form-control-wrap") as HTMLElement | null);
    editorInstance.exec("undo");
    expect(getLabel()).toBe("초기 라벨");

    editorInstance.setActiveFormControlWrapper(editor.querySelector(".re-form-control-wrap") as HTMLElement | null);
    editorInstance.exec("redo");
    expect(getLabel()).toBe("변경 라벨");
  });
});

describe("RichEditor undo/redo precedence", () => {
  const withExecCommandMock = (
    impl: (commandId: string, showUI?: boolean, value?: string) => boolean,
    run: () => void,
  ): void => {
    const originalExecCommand = (document as unknown as { execCommand?: typeof document.execCommand }).execCommand;
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: impl,
    });

    try {
      run();
    } finally {
      if (originalExecCommand) {
        Object.defineProperty(document, "execCommand", { configurable: true, value: originalExecCommand });
      } else {
        Reflect.deleteProperty(document, "execCommand");
      }
    }
  };

  it("applies merge undo first when current document is exactly at table boundary state", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      pushMergeUndoSnapshot: (beforeHtml: string) => void;
      applyMergeUndoSnapshot: () => boolean;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    const beforeHtml = "<p>abc</p>";
    const afterTableHtml = `${beforeHtml}<table class=\"re-table\"><tr><td contenteditable=\"true\">A</td></tr></table>`;
    editor.innerHTML = afterTableHtml;
    editorInstance.pushMergeUndoSnapshot(beforeHtml);

    const mergeUndoSpy = vi.spyOn(editorInstance as unknown as { applyMergeUndoSnapshot: () => boolean }, "applyMergeUndoSnapshot");
    withExecCommandMock((commandId: string) => {
      if (commandId === "undo") {
        return true;
      }
      return true;
    }, () => {
      editorInstance.exec("undo");
    });

    expect((editor.querySelector("p") as HTMLParagraphElement | null)?.textContent).toBe("abc");
    expect(editor.querySelector("table.re-table")).toBeNull();
    expect(mergeUndoSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to table snapshot undo when native undo has no effect", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      pushMergeUndoSnapshot: (beforeHtml: string) => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    const beforeHtml = "<p>abc</p>";
    editor.innerHTML = `${beforeHtml}<table class=\"re-table\"><tr><td contenteditable=\"true\">A</td></tr></table>`;
    editorInstance.pushMergeUndoSnapshot(beforeHtml);

    withExecCommandMock((commandId: string) => {
      if (commandId === "undo") {
        return false;
      }
      return true;
    }, () => {
      editorInstance.exec("undo");
    });

    expect(editor.innerHTML).toBe(beforeHtml);
    expect(editor.querySelector("table.re-table")).toBeNull();
  });

  it("undoes plain text one step at a time before touching table snapshot", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      pushMergeUndoSnapshot: (beforeHtml: string) => void;
      applyMergeUndoSnapshot: () => boolean;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    const beforeHtml = "<p>a</p>";
    editor.innerHTML = `${beforeHtml}<table class=\"re-table\"><tr><td contenteditable=\"true\">T</td></tr></table>`;
    editorInstance.pushMergeUndoSnapshot(beforeHtml);

    const getParagraphText = (): string => (editor.querySelector("p") as HTMLParagraphElement).textContent ?? "";
    const p = editor.querySelector("p") as HTMLParagraphElement;
    let prev = editor.innerHTML;
    p.textContent = "ab";
    editorInstance.pushMergeUndoSnapshot(prev);
    prev = editor.innerHTML;
    p.textContent = "abc";
    editorInstance.pushMergeUndoSnapshot(prev);
    prev = editor.innerHTML;
    p.textContent = "abcd";
    editorInstance.pushMergeUndoSnapshot(prev);

    editorInstance.exec("undo");
    expect(getParagraphText()).toBe("abc");
    expect(editor.querySelector("table.re-table")).not.toBeNull();

    editorInstance.exec("undo");
    expect(getParagraphText()).toBe("ab");
    expect(editor.querySelector("table.re-table")).not.toBeNull();

    editorInstance.exec("undo");
    expect(getParagraphText()).toBe("a");
    expect(editor.querySelector("table.re-table")).not.toBeNull();
  });

  it("undoes multiple table-cell edits in reverse order without deleting table", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      pushMergeUndoSnapshot: (beforeHtml: string) => void;
      applyMergeUndoSnapshot: () => boolean;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    const beforeHtml = '<table class="re-table"><tr><td contenteditable="true">A1</td><td contenteditable="true">A2</td></tr><tr><td contenteditable="true">B1</td><td contenteditable="true">B2</td></tr></table>';
    editor.innerHTML = beforeHtml;
    editorInstance.pushMergeUndoSnapshot("<p>before</p>");

    const getCell = (index: number): HTMLTableCellElement => Array.from(editor.querySelectorAll("td"))[index] as HTMLTableCellElement;
    const td = Array.from(editor.querySelectorAll("td")) as HTMLTableCellElement[];
    let prev = editor.innerHTML;
    td[0].textContent = "A1x";
    editorInstance.pushMergeUndoSnapshot(prev);
    prev = editor.innerHTML;
    td[1].textContent = "A2x";
    editorInstance.pushMergeUndoSnapshot(prev);
    prev = editor.innerHTML;
    td[2].textContent = "B1x";
    editorInstance.pushMergeUndoSnapshot(prev);

    editorInstance.exec("undo");
    expect(getCell(2).textContent).toBe("B1");
    expect(editor.querySelector("table.re-table")).not.toBeNull();

    editorInstance.exec("undo");
    expect(getCell(1).textContent).toBe("A2");
    expect(editor.querySelector("table.re-table")).not.toBeNull();

    editorInstance.exec("undo");
    expect(getCell(0).textContent).toBe("A1");
    expect(editor.querySelector("table.re-table")).not.toBeNull();
  });

  it("keeps typing undo ahead of table-property snapshot rollback", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      pushMergeUndoSnapshot: (beforeHtml: string) => void;
      applyMergeUndoSnapshot: () => boolean;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    const propertyState = '<table class="re-table" style="width: 640px;"><tr><td contenteditable="true">A</td></tr></table>';
    editor.innerHTML = propertyState;
    editorInstance.pushMergeUndoSnapshot('<table class="re-table" style="width: 320px;"><tr><td contenteditable="true">A</td></tr></table>');

    const getCellText = (): string => (editor.querySelector("td") as HTMLTableCellElement).textContent ?? "";
    const cell = editor.querySelector("td") as HTMLTableCellElement;
    let prev = editor.innerHTML;
    cell.textContent = "AB";
    editorInstance.pushMergeUndoSnapshot(prev);
    prev = editor.innerHTML;
    cell.textContent = "ABC";
    editorInstance.pushMergeUndoSnapshot(prev);
    prev = editor.innerHTML;
    cell.textContent = "ABCD";
    editorInstance.pushMergeUndoSnapshot(prev);

    editorInstance.exec("undo");
    expect(getCellText()).toBe("ABC");
    expect((editor.querySelector("table") as HTMLTableElement).style.width).toBe("640px");

    editorInstance.exec("undo");
    expect(getCellText()).toBe("AB");
    expect((editor.querySelector("table") as HTMLTableElement).style.width).toBe("640px");

    editorInstance.exec("undo");
    expect(getCellText()).toBe("A");
    expect((editor.querySelector("table") as HTMLTableElement).style.width).toBe("640px");
  });

  it("applies table snapshot fallback only after native undo is exhausted", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      pushMergeUndoSnapshot: (beforeHtml: string) => void;
      applyMergeUndoSnapshot: () => boolean;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    const fallbackState = '<table class="re-table" style="width: 320px;"><tr><td contenteditable="true">A</td></tr></table>';
    const afterTableState = '<table class="re-table" style="width: 640px;"><tr><td contenteditable="true">A</td></tr></table>';
    editor.innerHTML = afterTableState;
    editorInstance.pushMergeUndoSnapshot(fallbackState);
    editor.innerHTML = '<table class="re-table" style="width: 640px;"><tr><td contenteditable="true">A</td></tr></table>';

    const cell = editor.querySelector("td") as HTMLTableCellElement;
    const prev = editor.innerHTML;
    cell.textContent = "AB";
    editorInstance.pushMergeUndoSnapshot(prev);

    editorInstance.exec("undo");
    expect((editor.querySelector("td") as HTMLTableCellElement).textContent).toBe("A");
    expect((editor.querySelector("table") as HTMLTableElement).style.width).toBe("640px");

    editorInstance.exec("undo");
    expect((editor.querySelector("table") as HTMLTableElement).style.width).toBe("320px");
    expect(editor.innerHTML).toContain('style="width: 320px;"');
  });

  it("undoes table before older text after post-table typing is fully undone", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      pushMergeUndoSnapshot: (beforeHtml: string) => void;
      applyMergeUndoSnapshot: () => boolean;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    const beforeTable = "<p>안녕하세요</p>";
    const afterTable = '<p>안녕하세요</p><table class="re-table"><tr><td contenteditable="true">Header 1</td></tr></table><p><br></p>';
    editor.innerHTML = afterTable;
    editorInstance.pushMergeUndoSnapshot(beforeTable);

    editor.innerHTML = '<p>안녕하세요</p><table class="re-table"><tr><td contenteditable="true">Header 1</td></tr></table><p>우리나라</p>';

    const post = editor.querySelectorAll("p")[1] as HTMLParagraphElement;
    let prev = editor.innerHTML;
    post.textContent = "우";
    editorInstance.pushMergeUndoSnapshot(prev);
    prev = editor.innerHTML;
    post.textContent = "우리";
    editorInstance.pushMergeUndoSnapshot(prev);
    prev = editor.innerHTML;
    post.textContent = "우리나";
    editorInstance.pushMergeUndoSnapshot(prev);
    prev = editor.innerHTML;
    post.textContent = "우리나라";
    editorInstance.pushMergeUndoSnapshot(prev);

    editorInstance.exec("undo");
    editorInstance.exec("undo");
    editorInstance.exec("undo");
    editorInstance.exec("undo");

    // post-table text("우리나라")를 모두 되돌린 직후 다음 undo는 테이블을 먼저 되돌려야 한다.
    editorInstance.exec("undo");

    expect(editor.querySelector("table.re-table")).toBeNull();
    expect((editor.querySelector("p") as HTMLParagraphElement | null)?.textContent).toBe("안녕하세요");
  });

  it("restores caret to the pre-change position on merge undo", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      pushMergeUndoSnapshot: (beforeHtml: string, beforeSelection?: { start: number; end: number } | null) => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    const beforeHtml = "<p>a</p>";
    editor.innerHTML = "<p>ab</p>";

    const textNode = editor.querySelector("p")?.firstChild;
    if (!(textNode instanceof Text)) {
      throw new Error("text node missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(textNode, 2);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editorInstance.pushMergeUndoSnapshot(beforeHtml, { start: 1, end: 1 });
    editorInstance.exec("undo");

    const restored = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    expect((editor.querySelector("p") as HTMLParagraphElement).textContent).toBe("a");
    expect(restored).not.toBeNull();
    expect(restored?.collapsed).toBe(true);
    expect(restored?.startContainer.textContent).toBe("a");
    expect(restored?.startOffset).toBe(1);
  });

  it("keeps a valid caret when undo target has no text nodes", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      pushMergeUndoSnapshot: (beforeHtml: string, beforeSelection?: { start: number; end: number } | null) => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    const beforeHtml = '<table class="re-table"><tr><td contenteditable="true"><br></td></tr></table>';
    editor.innerHTML = "<p>x</p>";

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
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editorInstance.pushMergeUndoSnapshot(beforeHtml, { start: 99, end: 99 });
    editorInstance.exec("undo");

    const restored = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    expect(editor.querySelector("table.re-table")).not.toBeNull();
    expect(restored).not.toBeNull();
    expect(restored?.collapsed).toBe(true);
    expect(editor.contains(restored?.startContainer ?? null)).toBe(true);
  });

  it("keeps caret at the reverted edit point through 안녕하세요→테이블→우리나라 undo sequence", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      pushMergeUndoSnapshot: (beforeHtml: string, beforeSelection?: { start: number; end: number } | null) => void;
      captureSelectionTextOffsets: () => { start: number; end: number } | null;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const placeCaretAtParagraphEnd = (index: number): void => {
      const paragraph = editor.querySelectorAll("p")[index] as HTMLParagraphElement | undefined;
      if (!paragraph) {
        throw new Error(`paragraph ${index} missing`);
      }

      const range = document.createRange();
      const lastText = paragraph.lastChild;
      if (lastText instanceof Text) {
        range.setStart(lastText, lastText.length);
      } else {
        range.selectNodeContents(paragraph);
      }
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    };

    const expectCaretAtParagraphEnd = (index: number, expectedText?: string): void => {
      const paragraph = editor.querySelectorAll("p")[index] as HTMLParagraphElement | undefined;
      if (!paragraph) {
        throw new Error(`paragraph ${index} missing`);
      }

      if (typeof expectedText === "string") {
        expect(paragraph.textContent ?? "").toBe(expectedText);
      }

      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      expect(range).not.toBeNull();
      expect(range?.collapsed).toBe(true);

      const textNode = paragraph.lastChild;
      if (textNode instanceof Text) {
        expect(range?.startContainer).toBe(textNode);
        expect(range?.startOffset).toBe(textNode.length);
      } else {
        const inParagraph = range ? paragraph.contains(range.startContainer) || range.startContainer === paragraph : false;
        expect(inParagraph).toBe(true);
      }
    };

    const beforeTable = "<p>안녕하세요</p>";
    const afterTable = '<p>안녕하세요</p><table class="re-table"><tr><td contenteditable="true">Header 1</td></tr></table><p><br></p>';
    const text1 = '<p>안녕하세요</p><table class="re-table"><tr><td contenteditable="true">Header 1</td></tr></table><p>우</p>';
    const text2 = '<p>안녕하세요</p><table class="re-table"><tr><td contenteditable="true">Header 1</td></tr></table><p>우리</p>';
    const text3 = '<p>안녕하세요</p><table class="re-table"><tr><td contenteditable="true">Header 1</td></tr></table><p>우리나</p>';
    const text4 = '<p>안녕하세요</p><table class="re-table"><tr><td contenteditable="true">Header 1</td></tr></table><p>우리나라</p>';

    editor.innerHTML = beforeTable;
    placeCaretAtParagraphEnd(0);
    const beforeTableSel = editorInstance.captureSelectionTextOffsets();

    editor.innerHTML = afterTable;
    placeCaretAtParagraphEnd(1);
    editorInstance.pushMergeUndoSnapshot(beforeTable, beforeTableSel);

    editor.innerHTML = text1;
    placeCaretAtParagraphEnd(1);
    const text1Sel = editorInstance.captureSelectionTextOffsets();

    editor.innerHTML = text2;
    placeCaretAtParagraphEnd(1);
    editorInstance.pushMergeUndoSnapshot(text1, text1Sel);
    const text2Sel = editorInstance.captureSelectionTextOffsets();

    editor.innerHTML = text3;
    placeCaretAtParagraphEnd(1);
    editorInstance.pushMergeUndoSnapshot(text2, text2Sel);
    const text3Sel = editorInstance.captureSelectionTextOffsets();

    editor.innerHTML = text4;
    placeCaretAtParagraphEnd(1);
    editorInstance.pushMergeUndoSnapshot(text3, text3Sel);

    editorInstance.exec("undo");
    expectCaretAtParagraphEnd(1, "우리나");

    editorInstance.exec("undo");
    expectCaretAtParagraphEnd(1, "우리");

    editorInstance.exec("undo");
    expectCaretAtParagraphEnd(1, "우");

    editorInstance.exec("undo");
    expect(editor.querySelector("table.re-table")).toBeNull();
    expectCaretAtParagraphEnd(0, "안녕하세요");
  });

  it("prevents default for Ctrl+Z when undo was handled", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">ABCD</td></tr></table>';

    let notCanceled = true;
    withExecCommandMock(() => true, () => {
      notCanceled = editor.dispatchEvent(new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "z",
        ctrlKey: true,
      }));
    });

    expect(notCanceled).toBe(false);
    expect(editor.querySelector("table.re-table")).not.toBeNull();
  });

  it("prevents default for Cmd+Z (meta) when undo was handled", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">AB</td></tr></table>';

    let notCanceled = true;
    withExecCommandMock(() => true, () => {
      notCanceled = editor.dispatchEvent(new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "z",
        metaKey: true,
      }));
    });

    expect(notCanceled).toBe(false);
    expect(editor.querySelector("table.re-table")).not.toBeNull();
  });

  it("prevents default for Ctrl+Shift+Z when redo was handled", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">AB</td></tr></table>';

    let notCanceled = true;
    withExecCommandMock(() => true, () => {
      notCanceled = editor.dispatchEvent(new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "z",
        ctrlKey: true,
        shiftKey: true,
      }));
    });

    expect(notCanceled).toBe(false);
  });

  it("still prevents default for Ctrl+Z when nothing could handle undo", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = "<p>plain</p>";

    const notCanceled = editor.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "z",
      ctrlKey: true,
    }));

    expect(notCanceled).toBe(false);
  });

  it("does not intercept Ctrl+Z while composing (IME)", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      isComposing: boolean;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = "<p>한글</p>";

    editorInstance.isComposing = true;
    const execSpy = vi.spyOn(editorInstance as unknown as { exec: typeof editorInstance.exec }, "exec");

    const notCanceled = editor.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "z",
      ctrlKey: true,
    }));

    expect(notCanceled).toBe(true);
    expect(execSpy).not.toHaveBeenCalled();
  });
});

describe("RichEditor object selection highlight", () => {
  it("applies re-selection-active to table/image/form control when range selection intersects them", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<table class="re-table"><tbody><tr><td>셀</td></tr></tbody></table>',
      '<span class="re-image-wrap" contenteditable="false"><img src="x" alt="x"></span>',
      '<span class="re-form-control-wrap" contenteditable="false" data-control-kind="input"><span class="re-form-control-input" contenteditable="false"><input type="text" value="값"></span><span class="re-form-control-label" contenteditable="false">라벨</span></span>',
    ].join("");

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const table = editor.querySelector("table") as HTMLTableElement;
    const image = editor.querySelector(".re-image-wrap") as HTMLElement;
    const formControl = editor.querySelector(".re-form-control-wrap") as HTMLElement;

    const tableRange = document.createRange();
    tableRange.selectNode(table);
    selection.removeAllRanges();
    selection.addRange(tableRange);
    document.dispatchEvent(new Event("selectionchange"));
    expect(table.classList.contains("re-selection-active")).toBe(true);

    const imageRange = document.createRange();
    imageRange.selectNode(image);
    selection.removeAllRanges();
    selection.addRange(imageRange);
    document.dispatchEvent(new Event("selectionchange"));
    expect(image.classList.contains("re-selection-active")).toBe(true);

    const controlRange = document.createRange();
    controlRange.selectNode(formControl);
    selection.removeAllRanges();
    selection.addRange(controlRange);
    document.dispatchEvent(new Event("selectionchange"));
    expect(formControl.classList.contains("re-selection-active")).toBe(true);
  });

  it("fills all intersected form objects (radio/checkbox/input/memo) on range selection", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<span class="re-form-control-wrap" contenteditable="false" data-control-kind="radio"><span class="re-form-control-input" contenteditable="false"><input type="radio"></span><span class="re-form-control-label" contenteditable="false">라디오</span></span>',
      '<span class="re-form-control-wrap" contenteditable="false" data-control-kind="checkbox"><span class="re-form-control-input" contenteditable="false"><input type="checkbox"></span><span class="re-form-control-label" contenteditable="false">체크</span></span>',
      '<span class="re-form-control-wrap" contenteditable="false" data-control-kind="input"><span class="re-form-control-input" contenteditable="false"><input type="text" value="입력"></span><span class="re-form-control-label" contenteditable="false">입력 항목</span></span>',
      '<span class="re-form-control-wrap" contenteditable="false" data-control-kind="memo"><span class="re-form-control-input" contenteditable="false"><textarea>메모</textarea></span><span class="re-form-control-label" contenteditable="false">메모 항목</span></span>',
    ].join(" ");

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));

    const wrappers = Array.from(editor.querySelectorAll(".re-form-control-wrap")) as HTMLElement[];
    expect(wrappers.length).toBe(4);
    expect(wrappers.every((node) => node.classList.contains("re-selection-active"))).toBe(true);
  });

  it("keeps active table when non-collapsed range stays inside one table cell", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      activeTableElement: HTMLTableElement | null;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">ABCDE</td></tr></table><p><br></p>';

    const table = editor.querySelector("table") as HTMLTableElement;
    const text = editor.querySelector("td")?.firstChild;
    if (!(text instanceof Text)) {
      throw new Error("cell text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(text, 1);
    range.setEnd(text, 4);
    selection.removeAllRanges();
    selection.addRange(range);

    document.dispatchEvent(new Event("selectionchange"));

    expect(selection.toString()).toBe("BCD");
    expect(editorInstance.activeTableElement).toBe(table);
  });

  it("does not highlight whole table for non-collapsed in-cell text range", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">Header2</td><td contenteditable="true">Header3</td></tr></table><p><br></p>';

    const table = editor.querySelector("table") as HTMLTableElement;
    const text = editor.querySelector("td")?.firstChild;
    if (!(text instanceof Text)) {
      throw new Error("cell text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 6);
    selection.removeAllRanges();
    selection.addRange(range);

    document.dispatchEvent(new Event("selectionchange"));

    expect(selection.toString()).toBe("Header");
    expect(table.classList.contains("re-selection-active")).toBe(false);
  });

  it("switches active table when in-cell range moves to another table", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      activeTableElement: HTMLTableElement | null;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<table class="re-table"><tr><td contenteditable="true">FIRST</td></tr></table>',
      '<p><br></p>',
      '<table class="re-table"><tr><td contenteditable="true">SECOND</td></tr></table>',
      '<p><br></p>',
    ].join("");

    const tables = editor.querySelectorAll("table");
    const firstTable = tables[0] as HTMLTableElement;
    const secondTable = tables[1] as HTMLTableElement;
    const firstText = firstTable.querySelector("td")?.firstChild;
    const secondText = secondTable.querySelector("td")?.firstChild;
    if (!(firstText instanceof Text) || !(secondText instanceof Text)) {
      throw new Error("table text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const firstRange = document.createRange();
    firstRange.setStart(firstText, 1);
    firstRange.setEnd(firstText, 3);
    selection.removeAllRanges();
    selection.addRange(firstRange);
    document.dispatchEvent(new Event("selectionchange"));
    expect(editorInstance.activeTableElement).toBe(firstTable);

    const secondRange = document.createRange();
    secondRange.setStart(secondText, 1);
    secondRange.setEnd(secondText, 4);
    selection.removeAllRanges();
    selection.addRange(secondRange);
    document.dispatchEvent(new Event("selectionchange"));

    expect(selection.toString()).toBe("ECO");
    expect(editorInstance.activeTableElement).toBe(secondTable);
  });
});

describe("RichEditor table insertion trailing paragraph", () => {
  it("keeps in-cell text selection on click instead of switching to cell selection", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      selectedCells: Set<HTMLTableCellElement>;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">ABCDE</td></tr></table><p><br></p>';

    const text = editor.querySelector("td")?.firstChild;
    if (!(text instanceof Text)) {
      throw new Error("cell text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(text, 1);
    range.setEnd(text, 4);
    selection.removeAllRanges();
    selection.addRange(range);

    text.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(selection.toString()).toBe("BCD");
    expect(editorInstance.selectedCells.size).toBe(0);
  });

  it("keeps text-drag mode when range is still inside anchor cell despite mousemove target drift", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      selectedCells: Set<HTMLTableCellElement>;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">ABCDE</td><td contenteditable="true">FGHIJ</td></tr></table><p><br></p>';

    const cells = editor.querySelectorAll("td");
    const firstCell = cells[0] as HTMLTableCellElement;
    const secondCell = cells[1] as HTMLTableCellElement;
    const text = firstCell.firstChild;
    if (!(text instanceof Text)) {
      throw new Error("first cell text missing");
    }

    firstCell.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(text, 1);
    range.setEnd(text, 4);
    selection.removeAllRanges();
    selection.addRange(range);

    secondCell.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, cancelable: true }));

    expect(selection.toString()).toBe("BCD");
    expect(editorInstance.selectedCells.size).toBe(0);
    expect(firstCell.classList.contains("re-cell-selected")).toBe(false);
    expect(secondCell.classList.contains("re-cell-selected")).toBe(false);

    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
  });

  it("clears stale selected cells when starting non-shift text drag", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      selectedCells: Set<HTMLTableCellElement>;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">A</td><td contenteditable="true">B</td></tr></table><p><br></p>';

    const cells = editor.querySelectorAll("td");
    const firstCell = cells[0] as HTMLTableCellElement;
    const secondCell = cells[1] as HTMLTableCellElement;

    editorInstance.selectedCells.add(firstCell);
    editorInstance.selectedCells.add(secondCell);
    firstCell.classList.add("re-cell-selected");
    secondCell.classList.add("re-cell-selected");

    firstCell.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));

    expect(editorInstance.selectedCells.size).toBe(0);
    expect(firstCell.classList.contains("re-cell-selected")).toBe(false);
    expect(secondCell.classList.contains("re-cell-selected")).toBe(false);

    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
  });

  it("does not intercept Shift+ArrowRight inside cell before reaching text boundary", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      handleTableSelectionKeydown: (event: KeyboardEvent) => boolean;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">ABCDE</td></tr></table><p><br></p>';

    const text = editor.querySelector("td")?.firstChild;
    if (!(text instanceof Text)) {
      throw new Error("cell text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(text, 2);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    const event = new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true, cancelable: true });
    const handled = editorInstance.handleTableSelectionKeydown(event);

    expect(handled).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it("clears stale multi-cell selection when Shift+Arrow stays inside cell text", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      handleTableSelectionKeydown: (event: KeyboardEvent) => boolean;
      selectedCells: Set<HTMLTableCellElement>;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">ABCDE</td><td contenteditable="true">FGHIJ</td></tr></table><p><br></p>';

    const cells = editor.querySelectorAll("td");
    const firstCell = cells[0] as HTMLTableCellElement;
    const secondCell = cells[1] as HTMLTableCellElement;
    const text = firstCell.firstChild;
    if (!(text instanceof Text)) {
      throw new Error("first cell text missing");
    }

    editorInstance.selectedCells.add(firstCell);
    firstCell.classList.add("re-cell-selected");
    editorInstance.selectedCells.add(secondCell);
    secondCell.classList.add("re-cell-selected");

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(text, 2);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    const event = new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true, cancelable: true });
    const handled = editorInstance.handleTableSelectionKeydown(event);

    expect(handled).toBe(false);
    expect(editorInstance.selectedCells.size).toBe(0);
    expect(firstCell.classList.contains("re-cell-selected")).toBe(false);
    expect(secondCell.classList.contains("re-cell-selected")).toBe(false);
  });

  it("clears stale multi-cell selection on selectionchange for in-cell drag text range", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      selectedCells: Set<HTMLTableCellElement>;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">ABCDE</td><td contenteditable="true">FGHIJ</td></tr></table><p><br></p>';

    const cells = editor.querySelectorAll("td");
    const firstCell = cells[0] as HTMLTableCellElement;
    const secondCell = cells[1] as HTMLTableCellElement;
    const text = firstCell.firstChild;
    if (!(text instanceof Text)) {
      throw new Error("first cell text missing");
    }

    editorInstance.selectedCells.add(firstCell);
    firstCell.classList.add("re-cell-selected");
    editorInstance.selectedCells.add(secondCell);
    secondCell.classList.add("re-cell-selected");

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(text, 1);
    range.setEnd(text, 4);
    selection.removeAllRanges();
    selection.addRange(range);

    document.dispatchEvent(new Event("selectionchange"));

    expect(selection.toString()).toBe("BCD");
    expect(editorInstance.selectedCells.size).toBe(0);
    expect(firstCell.classList.contains("re-cell-selected")).toBe(false);
    expect(secondCell.classList.contains("re-cell-selected")).toBe(false);
  });

  it("promotes to cell selection on Shift+ArrowRight at cell text boundary", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      handleTableSelectionKeydown: (event: KeyboardEvent) => boolean;
      selectedCells: Set<HTMLTableCellElement>;
      keyboardAnchorCell: HTMLTableCellElement | null;
      keyboardFocusCell: HTMLTableCellElement | null;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">A</td><td contenteditable="true">B</td></tr></table><p><br></p>';

    const firstCell = editor.querySelectorAll("td")[0] as HTMLTableCellElement;
    const firstText = firstCell.firstChild;
    if (!(firstText instanceof Text)) {
      throw new Error("first cell text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(firstText, firstText.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editorInstance.keyboardAnchorCell = firstCell;
    editorInstance.keyboardFocusCell = firstCell;

    const event = new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true, cancelable: true });
    const handled = editorInstance.handleTableSelectionKeydown(event);

    expect(handled).toBe(true);
    expect(editorInstance.selectedCells.size).toBeGreaterThanOrEqual(2);
  });

  it("keeps managed Shift+Arrow cell selection when focus cell has text content", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      handleTableSelectionKeydown: (event: KeyboardEvent) => boolean;
      selectedCells: Set<HTMLTableCellElement>;
      keyboardAnchorCell: HTMLTableCellElement | null;
      keyboardFocusCell: HTMLTableCellElement | null;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true"></td><td contenteditable="true">Header3</td><td contenteditable="true"></td></tr></table><p><br></p>';

    const cells = editor.querySelectorAll("td");
    const firstCell = cells[0] as HTMLTableCellElement;
    const secondCell = cells[1] as HTMLTableCellElement;
    const text = secondCell.firstChild;
    if (!(text instanceof Text)) {
      throw new Error("second cell text missing");
    }

    editorInstance.selectedCells.add(firstCell);
    firstCell.classList.add("re-cell-selected");
    editorInstance.selectedCells.add(secondCell);
    secondCell.classList.add("re-cell-selected");
    editorInstance.keyboardAnchorCell = firstCell;
    editorInstance.keyboardFocusCell = secondCell;

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(text, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    const event = new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true, cancelable: true });
    const handled = editorInstance.handleTableSelectionKeydown(event);

    expect(handled).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(editorInstance.selectedCells.size).toBeGreaterThanOrEqual(3);
  });

  it("selects a word on table-cell double click", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">셀 데이터</td></tr></table><p><br></p>';

    const cell = editor.querySelector("td") as HTMLTableCellElement | null;
    if (!cell) {
      throw new Error("cell missing");
    }

    cell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      throw new Error("selection unavailable");
    }

    const range = selection.getRangeAt(0);
    expect(selection.toString()).toBe("셀");
    expect(cell.contains(range.startContainer)).toBe(true);
    expect(cell.contains(range.endContainer)).toBe(true);
  });

  it("selects alphabetic word on table-cell double click for alphanumeric text", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">Header2</td></tr></table><p><br></p>';

    const cell = editor.querySelector("td") as HTMLTableCellElement | null;
    if (!cell) {
      throw new Error("cell missing");
    }

    cell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      throw new Error("selection unavailable");
    }

    expect(selection.toString()).toBe("Header");
  });

  it("selects cell data on table-cell double click from text-node target", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">직접텍스트</td></tr></table><p><br></p>';

    const textNode = editor.querySelector("td")?.firstChild;
    if (!(textNode instanceof Text)) {
      throw new Error("cell text node missing");
    }

    textNode.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      throw new Error("selection unavailable");
    }

    expect(selection.toString()).toBe("직접텍스트");
    const range = selection.getRangeAt(0);
    const cell = editor.querySelector("td") as HTMLTableCellElement;
    expect(cell.contains(range.startContainer)).toBe(true);
    expect(cell.contains(range.endContainer)).toBe(true);
  });

  it("selects cell data even after preceding click events on text-node target", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    new RichEditor(root);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table class="re-table"><tr><td contenteditable="true">더블클릭데이터</td></tr></table><p><br></p>';

    const textNode = editor.querySelector("td")?.firstChild;
    if (!(textNode instanceof Text)) {
      throw new Error("cell text node missing");
    }

    textNode.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    textNode.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    textNode.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      throw new Error("selection unavailable");
    }

    expect(selection.toString()).toBe("더블클릭데이터");
    const range = selection.getRangeAt(0);
    const cell = editor.querySelector("td") as HTMLTableCellElement;
    expect(cell.contains(range.startContainer)).toBe(true);
    expect(cell.contains(range.endContainer)).toBe(true);
  });

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

  it("inserts weekly report tables wrapped with div.re-table-wrap", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      insertWeeklyReportTemplate: () => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = "<p><br></p>";

    editorInstance.insertWeeklyReportTemplate();

    const wrappers = editor.querySelectorAll(":scope > div.re-table-wrap");
    const topLevelTables = editor.querySelectorAll(":scope > table.re-table");
    expect(wrappers.length).toBeGreaterThanOrEqual(2);
    expect(topLevelTables.length).toBe(0);
    expect(wrappers[0]?.querySelector(":scope > table.re-report-sign-table")).not.toBeNull();
    expect(wrappers[1]?.querySelector(":scope > table.re-report-main-table")).not.toBeNull();
  });

  it("inserts weekly report blocks outside a top-level paragraph", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      insertWeeklyReportTemplate: () => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = "<p>안녕하세요</p>";

    const paragraphText = editor.querySelector("p")?.firstChild;
    if (!(paragraphText instanceof Text)) {
      throw new Error("paragraph text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(paragraphText, paragraphText.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editorInstance.insertWeeklyReportTemplate();

    const hostParagraph = editor.querySelector(":scope > p") as HTMLParagraphElement | null;
    expect(hostParagraph).not.toBeNull();
    expect(hostParagraph?.querySelector("h2, table, .re-table-wrap")).toBeNull();

    const reportTitle = editor.querySelector(":scope > h2.re-report-title") as HTMLHeadingElement | null;
    const wrappers = editor.querySelectorAll(":scope > div.re-table-wrap");
    expect(reportTitle).not.toBeNull();
    expect(wrappers.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps table resize handles visible after inserting weekly report", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      insertWeeklyReportTemplate: () => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = "<p><br></p>";

    editorInstance.insertWeeklyReportTemplate();

    const reportTables = editor.querySelectorAll("table.re-table");
    expect(reportTables.length).toBeGreaterThanOrEqual(2);

    const firstTable = reportTables[0] as HTMLTableElement;
    const secondTable = reportTables[1] as HTMLTableElement;
    expect(firstTable.querySelectorAll(".re-col-handle").length).toBeGreaterThan(0);
    expect(secondTable.querySelectorAll(".re-col-handle").length).toBeGreaterThan(0);
    expect(firstTable.querySelectorAll(".re-table-corner-handle").length).toBe(4);
    expect(secondTable.querySelectorAll(".re-table-corner-handle").length).toBe(4);
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

  it("does not reset typing style when clicking editor root near a table", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      resetTypingColorToDefault: () => void;
    };

    const resetSpy = vi.spyOn(editorInstance as unknown as Record<string, unknown>, "resetTypingColorToDefault" as never);

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<div class="re-table-wrap"><table class="re-table"><tbody><tr><td>A</td></tr></tbody></table></div>',
      "<p><br></p>",
    ].join("");

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(editor, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    }));

    expect(resetSpy).not.toHaveBeenCalled();
    expect(editor.querySelector(':scope > span')).toBeNull();
    expect(editor.querySelector(':scope > p > span[style*="font-size"]')).toBeNull();
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

  it("wraps pasted top-level table and hydrates legacy attributes", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      decorateSpecialNodes: () => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<table width="80%" border="1" cellpadding="6" cellspacing="2" align="center"><tr><td align="right" valign="middle" nowrap>A</td></tr></table>';

    editorInstance.decorateSpecialNodes();

    const wrapper = editor.querySelector(":scope > div.re-table-wrap") as HTMLDivElement | null;
    const table = wrapper?.querySelector(":scope > table.re-table") as HTMLTableElement | null;
    const cell = table?.querySelector("td") as HTMLTableCellElement | null;

    expect(wrapper).not.toBeNull();
    expect(table).not.toBeNull();
    expect(cell).not.toBeNull();
    expect(table?.style.width).toBe("80%");
    expect(table?.style.borderWidth).toBe("1px");
    expect(table?.style.marginLeft).toBe("auto");
    expect(table?.style.marginRight).toBe("auto");
    expect(cell?.style.textAlign).toBe("right");
    expect(cell?.style.verticalAlign).toBe("middle");
    expect(cell?.style.padding).toBe("6px");
    expect(cell?.style.whiteSpace).toBe("nowrap");
  });

  it("initializes table and cell property dialog inputs from legacy attributes", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      applyTableProperties: () => void;
      applyRowProperties: () => void;
      applyCellProperties: () => void;
      applyColumnProperties: () => void;
      tablePropsWidthInput: HTMLInputElement;
      tablePropsBorderWidthInput: HTMLInputElement;
      tablePropsMarginInput: HTMLInputElement;
      tablePropsPaddingInput: HTMLInputElement;
      tablePropsAlignSelect: HTMLSelectElement;
      tablePropsRowPaddingInput: HTMLInputElement;
      tablePropsRowMarginInput: HTMLInputElement;
      tablePropsCellAlignSelect: HTMLSelectElement;
      tablePropsCellVAlignSelect: HTMLSelectElement;
      tablePropsCellWrapSelect: HTMLSelectElement;
      tablePropsCellPaddingInput: HTMLInputElement;
      tablePropsCellMarginInput: HTMLInputElement;
      tablePropsColPaddingInput: HTMLInputElement;
      tablePropsColMarginInput: HTMLInputElement;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<div class="re-table-wrap"><table class="re-table" width="75%" border="2" align="right" cellpadding="8" style="margin: 4px auto 8px auto">',
      '<tr><td align="center" valign="middle" nowrap style="padding: 9px; margin: 3px">A</td></tr>',
      "</table></div>",
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

    editorInstance.applyTableProperties();
    expect(editorInstance.tablePropsWidthInput.value).toBe("75%");
    expect(editorInstance.tablePropsBorderWidthInput.value).toBe("2");
    expect(editorInstance.tablePropsMarginInput.value).toBe("4 auto 8");
    expect(editorInstance.tablePropsPaddingInput.value).toBe("9");
    expect(editorInstance.tablePropsAlignSelect.value).toBe("center");

    selection.removeAllRanges();
    selection.addRange(range);
    editorInstance.applyRowProperties();
    expect(editorInstance.tablePropsRowPaddingInput.value).toBe("9");
    expect(editorInstance.tablePropsRowMarginInput.value).toBe("3");

    selection.removeAllRanges();
    selection.addRange(range);

    editorInstance.applyCellProperties();
    expect(editorInstance.tablePropsCellAlignSelect.value).toBe("center");
    expect(editorInstance.tablePropsCellVAlignSelect.value).toBe("middle");
    expect(editorInstance.tablePropsCellWrapSelect.value).toBe("nowrap");
    expect(editorInstance.tablePropsCellPaddingInput.value).toBe("9");
    expect(editorInstance.tablePropsCellMarginInput.value).toBe("3");

    selection.removeAllRanges();
    selection.addRange(range);
    editorInstance.applyColumnProperties();
    expect(editorInstance.tablePropsColPaddingInput.value).toBe("9");
    expect(editorInstance.tablePropsColMarginInput.value).toBe("3");
  });

  it("applies only changed table property fields", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      applyTableProperties: () => void;
      applyTablePropsDialog: () => void;
      tablePropsWidthInput: HTMLInputElement;
      tablePropsBorderColorInput: HTMLInputElement;
      tablePropsBgColorInput: HTMLInputElement;
      tablePropsPaddingInput: HTMLInputElement;
      tablePropsMarginInput: HTMLInputElement;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<div class="re-table-wrap"><table class="re-table" style="width: 75%; border-color: rgb(255, 0, 0); margin: 4px auto;">',
      '<tr><td style="padding: 9px; color: rgb(0, 0, 255);">A</td></tr>',
      "</table></div>",
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

    editorInstance.applyTableProperties();
    editorInstance.tablePropsWidthInput.value = "60%";
    editorInstance.applyTablePropsDialog();

    const table = editor.querySelector("table") as HTMLTableElement | null;
    const cell = editor.querySelector("td") as HTMLTableCellElement | null;

    expect(table).not.toBeNull();
    expect(cell).not.toBeNull();
    expect(table?.style.width).toBe("60%");
    expect(table?.style.borderColor).toBe("rgb(255, 0, 0)");
    expect(table?.style.margin).toBe("4px auto");
    expect(cell?.style.padding).toBe("9px");
    expect(cell?.style.color).toBe("rgb(0, 0, 255)");
    expect(editorInstance.tablePropsBorderColorInput.value.length).toBeGreaterThan(0);
    expect(editorInstance.tablePropsBgColorInput.value).toBe("");
    expect(editorInstance.tablePropsPaddingInput.value).toBe("9");
    expect(editorInstance.tablePropsMarginInput.value).toBe("4 auto");
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

  it("supports custom undo/redo snapshot after insertTable", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      insertTable: (rows: number, cols: number) => void;
      applyMergeUndoSnapshot: () => boolean;
      applyMergeRedoSnapshot: () => boolean;
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

    editorInstance.insertTable(2, 2);
    expect(editor.querySelectorAll("table.re-table").length).toBeGreaterThan(0);

    expect(editorInstance.applyMergeUndoSnapshot()).toBe(true);
    expect(editor.querySelectorAll("table.re-table").length).toBe(0);

    expect(editorInstance.applyMergeRedoSnapshot()).toBe(true);
    expect(editor.querySelectorAll("table.re-table").length).toBeGreaterThan(0);
  });

  it("supports custom undo snapshot after deleteTable", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      deleteTable: () => void;
      applyMergeUndoSnapshot: () => boolean;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">A</td></tr></table></div>',
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
    expect(editor.querySelectorAll("table.re-table").length).toBe(0);

    expect(editorInstance.applyMergeUndoSnapshot()).toBe(true);
    expect(editor.querySelectorAll("table.re-table").length).toBeGreaterThan(0);
  });

  it("supports undo/redo after deleting an image object", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      deleteSpecificImage: (wrapper: HTMLElement, source: "outside-image-boundary" | "active-image") => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<p>앞</p><span class="re-image-wrap" contenteditable="false"><img src="x" alt="x" style="width: 120px;"></span><p>뒤</p>';

    const wrapper = editor.querySelector(".re-image-wrap") as HTMLElement | null;
    if (!wrapper) {
      throw new Error("image wrapper missing");
    }

    editorInstance.deleteSpecificImage(wrapper, "active-image");
    expect(editor.querySelector(".re-image-wrap")).toBeNull();

    editorInstance.exec("undo");
    expect(editor.querySelector(".re-image-wrap")).not.toBeNull();

    editorInstance.exec("redo");
    expect(editor.querySelector(".re-image-wrap")).toBeNull();
  });

  it("supports undo/redo after resizing an image object", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      attachImageResizer: (wrapper: HTMLElement, img: HTMLImageElement) => void;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<p>앞</p><span class="re-image-wrap" contenteditable="false"><img src="x" alt="x" style="width: 120px; height: 60px;"></span><p>뒤</p>';

    const wrapper = editor.querySelector(".re-image-wrap") as HTMLElement | null;
    const img = editor.querySelector(".re-image-wrap img") as HTMLImageElement | null;
    if (!wrapper || !img) {
      throw new Error("image wrapper missing");
    }

    editorInstance.attachImageResizer(wrapper, img);
    const handle = wrapper.querySelector(".re-image-handle-ne") as HTMLElement | null;
    if (!handle) {
      throw new Error("resize handle missing");
    }

    const beforeWidth = img.style.width;
    handle.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, clientX: 100 }));
    window.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, cancelable: true, clientX: 180 }));
    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));

    const afterWidth = img.style.width;
    expect(afterWidth).not.toBe(beforeWidth);

    editorInstance.exec("undo");
    expect((editor.querySelector(".re-image-wrap img") as HTMLImageElement).style.width).toBe(beforeWidth);

    editorInstance.exec("redo");
    expect((editor.querySelector(".re-image-wrap img") as HTMLImageElement).style.width).toBe(afterWidth);
  });

  it("supports custom undo/redo snapshot after addRow", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      addRow: () => void;
      applyMergeUndoSnapshot: () => boolean;
      applyMergeRedoSnapshot: () => boolean;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = [
      '<div class="re-table-wrap">',
      '<table class="re-table"><tr><td contenteditable="true">A</td></tr></table>',
      "</div>",
      "<p><br></p>",
    ].join("");

    const table = editor.querySelector("table.re-table") as HTMLTableElement;
    const beforeRows = table.rows.length;

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

    editorInstance.addRow();
    const afterAddRows = (editor.querySelector("table.re-table") as HTMLTableElement).rows.length;
    expect(afterAddRows).toBeGreaterThan(beforeRows);

    expect(editorInstance.applyMergeUndoSnapshot()).toBe(true);
    expect((editor.querySelector("table.re-table") as HTMLTableElement).rows.length).toBe(beforeRows);

    expect(editorInstance.applyMergeRedoSnapshot()).toBe(true);
    expect((editor.querySelector("table.re-table") as HTMLTableElement).rows.length).toBe(afterAddRows);
  });

  it("supports custom undo/redo snapshot after applying table properties", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      applyTableProperties: () => void;
      applyTablePropsDialog: () => void;
      applyMergeUndoSnapshot: () => boolean;
      applyMergeRedoSnapshot: () => boolean;
      tablePropsWidthInput: HTMLInputElement;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">A</td></tr></table></div><p><br></p>';

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

    const table = editor.querySelector("table.re-table") as HTMLTableElement;
    const beforeWidth = table.style.width;

    editorInstance.applyTableProperties();
    editorInstance.tablePropsWidthInput.value = "640";
    editorInstance.applyTablePropsDialog();

    const afterApplyWidth = (editor.querySelector("table.re-table") as HTMLTableElement).style.width;
    expect(afterApplyWidth).toBe("640px");

    expect(editorInstance.applyMergeUndoSnapshot()).toBe(true);
    expect((editor.querySelector("table.re-table") as HTMLTableElement).style.width).toBe(beforeWidth);

    expect(editorInstance.applyMergeRedoSnapshot()).toBe(true);
    expect((editor.querySelector("table.re-table") as HTMLTableElement).style.width).toBe("640px");
  });

  it("undoes and redoes applied table properties via exec", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      applyTableProperties: () => void;
      applyTablePropsDialog: () => void;
      tablePropsWidthInput: HTMLInputElement;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<div class="re-table-wrap"><table class="re-table" style="width: 320px;"><tr><td contenteditable="true">A</td></tr></table></div><p><br></p>';

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

    const table = editor.querySelector("table.re-table") as HTMLTableElement;
    expect(table.style.width).toBe("320px");

    editorInstance.applyTableProperties();
    editorInstance.tablePropsWidthInput.value = "640";
    editorInstance.applyTablePropsDialog();
    expect((editor.querySelector("table.re-table") as HTMLTableElement).style.width).toBe("640px");

    editorInstance.exec("undo");
    expect((editor.querySelector("table.re-table") as HTMLTableElement).style.width).toBe("320px");

    editorInstance.exec("redo");
    expect((editor.querySelector("table.re-table") as HTMLTableElement).style.width).toBe("640px");
  });

  it("does not delete table when undoing cell props after previewed apply", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      exec: (command: string, value?: string) => void;
      pushMergeUndoSnapshot: (beforeHtml: string) => void;
      applyCellProperties: () => void;
      previewTablePropsDialog: () => void;
      applyTablePropsDialog: () => void;
      tablePropsCellAlignSelect: HTMLSelectElement;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    const beforeTable = "<p>before</p>";
    const afterTable = '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">A</td></tr></table></div><p><br></p>';
    editor.innerHTML = afterTable;
    editorInstance.pushMergeUndoSnapshot(beforeTable);

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

    const cell = editor.querySelector("td") as HTMLTableCellElement;
    expect(cell.style.textAlign).toBe("");

    editorInstance.applyCellProperties();
    editorInstance.tablePropsCellAlignSelect.value = "center";
    editorInstance.previewTablePropsDialog();
    expect((editor.querySelector("td") as HTMLTableCellElement).style.textAlign).toBe("center");

    editorInstance.applyTablePropsDialog();
    expect((editor.querySelector("td") as HTMLTableCellElement).style.textAlign).toBe("center");

    editorInstance.exec("undo");
    expect(editor.querySelector("table.re-table")).not.toBeNull();
    expect((editor.querySelector("td") as HTMLTableCellElement).style.textAlign).toBe("");
  });

  it("supports custom undo/redo snapshot after applying row properties", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      applyRowProperties: () => void;
      applyTablePropsDialog: () => void;
      applyMergeUndoSnapshot: () => boolean;
      applyMergeRedoSnapshot: () => boolean;
      tablePropsRowHeightInput: HTMLInputElement;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">A</td><td contenteditable="true">B</td></tr></table></div><p><br></p>';

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

    const firstCell = editor.querySelector("td") as HTMLTableCellElement;
    const beforeHeight = firstCell.style.height;

    editorInstance.applyRowProperties();
    editorInstance.tablePropsRowHeightInput.value = "72";
    editorInstance.applyTablePropsDialog();

    expect((editor.querySelector("td") as HTMLTableCellElement).style.height).toBe("72px");

    expect(editorInstance.applyMergeUndoSnapshot()).toBe(true);
    expect((editor.querySelector("td") as HTMLTableCellElement).style.height).toBe(beforeHeight);

    expect(editorInstance.applyMergeRedoSnapshot()).toBe(true);
    expect((editor.querySelector("td") as HTMLTableCellElement).style.height).toBe("72px");
  });

  it("supports custom undo/redo snapshot after applying column properties", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      applyColumnProperties: () => void;
      applyTablePropsDialog: () => void;
      applyMergeUndoSnapshot: () => boolean;
      applyMergeRedoSnapshot: () => boolean;
      tablePropsColWidthInput: HTMLInputElement;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">A</td><td contenteditable="true">B</td></tr></table></div><p><br></p>';

    const firstCellText = editor.querySelector("td")?.firstChild;
    if (!(firstCellText instanceof Text)) {
      throw new Error("cell text missing");
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error("selection unavailable");
    }

    const range = document.createRange();
    range.setStart(firstCellText, firstCellText.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    const beforeMinWidth = (editor.querySelector("td") as HTMLTableCellElement).style.minWidth;

    editorInstance.applyColumnProperties();
    editorInstance.tablePropsColWidthInput.value = "150";
    editorInstance.applyTablePropsDialog();

    expect((editor.querySelector("td") as HTMLTableCellElement).style.minWidth).toBe("150px");

    expect(editorInstance.applyMergeUndoSnapshot()).toBe(true);
    expect((editor.querySelector("td") as HTMLTableCellElement).style.minWidth).toBe(beforeMinWidth);

    expect(editorInstance.applyMergeRedoSnapshot()).toBe(true);
    expect((editor.querySelector("td") as HTMLTableCellElement).style.minWidth).toBe("150px");
  });

  it("supports custom undo/redo snapshot after applying cell properties", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      applyCellProperties: () => void;
      applyTablePropsDialog: () => void;
      applyMergeUndoSnapshot: () => boolean;
      applyMergeRedoSnapshot: () => boolean;
      tablePropsCellAlignSelect: HTMLSelectElement;
    };

    const editor = root.querySelector(".re-editor") as HTMLDivElement;
    editor.innerHTML = '<div class="re-table-wrap"><table class="re-table"><tr><td contenteditable="true">A</td><td contenteditable="true">B</td></tr></table></div><p><br></p>';

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

    const firstCell = editor.querySelector("td") as HTMLTableCellElement;
    const beforeAlign = firstCell.style.textAlign;

    editorInstance.applyCellProperties();
    editorInstance.tablePropsCellAlignSelect.value = "center";
    editorInstance.applyTablePropsDialog();

    expect((editor.querySelector("td") as HTMLTableCellElement).style.textAlign).toBe("center");

    expect(editorInstance.applyMergeUndoSnapshot()).toBe(true);
    expect((editor.querySelector("td") as HTMLTableCellElement).style.textAlign).toBe(beforeAlign);

    expect(editorInstance.applyMergeRedoSnapshot()).toBe(true);
    expect((editor.querySelector("td") as HTMLTableCellElement).style.textAlign).toBe("center");
  });

  it("does not throw when adding row before after undo/redo restoration", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const editorInstance = new RichEditor(root) as unknown as {
      insertTable: (rows: number, cols: number) => void;
      addRow: (side?: "before" | "after") => void;
      applyMergeUndoSnapshot: () => boolean;
      applyMergeRedoSnapshot: () => boolean;
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

    editorInstance.insertTable(2, 2);
    expect(editor.querySelectorAll("table.re-table").length).toBeGreaterThan(0);

    expect(editorInstance.applyMergeUndoSnapshot()).toBe(true);
    expect(editorInstance.applyMergeRedoSnapshot()).toBe(true);

    const firstCellText = editor.querySelector("table.re-table td")?.firstChild;
    if (!(firstCellText instanceof Text)) {
      throw new Error("table cell text missing");
    }

    const cellRange = document.createRange();
    cellRange.setStart(firstCellText, firstCellText.length);
    cellRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(cellRange);

    const tableBefore = editor.querySelector("table.re-table") as HTMLTableElement;
    const rowsBefore = tableBefore.rows.length;

    expect(() => editorInstance.addRow("before")).not.toThrow();

    const tableAfter = editor.querySelector("table.re-table") as HTMLTableElement;
    expect(tableAfter.rows.length).toBeGreaterThan(rowsBefore);
  });
});