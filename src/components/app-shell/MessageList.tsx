import { useEffect, useMemo, useState } from "react";
import type { UIMessage } from "ai";
import {
  Check,
  Circle,
  Copy,
  FileCode2,
  GitBranch,
  Loader2,
  Pencil,
  Quote,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolPart,
} from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";
import { STARTERS } from "@/lib/starters";
import { userFacingChatError } from "@/lib/agent/error-handling";
import { Logo } from "./Logo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatBuildProgress, partitionAssistantText } from "@/lib/message-artifacts";

const EMPTY_PROMPTS = STARTERS.slice(0, 3);

/** Static follow-ups under the last assistant message (fill composer, no auto-send). */
const FOLLOWUP_CHIPS = [
  {
    label: STARTERS[0]!.title,
    prompt: STARTERS[0]!.prompt,
  },
  {
    label: "Polish mobile layout",
    prompt:
      "Improve mobile responsiveness, spacing, and tap targets on the latest artifact without changing the overall concept.",
  },
  {
    label: "Add one interaction",
    prompt:
      "Add one polished interactive detail (hover state, toggle, or micro-animation) to the latest artifact—keep the existing structure.",
  },
] as const;

/** Friendly labels aligned with docs/agent-tools.md */
const TOOL_LABELS: Record<string, string> = {
  create_artifact: "Create artifact",
  edit_file: "Edit file",
  read_artifact: "Read artifact",
  remember: "Remember",
  plan_steps: "Plan steps",
  launch_site: "Launch multi-page site",
  fetch_url: "Fetch URL",
  web_search: "Web search",
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, " ");
}

function getNonToolErrorText(part: UIMessage["parts"][number]): string | null {
  if (typeof part !== "object" || part === null) return null;
  if (
    typeof part.type === "string" &&
    (part.type.startsWith("tool-") || part.type === "dynamic-tool")
  ) {
    return null;
  }
  if (!("errorText" in part)) return null;
  const errorText = (part as { errorText?: unknown }).errorText;
  return typeof errorText === "string" && errorText.trim() ? errorText : null;
}

function isToolPart(part: UIMessage["parts"][number]): part is ToolPart {
  return (
    typeof part === "object" &&
    part !== null &&
    typeof part.type === "string" &&
    (part.type.startsWith("tool-") || part.type === "dynamic-tool")
  );
}

function toolHasError(tp: ToolPart): boolean {
  if (tp.state === "output-error") return true;
  const errorText = (tp as { errorText?: unknown }).errorText;
  return typeof errorText === "string" && Boolean(errorText.trim());
}

function toolNameOf(tp: ToolPart): string {
  if (tp.type === "dynamic-tool" && "toolName" in tp && typeof tp.toolName === "string") {
    return tp.toolName;
  }
  if (typeof tp.type === "string" && tp.type.startsWith("tool-")) {
    return tp.type.slice("tool-".length);
  }
  return "";
}

function isSuccessfulCreateArtifact(tp: ToolPart): boolean {
  if (toolNameOf(tp) !== "create_artifact" || tp.state !== "output-available") return false;
  if (!("output" in tp) || tp.output == null || typeof tp.output !== "object") return false;
  return (tp.output as { ok?: unknown }).ok === true;
}

function toolKey(tp: ToolPart, index: number): string {
  if ("toolCallId" in tp && typeof tp.toolCallId === "string" && tp.toolCallId) {
    return tp.toolCallId;
  }
  return `tool-${index}-${tp.type}`;
}

function messageHasVisibleContent(message: UIMessage | undefined): boolean {
  if (!message?.parts?.length) return false;
  return message.parts.some((p) => {
    if (p.type === "text" && p.text.trim()) return true;
    if (isToolPart(p)) return true;
    if (p.type === "file") return true;
    return getNonToolErrorText(p) !== null;
  });
}

