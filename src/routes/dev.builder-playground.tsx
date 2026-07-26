import { createFileRoute, Link } from "@tanstack/react-router";

import { BuilderKernelPlayground } from "@/components/builder-playground/BuilderKernelPlayground";

export const Route = createFileRoute("/dev/builder-playground")({
  head: () => ({
    meta: [
      { title: "Builder Kernel Playground · Dev" },
      {
        name: "description",
        content:
          "Developer tooling for manual visual testing of the headless Builder Kernel.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BuilderPlaygroundPage,
});

function BuilderPlaygroundPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border-subtle px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Developer tooling
            </p>
            <h1 className="text-lg font-semibold tracking-tight">
              Builder Kernel Playground
            </h1>
          </div>
          <nav className="flex gap-3 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Home
            </Link>
            <Link to="/templates" className="hover:text-foreground">
              Templates
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6">
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Manual visual testing for the headless Builder Kernel. Uses public kernel
          APIs only — not an end-user product surface.
        </p>
        <BuilderKernelPlayground />
      </main>
    </div>
  );
}
