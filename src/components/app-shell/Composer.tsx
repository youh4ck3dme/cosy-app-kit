import { useRef, useState } from "react";
import { Hammer, ListTodo, Paperclip, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";

export type BuilderMode = "Build" | "Plan";

export type ComposerAttachment = {
  id: string;
  name: string;
  mediaType: string;
  /** data: URL for multimodal models (Pixtral) */
  url: string;
};

export type ComposerSendPayload = {
  text: string;
  attachments?: ComposerAttachment[];
};

async function fileToAttachment(file: File): Promise<ComposerAttachment> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const b64 = btoa(binary);
  const mediaType = file.type || "image/png";
  return {
    id: `${file.name}-${file.size}-${Date.now()}`,
    name: file.name,
    mediaType,
    url: `data:${mediaType};base64,${b64}`,
  };
}

export function Composer({
  onSend,
  disabled,
  streaming,
  suggestions = [],
  mode,
  onModeChange,
  remountKey,
}: {
  onSend: (payload: ComposerSendPayload) => void;
  disabled?: boolean;
  streaming?: boolean;
  suggestions?: string[];
  mode: BuilderMode;
  onModeChange: (m: BuilderMode) => void;
  /** Change to remount the prompt input (e.g. after seeding an edit). */
  remountKey?: string | number;
}) {
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (message: PromptInputMessage) => {
    const t = message.text?.trim();
    if ((!t && attachments.length === 0) || disabled) return;
    onSend({ text: t || "(image)", attachments: attachments.length ? attachments : undefined });
    setAttachments([]);
  };

  const status: "ready" | "submitted" | "streaming" | "error" = streaming
    ? "streaming"
    : "ready";

  return (
    <div className="w-full pb-[env(safe-area-inset-bottom)]">
      {suggestions.length > 0 && (
        <div className="mb-3 flex items-center gap-2 overflow-x-auto no-scrollbar stagger">
          {suggestions.map((s) => (
            <button
              key={s.slice(0, 48)}
              type="button"
              onClick={() => onSend({ text: s })}
              className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border-subtle bg-surface-1/60 px-3 py-2 text-xs text-muted-foreground transition-all hover:border-accent-primary/40 hover:bg-surface-2 hover:text-foreground"
            >
              <Sparkles className="h-3 w-3 text-accent-primary/70 transition-transform group-hover:scale-110" />
              <span className="max-w-[220px] truncate">{s}</span>
            </button>
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="relative h-16 w-16 overflow-hidden rounded-lg border border-border-subtle"
            >
              <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white"
                onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <PromptInput
        key={remountKey ?? "composer"}
        onSubmit={handleSubmit}
        className={cn(
          "rounded-[24px] border border-border-subtle bg-panel/80 shadow-elevated backdrop-blur-xl transition-all",
          "focus-within:border-accent-primary/40",
        )}
      >
        <PromptInputBody>
          <PromptInputTextarea
            disabled={disabled && !streaming}
            placeholder="Ask Builder to design, code, or explain…"
            className="max-h-[240px] min-h-[52px] bg-transparent px-4 pt-3 text-[15px] leading-relaxed placeholder:text-muted-foreground/70"
          />
        </PromptInputBody>

        <PromptInputFooter className="px-2 pb-2">
          <PromptInputTools>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []).slice(0, 4);
                e.target.value = "";
                const next = await Promise.all(files.map(fileToAttachment));
                setAttachments((prev) => [...prev, ...next].slice(0, 4));
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="min-h-11 min-w-11 text-muted-foreground hover:text-foreground"
              title="Attach image (Pixtral)"
              aria-label="Attach image"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <div className="ml-1 flex items-center rounded-full border border-border-subtle bg-surface-1/70 p-0.5 text-[12px] font-medium">
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
                    onClick={() => onModeChange(key)}
                    className={cn(
                      "flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 transition-all",
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
                "ml-1 h-11 w-11 min-h-11 min-w-11 rounded-full",
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