/** Soft “inner monologue” while waiting — not model tokens, honest UX scaffold. */
const THINK_PIPELINE: { title: string; thought: string }[] = [
  {
    title: "Reading your brief",
    thought: "What should this look like? Constraints, language, no-CDN, mobile-first…",
  },
  {
    title: "Sketching structure",
    thought: "Sidebar, header, KPIs, table, detail panel — what ships first?",
  },
  {
    title: "Choosing interactions",
    thought: "Filters, search, dark mode, toasts — what must actually work in JS?",
  },
  {
    title: "Preparing to write",
    thought: "One self-contained HTML file, semantic markup, accessible controls…",
  },
];

const WRITE_PIPELINE: { title: string; thought: string }[] = [
  {
    title: "Writing markup & styles",
    thought: "Building layout tokens, responsive rules, and components…",
  },
  {
    title: "Wiring behaviour",
    thought: "State, filters, panels, keyboard Esc, light/dark toggle…",
  },
  {
    title: "Filling realistic data",
    thought: "SK mock orders, technicians, SLA — no lorem ipsum…",
  },
  {
    title: "Polishing for preview",
    thought: "390px check, overflow, touch targets, then ship the artifact…",
  },
];

function toolThought(name: string): string {
  switch (name) {
    case "create_artifact":
      return "Saving a new canvas artifact from the generated HTML…";
    case "launch_site":
      return "Blueprint + parallel page workers → 4-page mini-site…";
    case "edit_file":
      return "Applying a surgical edit to an existing file…";
    case "read_artifact":
      return "Reading the current artifact so changes stay consistent…";
    case "remember":
      return "Storing a note in thread memory for later turns…";
    case "plan_steps":
      return "Structuring the plan into concrete steps…";
    case "fetch_url":
      return "Fetching a public URL for grounding…";
    case "web_search":
      return "Searching the web for references…";
    default:
      return `Running tool “${toolLabel(name)}”…`;
  }
}

