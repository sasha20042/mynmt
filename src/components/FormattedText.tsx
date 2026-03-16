"use client";

import type React from "react";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Парсить один параграф: **жирний** *курсив* [[по центру]] і повертає масив React-вузлів */
function parseInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest.length > 0) {
    const centerMatch = rest.match(/^\[\[([\s\S]+?)\]\]/);
    const boldMatch = rest.match(/^\*\*(.+?)\*\*/);
    const italicMatch = rest.match(/^\*(.+?)\*/);
    if (centerMatch) {
      out.push(
        <span key={key++} className="block text-center w-full my-0.5">
          {parseInline(centerMatch[1].trim())}
        </span>
      );
      rest = rest.slice(centerMatch[0].length);
      continue;
    }
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
    const nextCenter = rest.search(/\[\[/);
    const nextBold = rest.indexOf("**");
    const nextItalic = rest.indexOf("*");
    let cut = rest.length;
    if (nextCenter >= 0) cut = Math.min(cut, nextCenter);
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

/** Чи рядок — це повністю [[...]] для центрування */
function isCenterLine(line: string): boolean {
  return /^\s*\[\[[\s\S]+\]\]\s*$/.test(line);
}

/** Витягнути вміст з [[...]] */
function extractCenterContent(line: string): string | null {
  const m = line.trim().match(/^\[\[([\s\S]+)\]\]$/);
  return m ? m[1].trim() : null;
}

/**
 * Відображає текст з мінімальним форматуванням:
 * - **текст** — жирний
 * - *текст* — курсив
 * - [[текст]] — вирівняний по центру (окремий рядок або рядок у параграфі)
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
        const lines = trimmed.split("\n");
        const parts: React.ReactNode[] = [];
        let lineIndex = 0;
        let partKey = 0;
        while (lineIndex < lines.length) {
          const line = lines[lineIndex];
          const centerContent = extractCenterContent(line);
          if (centerContent !== null) {
            parts.push(
              <p key={partKey++} className="text-center my-1">
                {parseInline(centerContent)}
              </p>
            );
            lineIndex += 1;
            continue;
          }
          const normalLines: string[] = [];
          while (lineIndex < lines.length && extractCenterContent(lines[lineIndex]) === null) {
            normalLines.push(lines[lineIndex]);
            lineIndex += 1;
          }
          if (normalLines.length > 0) {
            parts.push(
              <p key={partKey++}>
                {normalLines.map((ln, j) => (
                  <span key={j}>
                    {j > 0 && <br />}
                    {parseInline(ln)}
                  </span>
                ))}
              </p>
            );
          }
        }
        if (parts.length === 0) return null;
        if (parts.length === 1) return parts[0];
        return <div key={i} className="space-y-1">{parts}</div>;
      })}
    </div>
  );
}
