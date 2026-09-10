import { marked } from "marked";

// Markdown -> HTML for platforms that don't accept markdown natively
// (Blogger, Ghost, WordPress).
export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false, gfm: true, breaks: false });
}
