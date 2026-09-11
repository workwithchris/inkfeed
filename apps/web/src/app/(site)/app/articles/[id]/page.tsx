import type { Metadata } from "next";
import { QueryProvider } from "@/components/query-provider";
import { ArticleDetail } from "@/components/article-detail";

export const metadata: Metadata = {
  title: "Article",
};

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <QueryProvider>
      <ArticleDetail id={id} />
    </QueryProvider>
  );
}