function ThinkingWorkPanel({
  phase,
  toolParts,
}: {
  phase: "submitted" | "streaming";
  toolParts: ToolPart[];
}) {
  const pipeline = phase === "submitted" ? THINK_PIPELINE : WRITE_PIPELINE;
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % pipeline.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [phase, pipeline.length]);

  const active = pipeline[step] ?? pipeline[0]!;
  return (
    <div className="mt-1.5 flex min-w-0 max-w-md flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <Shimmer className="text-sm">{phase === "submitted" ? "Thinking…" : "Working…"}</Shimmer>
        <p className="text-[13px] leading-snug text-muted-foreground">
          <span className="font-medium text-foreground/90">{active.title}</span>
          <span className="text-muted-foreground/80"> — {active.thought}</span>
        </p>
      </div>

      <ol className="mt-1 space-y-1 border-l border-border-subtle pl-3" aria-label="Work progress">
        {pipeline.map((row, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li
              key={row.title}
              className={cn(
                "flex items-start gap-2 text-[11px] leading-snug",
                current
                  ? "text-foreground"
                  : done
                    ? "text-muted-foreground/80"
                    : "text-muted-foreground/45",
              )}
            >
              {current ? (
                <Loader2
                  className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-accent-primary"
                  aria-hidden
                />
              ) : done ? (
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent-primary/80" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-3 w-3 shrink-0 opacity-40" aria-hidden />
              )}
              <span>{row.title}</span>
            </li>
          );
        })}
      </ol>

      {toolParts.length > 0 && (
        <div className="mt-2 rounded-lg border border-border-subtle bg-surface-1/50 px-2.5 py-2">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Tools
          </div>
          <ul className="space-y-1.5">
            {toolParts.map((tp, i) => {
              const name = toolNameOf(tp);
              const running =
                tp.state === "input-streaming" ||
                tp.state === "input-available" ||
                tp.state === "approval-requested";
              const ok = tp.state === "output-available" || tp.state === "approval-responded";
              const err = tp.state === "output-error" || tp.state === "output-denied";
              return (
                <li key={toolKey(tp, i)} className="flex items-start gap-2 text-[11px]">
                  {running ? (
                    <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-accent-primary" />
                  ) : ok ? (
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                  ) : err ? (
                    <Circle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                  ) : (
                    <Circle className="mt-0.5 h-3 w-3 shrink-0 opacity-40" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-foreground/90">{toolLabel(name)}</div>
                    <div className="text-muted-foreground">{toolThought(name)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function MessageList({
  messages,
  status,
  onRegenerate,
  onRetryFrom,
  onEditUserMessage,
  onFocusCanvas,
  onPickPrompt,
  onQuote,
  onFillComposer,
  errorBanner,
}: {
  messages: UIMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
  onRegenerate?: () => void;
  onRetryFrom?: (messageId: string) => void;
  onEditUserMessage?: (messageId: string, text: string) => void;
  onFocusCanvas?: () => void;
  /** Empty-state starters — should fill composer, not auto-send. */
  onPickPrompt?: (prompt: string) => void;
  onQuote?: (text: string) => void;
  onFillComposer?: (text: string) => void;
  errorBanner?: string | null;
}) {
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const lastAssistantId = lastAssistant?.id;
  const isStreaming = status === "streaming";
  const isSubmitted = status === "submitted";
  const showWaitingRow = isSubmitted || (isStreaming && !messageHasVisibleContent(lastAssistant));

  const lastAssistantHasInlineError = Boolean(
    lastAssistant?.parts?.some(
      (p) => getNonToolErrorText(p) !== null || (isToolPart(p) && toolHasError(p)),
    ),
  );
  const showStatusError = status === "error" && !showWaitingRow && !lastAssistantHasInlineError;
  const showFollowups =
    status === "ready" && Boolean(lastAssistantId) && !showWaitingRow && Boolean(onFillComposer);

  if (messages.length === 0) {
    return <EmptyState onPick={onPickPrompt} />;
  }

  return (
    <div
      className="flex flex-col gap-6 py-4"
      role="log"
      aria-label="Chat messages"
      aria-relevant="additions"
      aria-busy={isSubmitted || isStreaming || undefined}
    >
      {errorBanner && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive animate-in-fade"
        >
          {userFacingChatError(errorBanner)}
        </div>
      )}
      {messages.map((m) => {
        if (
          m.role === "assistant" &&
          m.id === lastAssistantId &&
          showWaitingRow &&
          !messageHasVisibleContent(m)
        ) {
          return null;
        }
        if (m.role === "user" && !messageHasVisibleContent(m)) {
          return null;
        }
        const isLastAssistant = m.role === "assistant" && m.id === lastAssistantId;
        return (
          <MessageRow
            key={m.id}
            message={m}
            isStreaming={isStreaming && m.id === lastAssistantId}
            showActions={status === "ready" && (m.role === "user" || m.role === "assistant")}
            isLastAssistant={isLastAssistant}
            onRegenerate={
              m.role === "assistant"
                ? () => (isLastAssistant ? onRegenerate?.() : onRetryFrom?.(m.id))
                : undefined
            }
            onEditUser={
              m.role === "user" && onEditUserMessage
                ? (text) => onEditUserMessage(m.id, text)
                : undefined
            }
            onQuote={onQuote}
            onFocusCanvas={onFocusCanvas}
          />
        );
      })}
      {showFollowups && (
        <div className="ml-9 flex flex-wrap gap-2" role="group" aria-label="Suggested follow-ups">
          {FOLLOWUP_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => onFillComposer?.(chip.prompt)}
              className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-border-subtle bg-surface-1/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-accent-primary/40 hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Sparkles className="h-3 w-3 shrink-0 text-accent-primary/70" aria-hidden />
              <span className="truncate">{chip.label}</span>
            </button>
          ))}
        </div>
      )}
      {showWaitingRow && (
        <div className="flex items-start gap-3 animate-in-fade" role="status" aria-live="polite">
          <Logo size={26} decorative />
          <ThinkingWorkPanel
            phase={isSubmitted ? "submitted" : "streaming"}
            toolParts={(lastAssistant?.parts ?? []).filter(isToolPart)}
          />
        </div>
      )}
      {showStatusError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive animate-in-fade"
        >
          Something went wrong generating a response. You can retry the last message.
        </div>
      )}
    </div>
  );
}

function EmptyState({ onPick }: { onPick?: (prompt: string) => void }) {
  return (
    <section
      className="relative flex min-h-0 flex-col items-center justify-center overflow-hidden py-6 text-center animate-in-fade sm:py-10"
      aria-labelledby="chat-empty-heading"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-mesh-glow opacity-40" />
      <div className="relative stagger flex w-full max-w-md flex-col items-center">
        <Logo size={40} className="mb-5 shadow-elevated" />
        <div
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-1/60 px-3 py-1 font-mono text-[10px] tracking-widest text-muted-foreground"
          aria-hidden
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-primary" />
          READY
        </div>
        <h2
          id="chat-empty-heading"
          className="max-w-md text-2xl font-semibold tracking-tight text-foreground"
        >
          What are we building?
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Ask Builder to ship an HTML artifact, a markdown doc, or walk through an idea.
        </p>
        {onPick && (
          <ul className="mt-7 flex w-full list-none flex-col gap-2 p-0">
            {EMPTY_PROMPTS.map((starter) => (
              <li key={starter.id}>
                <button
                  type="button"
                  onClick={() => onPick(starter.prompt)}
                  className="group flex min-h-11 w-full items-start gap-2.5 rounded-xl border border-border-subtle bg-surface-1/50 px-3.5 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-accent-primary/35 hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Sparkles
                    aria-hidden
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-primary/70 transition-colors group-hover:text-accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground/90">{starter.title}</span>
                    <span className="mt-0.5 line-clamp-2 text-xs">{starter.prompt}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function MessageRow({
  message,
  isStreaming,
  showActions,
  isLastAssistant,
  onRegenerate,
  onEditUser,
  onQuote,
  onFocusCanvas,
}: {
  message: UIMessage;
  isStreaming?: boolean;
  showActions?: boolean;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
  onEditUser?: (text: string) => void;
  onQuote?: (text: string) => void;
  onFocusCanvas?: () => void;
}) {
  const isUser = message.role === "user";
  const parts = useMemo(() => message.parts ?? [], [message.parts]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const textConcat = useMemo(
    () => parts.map((p) => (p.type === "text" ? p.text : "")).join(""),
    [parts],
  );

  const toolParts = parts.filter(isToolPart);

  const nonToolErrors = useMemo(
    () =>
      parts
        .map((p) => getNonToolErrorText(p))
        .filter((errorText): errorText is string => errorText !== null),
    [parts],
  );

  const partitioned = useMemo(() => partitionAssistantText(textConcat), [textConcat]);
  const chunks = partitioned.chunks;
  const incompleteFence = partitioned.incomplete;
  const completeFenceCount = partitioned.completeFenceCount;

  if (isUser) {
    return (
      <Message from="user" className="min-w-0 animate-in-fade" aria-label="Your message">
        <MessageContent className="min-w-0 max-w-full">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[14.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
                  onClick={() => {
                    onEditUser?.(draft.trim());
                    setEditing(false);
                  }}
                >
                  Save &amp; regenerate
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-border px-3 text-xs"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="max-h-[min(70vh,36rem)] min-w-0 overflow-x-auto overflow-y-auto whitespace-pre-wrap wrap-anywhere text-[14.5px] leading-relaxed">
              {textConcat}
            </div>
          )}
        </MessageContent>
        {showActions && !editing && (
          <div className="mt-1.5 flex justify-end gap-1" role="group" aria-label="Message actions">
            {onQuote && textConcat.trim() && (
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Quote message"
                onClick={() => onQuote(textConcat)}
              >
                <Quote className="h-3 w-3" aria-hidden /> Quote
              </button>
            )}
            {onEditUser && (
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Edit message"
                onClick={() => {
                  setDraft(textConcat);
                  setEditing(true);
                }}
              >
                <Pencil className="h-3 w-3" aria-hidden /> Edit
              </button>
            )}
          </div>
        )}
      </Message>
    );
  }

  const hasProse = chunks.some((c) => c.trim().length > 0);
  const hasArtifactMarkers = completeFenceCount > 0 || chunks.length > 1;
  const hasBody =
    hasProse ||
    hasArtifactMarkers ||
    incompleteFence !== null ||
    toolParts.length > 0 ||
    nonToolErrors.length > 0;

  return (
    <div className="flex min-w-0 gap-3 animate-in-fade" aria-label="Assistant message">
      <Logo size={26} className="mt-0.5" decorative />
      <Message from="assistant" className="min-w-0 flex-1">
        <MessageContent className="min-w-0 gap-3">
          {!hasBody && !isStreaming && (
            <p className="text-[13px] italic text-muted-foreground">No response content.</p>
          )}
          {(hasProse || hasArtifactMarkers) &&
            chunks.map((chunk, i) => (
              <div key={i} className="contents">
                {chunk.trim() && (
                  <MessageResponse
                    className="min-w-0 overflow-x-auto text-[14.5px] leading-relaxed"
                    // Streamdown animate + rapid streaming causes removeChild DOM errors
                    // on rehype Text nodes. Keep off until streamdown fixes it.
                    isAnimating={false}
                  >
                    {chunk}
                  </MessageResponse>
                )}
                {i < chunks.length - 1 && <ArtifactPill onFocusCanvas={onFocusCanvas} />}
              </div>
            ))}
          {/* Complete fence with no surrounding prose still needs a visible chat anchor */}
          {completeFenceCount > 0 && !hasProse && chunks.length <= 1 && (
            <ArtifactPill onFocusCanvas={onFocusCanvas} />
          )}
          {incompleteFence && (
            <BuildingArtifactCard
              lang={incompleteFence.lang}
              chars={incompleteFence.chars}
              lines={incompleteFence.lines}
            />
          )}
          {isStreaming && hasProse && !incompleteFence && (
            <span
              className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-muted-foreground/80"
              role="status"
              aria-live="polite"
            >
              <span aria-hidden className="h-1 w-1 animate-pulse rounded-full bg-accent-primary" />
              Streaming
            </span>
          )}
          {toolParts.map((tp, i) => {
            const name = toolNameOf(tp);
            const label = toolLabel(name);
            return (
              <Tool
                key={toolKey(tp, i)}
                defaultOpen={toolHasError(tp) || isLastAssistant}
                className={cn(
                  isSuccessfulCreateArtifact(tp) &&
                    "ring-1 ring-accent-primary/50 border-accent-primary/40",
                )}
              >
                {tp.type === "dynamic-tool" ? (
                  <ToolHeader
                    type="dynamic-tool"
                    state={tp.state}
                    toolName={name || "tool"}
                    title={label}
                  />
                ) : (
                  <ToolHeader type={tp.type as `tool-${string}`} state={tp.state} title={label} />
                )}
                <ToolContent>
                  {"input" in tp && tp.input !== undefined && <ToolInput input={tp.input} />}
                  {(("output" in tp && tp.output !== undefined) ||
                    ("errorText" in tp && tp.errorText)) && (
                    <ToolOutput
                      output={"output" in tp ? tp.output : undefined}
                      errorText={"errorText" in tp ? tp.errorText : undefined}
                    />
                  )}
                </ToolContent>
              </Tool>
            );
          })}
          {nonToolErrors.map((errorText, i) => (
            <div
              key={`err-${i}-${errorText.slice(0, 24)}`}
              role="alert"
              className="wrap-anywhere rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive"
            >
              {userFacingChatError(errorText)}
            </div>
          ))}
        </MessageContent>
        {showActions && (
          <MessageActions
            text={textConcat}
            onRegenerate={onRegenerate}
            onQuote={onQuote}
            regenerateLabel={isLastAssistant ? "Retry" : "Retry from here"}
          />
        )}
      </Message>
    </div>
  );
}

function MessageActions({
  text,
  onRegenerate,
  onQuote,
  regenerateLabel = "Retry",
}: {
  text: string;
  onRegenerate?: () => void;
  onQuote?: (text: string) => void;
  regenerateLabel?: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const canCopy = Boolean(text.trim());

  const copy = async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  return (
    <div
      className="mt-1.5 ml-1 flex flex-wrap items-center gap-1"
      role="group"
      aria-label="Message actions"
    >
      <button
        type="button"
        onClick={copy}
        disabled={!canCopy}
        className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
        aria-label={copyState === "copied" ? "Copied to clipboard" : "Copy message"}
      >
        {copyState === "copied" ? (
          <Check className="h-3 w-3" aria-hidden />
        ) : (
          <Copy className="h-3 w-3" aria-hidden />
        )}
        {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
      </button>
      <span className="sr-only" aria-live="polite">
        {copyState === "copied"
          ? "Copied to clipboard"
          : copyState === "failed"
            ? "Copy failed"
            : ""}
      </span>
      {onQuote && canCopy && (
        <button
          type="button"
          onClick={() => onQuote(text)}
          className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Quote message"
        >
          <Quote className="h-3 w-3" aria-hidden /> Quote
        </button>
      )}
      {onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={regenerateLabel}
        >
          <RefreshCw className="h-3 w-3" aria-hidden /> {regenerateLabel}
        </button>
      )}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <button
                type="button"
                disabled
                className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground opacity-50"
                aria-label="Branch conversation (coming soon)"
              >
                <GitBranch className="h-3 w-3" aria-hidden /> Branch
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/** Progress card while an open ```html fence streams — never feed raw HTML to Streamdown. */
function BuildingArtifactCard({
  lang,
  chars,
  lines,
}: {
  lang: string;
  chars: number;
  lines: number;
}) {
  return (
    <div
      className="my-1 w-full max-w-md rounded-xl border border-accent-primary/30 bg-surface-1/70 px-3 py-3 shadow-sm"
      role="status"
      aria-live="polite"
      aria-label="Building artifact"
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-primary/15 text-accent-primary"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-sm font-medium text-foreground">Building {lang} artifact…</p>
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground">
              {formatBuildProgress(chars, lines)}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
            Streaming code without freezing the chat. When ready, tap the Artifact card or use Chat
            | Preview in the header.
          </p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-border-subtle" aria-hidden>
            <div
              className="h-full rounded-full bg-accent-primary/70 transition-[width] duration-300 ease-out"
              style={{
                // Soft indeterminate-ish progress from size (caps ~85% until complete)
                width: `${Math.min(85, 8 + Math.sqrt(Math.max(chars, 1)) * 1.1)}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ArtifactPill({ onFocusCanvas }: { onFocusCanvas?: () => void }) {
  const interactive = Boolean(onFocusCanvas);
  const className = cn(
    "my-1 inline-flex min-h-11 w-fit max-w-full items-center gap-2 rounded-lg border border-border-subtle bg-surface-1/60 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors",
    interactive &&
      "cursor-pointer hover:border-accent-primary/40 hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  );

  const content = (
    <>
      <span
        aria-hidden
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent-primary/15 text-accent-primary"
      >
        <FileCode2 className="h-3 w-3" />
      </span>
      <span className="min-w-0 wrap-break-word">Artifact ready on canvas</span>
      <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-accent-primary/70" />
      <span className="shrink-0 text-accent-primary/90">
        {interactive ? "Open preview" : "live"}
      </span>
    </>
  );

  if (!interactive) {
    return (
      <div className={className} role="note">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onFocusCanvas}
      className={className}
      aria-label="Open artifact on canvas"
    >
      {content}
    </button>
  );
}
