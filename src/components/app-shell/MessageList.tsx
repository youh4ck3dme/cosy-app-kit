import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { Check, Copy, FileCode2 } from "lucide-react";
import { Logo } from "./Logo";

export function MessageList({
  messages,
  status,
}: {
  messages: UIMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
}) {
  return (
    <div className="flex flex-col gap-6 py-4">
      {messages.map((m, i) => (
        <MessageRow key={m.id} message={m} isLast={i === messages.length - 1} />
      ))}
      {status === "submitted" && (
        <div className="flex items-start gap-3 animate-in-fade">
          <Logo size={26} />
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="animate-shimmer font-medium">Thinking…</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageRow({ message, isLast }: { message: UIMessage; isLast: boolean }) {
  const isUser = message.role === "user";
  const text = (message.parts ?? [])
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");

  let artifactSent = false;
  const cleaned = text.replace(/```(html|markdown|md)\s*\n[\s\S]*?```/gi, () => {
    artifactSent = true;
    return "\n\n{{ARTIFACT_SENT}}\n\n";
  });

  return (
    <div className={cn("flex gap-3 animate-in-fade", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <Logo size={26} className="mt-0.5" />}
      <div className={cn("min-w-0", isUser ? "max-w-[85%]" : "flex-1")}>
        {isUser ? (
          <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[14.5px] leading-relaxed text-primary-foreground shadow-sm">
            <div className="whitespace-pre-wrap break-words">{text}</div>
          </div>
        ) : (
          <div className="text-[14.5px] leading-relaxed text-foreground">
            <div
              className={cn(
                "prose prose-invert prose-sm max-w-none",
                "prose-p:my-2 prose-p:leading-relaxed",
                "prose-headings:tracking-tight prose-headings:font-semibold",
                "prose-h1:text-lg prose-h2:text-base prose-h3:text-sm",
                "prose-a:text-accent-primary prose-a:no-underline hover:prose-a:underline",
                "prose-strong:text-foreground",
                "prose-code:before:content-none prose-code:after:content-none",
                "prose-code:rounded prose-code:bg-surface-2 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:font-mono prose-code:text-foreground",
                "prose-pre:!bg-surface-1 prose-pre:!border prose-pre:!border-border-subtle prose-pre:!rounded-xl prose-pre:!p-0",
                "prose-hr:border-border-subtle",
                "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
              )}
            >
              <ReactMarkdown
                components={{
                  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
                  p: ({ children }) => {
                    // Replace our artifact placeholder inside a paragraph
                    if (
                      Array.isArray(children) &&
                      children.some(
                        (c) => typeof c === "string" && c.includes("{{ARTIFACT_SENT}}"),
                      )
                    ) {
                      return <ArtifactPill />;
                    }
                    if (typeof children === "string" && children.includes("{{ARTIFACT_SENT}}")) {
                      return <ArtifactPill />;
                    }
                    return <p>{children}</p>;
                  },
                }}
              >
                {cleaned}
              </ReactMarkdown>
            </div>
            {isLast && artifactSent && null}
          </div>
        )}
      </div>
    </div>
  );
}

function ArtifactPill() {
  return (
    <div className="my-3 inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-1/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
      <span className="flex h-5 w-5 items-center justify-center rounded bg-accent-primary/15 text-accent-primary">
        <FileCode2 className="h-3 w-3" />
      </span>
      Artifact rendered on canvas
      <span className="h-1 w-1 rounded-full bg-accent-primary/70" />
      <span className="text-accent-primary/90">live</span>
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const raw = extractText(children);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };
  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-border-subtle bg-surface-1">
      <div className="flex items-center justify-between border-b border-border-subtle bg-surface-2/40 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          code
        </span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-muted-foreground opacity-0 transition-all hover:bg-surface-3 hover:text-foreground group-hover:opacity-100"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="!m-0 !border-0 !bg-transparent !p-4 overflow-x-auto text-[12.5px] leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    // @ts-expect-error runtime traversal
    return extractText(node.props?.children);
  }
  return "";
}
