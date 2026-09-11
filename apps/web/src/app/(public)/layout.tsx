import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </>
  );
}
