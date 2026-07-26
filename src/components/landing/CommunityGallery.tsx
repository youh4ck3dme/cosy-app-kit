import { Link } from "@tanstack/react-router";
import { Code2, FileText, Braces } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const KIND_ICON: Record<string, LucideIcon> = {
  html: Code2,
  markdown: FileText,
  code: Braces,
};

export function CommunityGallery({
  made,
}: {
  made: Array<{ id: string; title: string; kind: string }>;
}) {
  if (made.length === 0) return null;

  return (
    <section
      className="relative z-10 mx-auto max-w-4xl px-4 py-16 sm:px-10"
      aria-labelledby="made-heading"
    >
      <h2 id="made-heading" className="text-center text-lg font-semibold">
        Made with Builder
      </h2>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        Public artifacts from the community canvas.
      </p>
      <ul className="stagger mt-8 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {made.map((a) => {
          const Icon = KIND_ICON[a.kind] ?? Code2;
          return (
            <li key={a.id}>
              <Link
                to="/a/$artifactId"
                params={{ artifactId: a.id }}
                className="group block rounded-xl border border-border-subtle bg-surface-1/50 p-4 transition-colors hover:border-accent-primary/35"
              >
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-muted-foreground group-hover:text-accent-primary">
                  <Icon className="h-3 w-3" aria-hidden />
                  {a.kind}
                </div>
                <div className="mt-1 truncate text-sm font-medium">{a.title}</div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
