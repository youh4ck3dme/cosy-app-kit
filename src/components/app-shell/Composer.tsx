import { useState } from "react";
import { ArrowUp, Plus, Mic, Sparkles, Hammer, ListTodo, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export function Composer({
  onSend,
  disabled,
  streaming,
  suggestions = [],
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  streaming?: boolean;
  suggestions?: string[];
}) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"Build" | "Plan">("Build");

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  };

  return (
    <div className="w-full">
      {suggestions.length > 0 && (
        <div className="mb-3 flex items-center gap-2 overflow-x-auto no-scrollbar stagger">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setText(s)}
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-subtle bg-surface-1/60 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-accent-primary/40 hover:bg-surface-2 hover:text-foreground"
            >
              <Sparkles className="h-3 w-3 text-accent-primary/70 transition-transform group-hover:scale-110" />
              {s}
            </button>
          ))}
        </div>
      )}
      <div
        className={cn(
          "relative flex flex-col rounded-[24px] border border-border-subtle bg-panel/80 p-2 shadow-elevated backdrop-blur-xl transition-all",
          "focus-within:border-accent-primary/40 focus-within:shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-accent-primary)_25%,transparent),0_20px_60px_-20px_color-mix(in_oklab,black_60%,transparent)]",
        )}
      >
        <textarea
          rows={1}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask Builder to design, code, or explain…"
          className="max-h-[240px] min-h-[52px] w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1">
            <IconBtn title="Attach">
              <Plus className="h-4 w-4" />
            </IconBtn>
            {/* Build / Plan segmented control */}
            <div className="ml-1 flex items-center rounded-full border border-border-subtle bg-surface-1/70 p-0.5 text-[12px] font-medium">
              {([
                { key: "Build", Icon: Hammer },
                { key: "Plan", Icon: ListTodo },
              ] as const).map(({ key, Icon }) => {
                const active = mode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all",
                      active
                        ? "bg-surface-3 text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {key}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <IconBtn title="Voice">
              <Mic className="h-4 w-4" />
            </IconBtn>
            <button
              onClick={submit}
              disabled={(disabled || !text.trim()) && !streaming}
              className={cn(
                "ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full transition-all",
                streaming
                  ? "bg-surface-3 text-foreground hover:bg-surface-2"
                  : "bg-gradient-to-b from-foreground to-foreground/85 text-primary-foreground shadow-[0_0_20px_-4px_color-mix(in_oklab,white_50%,transparent)] hover:scale-[1.05] disabled:cursor-not-allowed disabled:from-surface-3 disabled:to-surface-3 disabled:text-muted-foreground disabled:shadow-none disabled:hover:scale-100",
              )}
              title={streaming ? "Streaming…" : "Send"}
            >
              {streaming ? <Square className="h-3 w-3 fill-current" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-surface-2 hover:text-foreground"
    >
      {children}
    </button>
  );
}
