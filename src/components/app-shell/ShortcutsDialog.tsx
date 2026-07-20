import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["⌘", "K"], label: "Command palette" },
  { keys: ["⌘", "⇧", "O"], label: "New chat" },
  { keys: ["⌘", "/"], label: "Focus composer" },
  { keys: ["⌘", "."], label: "Toggle chat / preview" },
  { keys: ["["], label: "Previous chat" },
  { keys: ["]"], label: "Next chat" },
  { keys: ["Enter"], label: "Send message" },
  { keys: ["⇧", "Enter"], label: "New line" },
  { keys: ["?"], label: "This cheatsheet" },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-surface-2 px-1.5 font-mono text-[11px] font-medium text-foreground shadow-[inset_0_-1px_0_0_var(--color-border-strong)]">
      {children}
    </kbd>
  );
}

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Move around Builder without touching the mouse.</DialogDescription>
        </DialogHeader>
        <dl className="mt-2 space-y-2.5">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-4">
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd className="m-0 flex items-center gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
