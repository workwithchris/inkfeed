import { marked } from "marked";
import TurndownService from "turndown";

marked.setOptions({ gfm: true, breaks: false });

const turndown = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "_",
  strongDelimiter: "**",
});

turndown.addRule("fencedCodeBlock", {
  filter: (node) =>
    node.nodeName === "PRE" &&
    !!node.firstChild &&
    node.firstChild.nodeName === "CODE",
  replacement: (_content, node) => {
    const code = (node as HTMLElement).querySelector("code");
    const className = code?.getAttribute("class") ?? "";
    const language = /language-(\w+)/.exec(className)?.[1] ?? "";
    const text = code?.textContent ?? "";
    return `\n\n\`\`\`${language}\n${text.replace(/\n$/, "")}\n\`\`\`\n\n`;
  },
});

export function markdownToHtml(markdown: string): string {
  if (!markdown?.trim()) return "";
  return marked.parse(markdown, { async: false }) as string;
}

export function htmlToMarkdown(html: string): string {
  if (!html?.trim()) return "";
  return turndown.turndown(html).trim();
}

export function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(html: string): number {
  const text = htmlToPlainText(html);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

export function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
