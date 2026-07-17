import { useMemo, useState } from "react";
import type { UIMessage } from "ai";
import { Check, Copy, FileCode2, RefreshCw } from "lucide-react";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput, type ToolPart } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const ARTIFACT_RE = /```(?:html|markdown|md)(?:\s+[^\n`]*)?\s*\n[\s\S]*?```/gi;
const MULTI_FILE_RE = /```[^\n`]*\bpath=[^\n`]*\n[\s\S]*?```/gi;
const SPLIT_MARK = "\u0000ARTIFACT\u0000";

export function MessageList({
  messages,
  status,
  onRegenerate,
}: {
  messages: UIMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
  onRegenerate?: () => void;
}) {
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  return (
    <div className="flex flex-col gap-6 py-4">
      {messages.map((m) => (
        <MessageRow
          key={m.id}
          message={m}
          showActions={m.id === lastAssistantId && status === "ready"}
          onRegenerate={onRegenerate}
        />
      ))}
      {status === "submitted" && (
        <div className="flex items-start gap-3 animate-in-fade">
          <Logo size={26} />
          <div className="mt-1 flex items-center gap-2 text-sm">
            <Shimmer>Thinking…</Shimmer>
          </div>
        </div>
      )}
    </div>
  );
}


function MessageRow({
  message,
  showActions,
  onRegenerate,
}: {
  message: UIMessage;
  showActions?: boolean;
  onRegenerate?: () => void;
}) {
  const isUser = message.role === "user";
  const parts = message.parts ?? [];

  const textConcat = useMemo(
    () => parts.map((p) => (p.type === "text" ? p.text : "")).join(""),
    [parts],
  );

  const toolParts = parts.filter(
    (p): p is ToolPart =>
      typeof p.type === "string" && (p.type.startsWith("tool-") || p.type === "dynamic-tool"),
  );

  // Split text around artifact code blocks so we can insert the pill.
  const chunks = useMemo(() => {
    const marked = textConcat.replace(MULTI_FILE_RE, SPLIT_MARK).replace(ARTIFACT_RE, SPLIT_MARK);
    return marked.split(SPLIT_MARK);
  }, [textConcat]);


  if (isUser) {
    return (
      <Message from="user" className="animate-in-fade">
        <MessageContent>
          <div className="whitespace-pre-wrap break-words text-[14.5px] leading-relaxed">
            {textConcat}
          </div>
        </MessageContent>
      </Message>
    );
  }

  return (
    <div className="flex gap-3 animate-in-fade">
      <Logo size={26} className="mt-0.5" />
      <Message from="assistant" className="flex-1">
        <MessageContent className="gap-3">
          {chunks.map((chunk, i) => (
            <div key={i} className="contents">
              {chunk && (
                <MessageResponse className="text-[14.5px] leading-relaxed">
                  {chunk}
                </MessageResponse>
              )}
              {i < chunks.length - 1 && <ArtifactPill />}
            </div>
          ))}
          {toolParts.map((tp, i) => (
            <Tool key={`tool-${i}`} defaultOpen={false}>
              {tp.type === "dynamic-tool" ? (
                <ToolHeader
                  type="dynamic-tool"
                  state={tp.state}
                  toolName={"toolName" in tp && typeof tp.toolName === "string" ? tp.toolName : "tool"}
                />
              ) : (
                <ToolHeader type={tp.type as `tool-${string}`} state={tp.state} />
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
          ))}
        </MessageContent>
      </Message>
    </div>
  );
}

function ArtifactPill() {
  return (
    <div className="my-1 inline-flex w-fit items-center gap-2 rounded-lg border border-border-subtle bg-surface-1/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
      <span className="flex h-5 w-5 items-center justify-center rounded bg-accent-primary/15 text-accent-primary">
        <FileCode2 className="h-3 w-3" />
      </span>
      Artifact rendered on canvas
      <span className="h-1 w-1 rounded-full bg-accent-primary/70" />
      <span className="text-accent-primary/90">live</span>
    </div>
  );
}
