import { useState } from "react";
import { Send, Plus, Mic, MoreHorizontal, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Chip } from "./Chip";

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
  const [menuOpen, setMenuOpen] = useState(false);

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  };

  return (
    <div className="w-full">
      {suggestions.length > 0 && (
        <div className="mb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {suggestions.map((s) => (
            <Chip key={s} onClick={() => setText(s)}>
              {s}
            </Chip>
          ))}
        </div>
      )}
      <div className="relative flex flex-col rounded-[28px] border border-border bg-panel p-2.5 shadow-2xl transition-all focus-within:border-muted-foreground/40 focus-within:ring-1 focus-within:ring-muted-foreground/20">
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
          className="max-h-[240px] min-h-[56px] w-full resize-none bg-transparent px-3 pb-6 pt-2 text-[15px] outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <IconBtn title="Attach">
              <Plus className="h-4.5 w-4.5" />
            </IconBtn>
            <IconBtn title="More">
              <MoreHorizontal className="h-4.5 w-4.5" />
            </IconBtn>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 120)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium hover:bg-elevated"
              >
                {mode}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              {menuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-56 overflow-hidden rounded-xl border border-border bg-panel p-1 shadow-2xl">
                  {(["Build", "Plan"] as const).map((m) => (
                    <button
                      key={m}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setMode(m);
                        setMenuOpen(false);
                      }}
                      className={cn(
                        "flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm hover:bg-surface",
                        mode === m && "bg-surface",
                      )}
                    >
                      <span className="font-medium">{m}</span>
                      <span className="text-xs text-muted-foreground">
                        {m === "Build" ? "Ship changes immediately" : "Discuss before building"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <IconBtn title="Voice">
              <Mic className="h-4.5 w-4.5" />
            </IconBtn>
            <button
              onClick={submit}
              disabled={disabled || !text.trim()}
              className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
              title="Send"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-sm transition-colors hover:bg-elevated hover:text-foreground"
    >
      {children}
    </button>
  );
}
