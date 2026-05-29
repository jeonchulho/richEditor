import { describe, expect, it } from "vitest";
import { cleanPasteHtml, cleanPasteText } from "./clean-paste";

describe("cleanPasteHtml", () => {
  it("removes script and event handlers", () => {
    const dirty = '<p onclick="alert(1)">ok<script>alert(1)</script><img src="x" onerror="alert(1)" /></p>';
    const clean = cleanPasteHtml(dirty);

    expect(clean).toContain("<p>ok");
    expect(clean).toContain('<img src="x">');
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("onclick");
  });

  it("keeps table tags for editor usage", () => {
    const dirty = "<table><tr><th>A</th></tr><tr><td>B</td></tr></table>";
    const clean = cleanPasteHtml(dirty);
    expect(clean).toContain("<table>");
    expect(clean).toContain("<th>A</th>");
    expect(clean).toContain("<td>B</td>");
  });
});

describe("cleanPasteText", () => {
  it("normalizes CRLF to LF", () => {
    expect(cleanPasteText("a\r\nb\r\n")).toBe("a\nb\n");
  });
});
