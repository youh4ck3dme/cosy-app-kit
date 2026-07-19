import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAgentSettings, saveAgentSettings } from "@/lib/threads.functions";
import {
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  resolveKnownModelId,
} from "@/lib/models";
import { Chip } from "./Chip";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";

export function AgentSettingsPanel() {
  const qc = useQueryClient();
  const get = useServerFn(getAgentSettings);
  const save = useServerFn(saveAgentSettings);

  const { data, isLoading } = useQuery({
    queryKey: ["agent-settings"],
    queryFn: () => get(),
  });

  const [model, setModel] = useState(DEFAULT_MODEL);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [tools, setTools] = useState<Record<string, boolean>>({
    create_artifact: true,
    web_search: false,
    code_interpreter: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      // Never show/keep GPT/Gemini ids — catalog is Mistral-only.
      setModel(resolveKnownModelId(data.default_model));
      setTemperature(Number(data.default_temperature));
      setSystemPrompt(data.default_system_prompt || DEFAULT_SYSTEM_PROMPT);
      setTools((data.tools as Record<string, boolean>) ?? {});
    }
  }, [data]);

  const onSave = async () => {
    setSaving(true);
    try {
      await save({
        data: {
          default_model: resolveKnownModelId(model),
          default_temperature: temperature,
          default_system_prompt: systemPrompt,
          tools,
        },
      });
      await qc.invalidateQueries({ queryKey: ["agent-settings"] });
      toast.success("Agent settings saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Model */}
      <section>
        <SectionTitle>Model</SectionTitle>
        <p className="mb-3 text-xs text-muted-foreground">
          Mistral only — no OpenAI / ChatGPT / Gemini. Default for new chats; change per-thread in
          the header. Click a selected chip to reset to default.
        </p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_MODELS.map((m) => {
            const selected = model === m.id;
            return (
              <Chip
                key={m.id}
                active={selected}
                onClick={() => setModel(selected ? DEFAULT_MODEL : m.id)}
              >
                {m.label}
                {m.note && (
                  <span className={selected ? "opacity-70" : "text-muted-foreground/70"}>
                    · {m.note}
                  </span>
                )}
              </Chip>
            );
          })}
        </div>
      </section>

      {/* Temperature */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <SectionTitle>Temperature</SectionTitle>
          <span className="font-mono text-sm">{temperature.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          className="w-full accent-foreground"
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>Deterministic</span>
          <span>Creative</span>
        </div>
      </section>

      {/* System prompt */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <SectionTitle>System prompt</SectionTitle>
          <button
            onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-[13px] leading-relaxed outline-none focus:border-ring"
        />
      </section>

      {/* Tools */}
      <section>
        <SectionTitle>Tools &amp; capabilities</SectionTitle>
        <p className="mb-3 text-xs text-muted-foreground">
          Turn agent capabilities on or off. Only wired capabilities take effect today.
        </p>
        <div className="space-y-2">
          <ToolRow
            id="create_artifact"
            title="Create artifact"
            description="Extract HTML / markdown blocks from responses and render them on the canvas."
            checked={tools.create_artifact}
            wired
            onChange={(v) => setTools({ ...tools, create_artifact: v })}
          />
          <ToolRow
            id="web_search"
            title="Web search"
            description="Let the agent fetch pages. (Coming soon.)"
            checked={tools.web_search}
            onChange={(v) => setTools({ ...tools, web_search: v })}
          />
          <ToolRow
            id="code_interpreter"
            title="Code interpreter"
            description="Sandboxed code execution. (Coming soon.)"
            checked={tools.code_interpreter}
            onChange={(v) => setTools({ ...tools, code_interpreter: v })}
          />
        </div>
      </section>

      <div className="flex justify-end pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  );
}

function ToolRow({
  id,
  title,
  description,
  checked,
  wired,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  wired?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border bg-surface px-3 py-3 hover:bg-elevated"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          {title}
          {wired && (
            <span className="rounded-full border border-border bg-elevated px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Live
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-foreground"
      />
    </label>
  );
}
