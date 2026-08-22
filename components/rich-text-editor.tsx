"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Underline,
} from "lucide-react";
import { ClipboardEvent, useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
};

const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SUP", "SUB", "A", "P", "BR", "UL", "OL", "LI", "BLOCKQUOTE", "SPAN", "DIV"]);

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const element = node as HTMLElement;
  if (!allowedTags.has(element.tagName)) return Array.from(element.childNodes).map(sanitizeNode).join("");
  const tag = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map(sanitizeNode).join("");
  if (tag === "br") return "<br>";
  if (tag === "a") {
    const href = element.getAttribute("href");
    const safeHref = href && /^(https?:|mailto:)/i.test(href) ? ` href="${href.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"` : "";
    return `<a${safeHref}>${children}</a>`;
  }
  return `<${tag}>${children}</${tag}>`;
}

function sanitizeHtml(html: string) {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.body.childNodes).map(sanitizeNode).join("");
}

export default function RichTextEditor({ value, onChange, ariaLabel = "Rich text editor" }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  function commit() {
    if (editorRef.current) onChange(sanitizeHtml(editorRef.current.innerHTML));
  }

  function run(command: string, valueArg?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, valueArg);
    commit();
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const plain = event.clipboardData.getData("text/plain");
    if (!plain || (!plain.includes("\n") && !plain.includes("\r"))) return;
    event.preventDefault();
    const safe = escapeHtml(plain.replace(/\r\n?/g, "\n")).replace(/\n/g, "<br>");
    document.execCommand("insertHTML", false, safe);
    commit();
  }

  const tools = [
    ["bold", Bold, "Bold"],
    ["italic", Italic, "Italic"],
    ["underline", Underline, "Underline"],
    ["formatBlock", Quote, "Quote", "blockquote"],
    ["insertUnorderedList", List, "Bulleted list"],
    ["insertOrderedList", ListOrdered, "Numbered list"],
    ["justifyLeft", AlignLeft, "Align left"],
    ["justifyCenter", AlignCenter, "Align center"],
    ["justifyRight", AlignRight, "Align right"],
  ] as const;

  return (
    <div className="rich-editor-shell">
      <div className="rich-toolbar" role="toolbar" aria-label="Text formatting">
        {tools.map(([command, Icon, label, argument]) => (
          <button key={label} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => run(command, argument)} title={label} aria-label={label}>
            <Icon size={14} />
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        className="rich-editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        onPaste={handlePaste}
        onInput={commit}
      />
    </div>
  );
}
