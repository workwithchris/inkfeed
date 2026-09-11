export interface RssItem {
  title: string;
  link: string;
  description?: string | null;
  pubDate?: string | null;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function itemXml(item: RssItem): string {
  const lines = [
    "<item>",
    `  <title>${escapeXml(item.title)}</title>`,
    `  <link>${escapeXml(item.link)}</link>`,
    `  <guid isPermaLink="true">${escapeXml(item.link)}</guid>`,
  ];
  if (item.pubDate) {
    lines.push(`  <pubDate>${new Date(item.pubDate).toUTCString()}</pubDate>`);
  }
  if (item.description?.trim()) {
    lines.push(`  <description>${escapeXml(item.description.trim())}</description>`);
  }
  lines.push("</item>");
  return lines.join("\n");
}

export function buildRssFeed(input: {
  title: string;
  link: string;
  description: string;
  selfUrl: string;
  items: RssItem[];
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeXml(input.title)}</title>
<link>${escapeXml(input.link)}</link>
<description>${escapeXml(input.description)}</description>
<language>en</language>
<atom:link href="${escapeXml(input.selfUrl)}" rel="self" type="application/rss+xml" />
${input.items.map(itemXml).join("\n")}
</channel>
</rss>`;
}
