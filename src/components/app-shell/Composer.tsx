import { Hammer, ListTodo, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";

export type BuilderMode = "Build" | "Plan";

export function Composer({
  onSend,
  disabled,
  streaming,
  suggestions = [],
  mode,
  onModeChange,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  streaming?: boolean;
  suggestions?: string[];
  mode: BuilderMode;
  onModeChange: (m: BuilderMode) => void;
}) {
  const handleSubmit = (message: PromptInputMessage) => {
    const t = message.text?.trim();
    if (!t || disabled) return;
    haptic();
    onSend(t);
  };

  const status: "ready" | "submitted" | "streaming" | "error" = streaming ? "streaming" : "ready";

  return (
    <div className="w-full">
      {suggestions.length > 0 && (
        <div className="mb-3 flex items-center gap-2 overflow-x-auto no-scrollbar stagger">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSend(s)}
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-subtle bg-surface-1/60 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-accent-primary/40 hover:bg-surface-2 hover:text-foreground"
            >
              <Sparkles className="h-3 w-3 text-accent-primary/70 transition-transform group-hover:scale-110" />
              {s}
            </button>
          ))}
        </div>
      )}

      <PromptInput
        onSubmit={handleSubmit}
        className={cn(
          "rounded-[24px] border border-border-subtle bg-panel/80 shadow-elevated backdrop-blur-xl transition-all",
          "focus-within:border-accent-primary/40",
        )}
      >
        <PromptInputBody>
          <PromptInputTextarea
            disabled={disabled && !streaming}
            aria-label="Message"
            aria-keyshortcuts="Enter"
            placeholder="Ask Builder to design, code, or explain…"
            className="max-h-[240px] min-h-[52px] bg-transparent px-4 pt-3 text-[15px] leading-relaxed placeholder:text-muted-foreground/70"
          />
        </PromptInputBody>

        <PromptInputFooter className="px-2 pb-2">
          <PromptInputTools>
            <div
              role="radiogroup"
              aria-label="Builder mode"
              className="flex items-center rounded-full border border-border-subtle bg-surface-1/70 p-0.5 text-[12px] font-medium"
            >
              {(
                [
                  { key: "Build", Icon: Hammer },
                  { key: "Plan", Icon: ListTodo },
                ] as const
              ).map(({ key, Icon }) => {
                const active = mode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    // Roving tabindex: one tab stop for the group, arrows switch modes.
                    tabIndex={active ? 0 : -1}
                    onKeyDown={(e) => {
                      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                      e.preventDefault();
                      const next = key === "Build" ? "Plan" : "Build";
                      haptic(5);
                      onModeChange(next);
                      const sibling =
                        e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
                          `[role="radio"]:not([aria-checked="true"])`,
                        );
                      sibling?.focus();
                    }}
                    onClick={() => {
                      haptic(5);
                      onModeChange(key);
                    }}
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
          </PromptInputTools>

          <div className="flex items-center gap-1">
            <PromptInputSubmit
              status={status}
              disabled={disabled && !streaming}
              className={cn(
                "ml-1 h-9 w-9 rounded-full",
                !streaming &&
                  "bg-linear-to-b from-foreground to-foreground/85 text-primary-foreground shadow-[0_0_20px_-4px_color-mix(in_oklab,white_50%,transparent)] hover:scale-[1.05]",
              )}
            />
          </div>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
