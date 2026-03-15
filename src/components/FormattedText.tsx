"use client";

import type React from "react";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Парсить один параграф: **жирний** *курсив* і повертає масив React-вузлів */
function parseInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest.length > 0) {
    const boldMatch = rest.match(/^\*\*(.+?)\*\*/);
    const italicMatch = rest.match(/^\*(.+?)\*/);
    if (boldMatch) {
      out.push(<strong key={key++}>{escapeHtml(boldMatch[1])}</strong>);
      rest = rest.slice(boldMatch[0].length);
      continue;
    }
    if (italicMatch) {
      out.push(<em key={key++}>{escapeHtml(italicMatch[1])}</em>);
      rest = rest.slice(italicMatch[0].length);
      continue;
    }
    const nextBold = rest.indexOf("**");
    const nextItalic = rest.indexOf("*");
    let cut = rest.length;
    if (nextBold >= 0) cut = Math.min(cut, nextBold);
    if (nextItalic >= 0) cut = Math.min(cut, nextItalic);
    if (cut > 0) {
      out.push(<span key={key++}>{escapeHtml(rest.slice(0, cut))}</span>);
      rest = rest.slice(cut);
    } else {
      out.push(<span key={key++}>{escapeHtml(rest.slice(0, 1))}</span>);
      rest = rest.slice(1);
    }
  }
  return out;
}

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Відображає текст з мінімальним форматуванням:
 * - **текст** — жирний
 * - *текст* — курсив
 * - [[текст]] — вирівняний по центру (окремий рядок)
 * - Порожній рядок — новий абзац
 */
export function FormattedText({ text, className = "" }: FormattedTextProps) {
  if (!text || typeof text !== "string") return null;
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className={`text-slate-800 font-medium mb-4 space-y-3 ${className}`}>
      {paragraphs.map((para, i) => {
        const trimmed = para.trim();
        if (!trimmed) return <br key={i} />;
        const centerMatch = trimmed.match(/^\[\[([\s\S]+)\]\]$/);
        if (centerMatch) {
          return (
            <p key={i} className="text-center">
              {parseInline(centerMatch[1].trim())}
            </p>
          );
        }
        const lines = trimmed.split("\n");
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {parseInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
