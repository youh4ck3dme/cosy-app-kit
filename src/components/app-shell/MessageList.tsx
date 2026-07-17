import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { Sparkles, Loader2 } from "lucide-react";

export function MessageList({
  messages,
  status,
}: {
  messages: UIMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
}) {
  return (
    <div className="flex flex-col gap-4 py-4">
      {messages.map((m) => (
        <MessageRow key={m.id} message={m} />
      ))}
      {status === "submitted" && (
        <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="font-mono text-xs tracking-wide">thinking…</span>
        </div>
      )}
    </div>
  );
}

function MessageRow({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = (message.parts ?? [])
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");

  // Strip fenced ```html blocks from the visible chat (they render in the canvas)
  const cleaned = text.replace(/```(html|markdown|md)\s*\n[\s\S]*?```/gi, (_m) => {
    return `\n\n> _📎 Artifact sent to canvas →_\n\n`;
  });

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface">
          <Sparkles className="h-3.5 w-3.5 text-foreground" />
        </div>
      )}
      <div
        className={cn(
          "min-w-0 max-w-[85%] text-[14.5px] leading-relaxed",
          isUser
            ? "rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground"
            : "text-foreground",
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{text}</div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-pre:bg-surface prose-pre:border prose-pre:border-border prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown>{cleaned}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
