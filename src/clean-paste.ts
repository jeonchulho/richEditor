import DOMPurify from "dompurify";

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

const ALLOWED_ATTR = [
  "style",
  "src",
  "alt",
  "rowspan",
  "colspan",
  "width",
  "height",
  "href",
  "target",
  "rel",
] as const;

export function cleanPasteHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
  });
}

export function cleanPasteText(text: string): string {
  return text.replace(/\r\n/g, "\n");
}
