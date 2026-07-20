import { useEffect, useRef, useState } from "react";
import { GitBranch, Hammer, ListTodo, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { haptic } from "@/lib/haptics";

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

/** Parent bumps `id` to apply text into the composer without sending. */
export type ComposerFillRequest = {
  id: number;
  text: string;
  /** `quote` prepends markdown blockquotes; `replace` sets the draft. */
  mode?: "replace" | "quote";
};

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB

export function formatQuoteMarkdown(text: string): string {
  const clipped = text.trim().slice(0, 2000);
  if (!clipped) return "";
  return `${clipped
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n")}\n\n`;
}

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

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
}

export function Composer({
  onSend,
  disabled,
  streaming,
  mode,
  onModeChange,
  fillRequest,
}: {
  onSend: (payload: ComposerSendPayload) => void;
  disabled?: boolean;
  streaming?: boolean;
  mode: BuilderMode;
  onModeChange: (m: BuilderMode) => void;
  fillRequest?: ComposerFillRequest | null;
}) {
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [boot, setBoot] = useState({ key: 0, text: "" });
  const [dragging, setDragging] = useState(false);
  const draftRef = useRef("");
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    if (!fillRequest) return;
    const mode = fillRequest.mode ?? "replace";
    const next =
      mode === "quote"
        ? `${formatQuoteMarkdown(fillRequest.text)}${draftRef.current}`
        : fillRequest.text;
    draftRef.current = next;
    setBoot({ key: fillRequest.id, text: next });
  }, [fillRequest]);

  const addImageFiles = async (files: File[]) => {
    const images = files.filter(isImageFile);
    if (images.length === 0) {
      toast.error("Only image files can be attached");
      return;
    }

    const room = MAX_IMAGES - attachments.length;
    if (room <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images`);
      return;
    }

    const oversized = images.filter((f) => f.size > MAX_IMAGE_BYTES);
    if (oversized.length > 0) {
      toast.error(`Each image must be under ${MAX_IMAGE_BYTES / (1024 * 1024)} MB`);
    }

    const accepted = images.filter((f) => f.size <= MAX_IMAGE_BYTES).slice(0, room);
    if (accepted.length === 0) return;
    if (images.length > accepted.length && oversized.length === 0) {
      toast.message(`Only ${MAX_IMAGES} images allowed — extra files skipped`);
    }

    const next = await Promise.all(accepted.map(fileToAttachment));
    setAttachments((prev) => [...prev, ...next].slice(0, MAX_IMAGES));
  };

  const handleSubmit = (message: PromptInputMessage) => {
    const t = message.text?.trim();
    if ((!t && attachments.length === 0) || disabled) return;
    haptic(12);
    onSend({ text: t || "(image)", attachments: attachments.length ? attachments : undefined });
    setAttachments([]);
    draftRef.current = "";
    setBoot((b) => ({ key: b.key + 1, text: "" }));
  };

  const status: "ready" | "submitted" | "streaming" | "error" = streaming
    ? "streaming"
    : "ready";

  return (
    <div
      className="relative w-full pb-[env(safe-area-inset-bottom)]"
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth.current = 0;
        setDragging(false);
        void addImageFiles(Array.from(e.dataTransfer.files ?? []));
      }}
    >
      {dragging && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[24px] border-2 border-dashed border-accent-primary/60 bg-accent-primary/10 text-sm font-medium text-foreground"
          aria-hidden
        >
          Drop images (max {MAX_IMAGES})
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

      <PromptInputProvider key={boot.key} initialInput={boot.text}>
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
              placeholder="Ask Builder to design, code, or explain…"
              className="max-h-[240px] min-h-[52px] bg-transparent px-4 pt-3 text-[15px] leading-relaxed placeholder:text-muted-foreground/70"
              onChange={(e) => {
                draftRef.current = e.currentTarget.value;
              }}
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
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  await addImageFiles(files);
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
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="min-h-11 min-w-11 text-muted-foreground"
                        disabled
                        aria-label="Branch conversation (coming soon)"
                      >
                        <GitBranch className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
      </PromptInputProvider>
    </div>
  );
}
