import { describe, expect, it } from "vitest";
import { cleanPasteHtml, cleanPasteText } from "./clean-paste";

// HTML 정제 로직 검증:
// 위험 스크립트/인라인 이벤트 제거, 에디터 핵심 태그 보존 여부를 확인한다.
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

  it("keeps common table attributes used by external HTML", () => {
    const dirty = '<table class="ext-table" width="80%" border="1" cellpadding="6" cellspacing="2" align="center" bgcolor="#eeeeee"><tr><td align="right" valign="middle" nowrap>V</td></tr></table>';
    const clean = cleanPasteHtml(dirty);

    expect(clean).toContain('class="ext-table"');
    expect(clean).toContain('width="80%"');
    expect(clean).toContain('border="1"');
    expect(clean).toContain('cellpadding="6"');
    expect(clean).toContain('cellspacing="2"');
    expect(clean).toContain('align="center"');
    expect(clean).toContain('bgcolor="#eeeeee"');
    expect(clean).toContain('valign="middle"');
    expect(clean).toContain("nowrap");
  });
});

// 텍스트 정제 로직 검증:
// 운영체제별 줄바꿈 차이를 내부 표준(LF)으로 통일하는지 확인한다.
describe("cleanPasteText", () => {
  it("normalizes CRLF to LF", () => {
    expect(cleanPasteText("a\r\nb\r\n")).toBe("a\nb\n");
  });
});
