import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import DOMPurify from "isomorphic-dompurify";

const extensions = [StarterKit, Image, Link];

/**
 * Tiptap JSON → 정제된 HTML 문자열.
 * 서버 사이드에서 게시글 본문 렌더링용.
 */
export function renderTiptapContent(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  try {
    const html = generateHTML(json as Parameters<typeof generateHTML>[0], extensions);
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "s",
        "u",
        "a",
        "img",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "blockquote",
        "pre",
        "code",
        "div",
        "span",
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "class", "target", "rel"],
    });
  } catch {
    return "";
  }
}

/**
 * Tiptap JSON → 플레인 텍스트 (미리보기/검색용).
 * JSON 구조를 순회하여 모든 텍스트 노드 추출.
 */
export function getTiptapPlainText(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  try {
    const doc = json as { content?: Array<{ content?: Array<{ text?: string }> }> };
    return (doc.content ?? [])
      .flatMap((node) => (node.content ?? []).map((child) => child.text ?? ""))
      .join(" ")
      .trim();
  } catch {
    return "";
  }
}
