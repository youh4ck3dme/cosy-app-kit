import { Bot, KeyRound } from "lucide-react";

export function AgentsCard({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-panel p-5 shadow-elevated">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Agents</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Model, temperature, system prompt, and tool toggles for this workspace.
      </p>
      <button
        type="button"
        onClick={onOpenSettings}
        className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
      >
        Open agent settings
      </button>
    </section>
  );
}

export function SecretsCard() {
  return (
    <section className="rounded-2xl border border-border-subtle bg-panel p-5 shadow-elevated">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Secrets</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Keys stay in Lovable Cloud Secrets or local <code className="font-mono text-[12px]">.env</code> —
        never in the client.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        <li>
          <span className="font-mono text-[12px] text-foreground">MISTRAL_API_KEY</span> — chat /
          agent (required)
        </li>
        <li>
          <span className="font-mono text-[12px] text-foreground">SUPABASE_*</span> — Auth + DB
          (publishable only in Vite)
        </li>
        <li>
          <span className="font-mono text-[12px] text-foreground">PREVIEW_SIGNING_SECRET</span> —
          optional private preview tokens
        </li>
      </ul>
      <p className="mt-3 text-[12px] text-muted-foreground">
        See <span className="font-mono">.env.example</span> and Lovable → Project → Cloud → Secrets.
      </p>
    </section>
  );
}
