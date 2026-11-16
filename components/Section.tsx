import Link from "next/link";

export function Section({
  title,
  href,
  linkLabel = "مشاهده‌ی همه",
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16 md:pt-20">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-line pb-3">
        <h2 className="text-2xl font-extrabold leading-tight md:text-[28px]">{title}</h2>
        {href && (
          <Link href={href} className="shrink-0 text-sm text-neon-soft underline-offset-4 hover:underline">
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
