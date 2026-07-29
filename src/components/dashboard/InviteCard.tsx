import { Copy, Link2, Users } from "lucide-react";

export function InviteCard({
  appUrl,
  shareUrl,
  onCopyApp,
  onCopyShare,
}: {
  appUrl: string;
  shareUrl: string | null;
  onCopyApp: () => void;
  onCopyShare: () => void;
}) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-panel p-5 shadow-elevated">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Invite Users</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Grow access by sharing Builder or a public artifact link
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onCopyApp}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-1/70 px-3 text-sm transition-colors hover:bg-surface-2"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy Link
        </button>
        <button
          type="button"
          disabled={!shareUrl}
          onClick={onCopyShare}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-2 px-3 text-sm font-medium transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Link2 className="h-3.5 w-3.5" />
          Copy artifact share
        </button>
      </div>

      <p className="mt-3 break-all font-mono text-[11px] text-muted-foreground">{appUrl}</p>
      {!shareUrl && (
        <p className="mt-2 text-[12px] text-muted-foreground">
          Make an artifact public in App Visibility to enable a share link.
        </p>
      )}
    </section>
  );
}
