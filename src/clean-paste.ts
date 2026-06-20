import DOMPurify from "dompurify";

// 붙여넣기 HTML에서 허용할 태그 목록.
// 에디터 기능(표/리스트/제목/링크/이미지)에 필요한 최소 집합만 허용한다.
const ALLOWED_TAGS = [
  "p",
  "br",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "span",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
  "h1",
  "h2",
  "h3",
  "blockquote",
  "a",
] as const;

// 붙여넣기 HTML에서 허용할 속성 목록.
// 스타일/링크/이미지/셀 span 속성을 유지하기 위해 제한적으로 허용한다.
const ALLOWED_ATTR = [
  "class",
  "style",
  "src",
  "alt",
  "rowspan",
  "colspan",
  "width",
  "height",
  "align",
  "valign",
  "cellpadding",
  "cellspacing",
  "border",
  "bgcolor",
  "bordercolor",
  "nowrap",
  "scope",
  "href",
  "target",
  "rel",
] as const;

// 외부 HTML을 안전한 형태로 정제한다.
// script, 이벤트 핸들러, 허용되지 않은 태그/속성은 제거된다.
export function cleanPasteHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
  });
}

// 윈도우 줄바꿈(CRLF)을 LF로 통일해 내부 처리 일관성을 맞춘다.
export function cleanPasteText(text: string): string {
  return text.replace(/\r\n/g, "\n");
}
