const TLDR_SECTION =
  /^#{1,6}[ \t]*TL;?DR\b[^\n]*\n+(?:(?!^#{1,6}[ \t]).*\n?)*/gim;

export function stripTldr(content: string): string {
  return content.replace(TLDR_SECTION, "").trimStart();
}
