import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteThreadMemory,
  getAgentSettings,
  listThreadMemory,
  saveAgentSettings,
  upsertThreadMemory,
} from "@/lib/threads.functions";
import {
  AVAILABLE_MODELS,
  BUILD_CODE_MODEL,
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  resolveKnownModelId,
} from "@/lib/models";
import { Chip } from "./Chip";
import { SpeedPwaSettings } from "./SpeedPwaSettings";
import { toast } from "sonner";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";

export function AgentSettingsPanel({ threadId }: { threadId?: string }) {
  const qc = useQueryClient();
  const get = useServerFn(getAgentSettings);
  const save = useServerFn(saveAgentSettings);
  const listMem = useServerFn(listThreadMemory);
  const upsertMem = useServerFn(upsertThreadMemory);
  const deleteMem = useServerFn(deleteThreadMemory);

  const { data, isLoading } = useQuery({
    queryKey: ["agent-settings"],
    queryFn: () => get(),
  });

  const { data: memory = [], refetch: refetchMem } = useQuery({
    queryKey: ["thread-memory", threadId],
    queryFn: () => listMem({ data: { threadId: threadId! } }),
    enabled: Boolean(threadId),
  });

  const [model, setModel] = useState(DEFAULT_MODEL);
  const [temperature, setTemperature] = useState(DEFAULT_TEMPERATURE);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [tools, setTools] = useState<Record<string, boolean>>({
    create_artifact: true,
    edit_file: true,
    read_artifact: true,
    remember: true,
    plan_steps: true,
    web_search: false,
    fetch_url: false,
    code_interpreter: false,
  });
  const [saving, setSaving] = useState(false);
  const [memKey, setMemKey] = useState("");
  const [memVal, setMemVal] = useState("");

  useEffect(() => {
    if (data) {
      setModel(resolveKnownModelId(data.default_model));
      setTemperature(Number(data.default_temperature));
      setSystemPrompt(data.default_system_prompt || DEFAULT_SYSTEM_PROMPT);
      setTools({
        create_artifact: true,
        edit_file: true,
        read_artifact: true,
        remember: true,
        plan_steps: true,
        web_search: false,
        fetch_url: false,
        code_interpreter: false,
        ...((data.tools as Record<string, boolean>) ?? {}),
      });
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
    <div className="space-y-8">
      <SpeedPwaSettings />

      <div className="h-px bg-border-subtle" aria-hidden />

      <section>
        <SectionTitle>Model</SectionTitle>
        <p className="mb-3 text-xs text-muted-foreground">
          Mistral only. Build mode auto-routes Large → {BUILD_CODE_MODEL} for code speed unless you
          pick another model explicitly.
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

      <section>
        <div className="mb-2 flex items-center justify-between">
          <SectionTitle>Temperature</SectionTitle>
          <span className="font-mono text-sm">{temperature.toFixed(2)}</span>
        </div>
        <input
          id="agent-temperature"
          name="temperature"
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          className="w-full accent-foreground"
          aria-label="Temperature"
        />
      </section>

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
          id="agent-system-prompt"
          name="system_prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-[13px] leading-relaxed outline-none focus:border-ring"
        />
      </section>

      <section>
        <SectionTitle>Tools &amp; capabilities</SectionTitle>
        <p className="mb-3 text-xs text-muted-foreground">
          Live tools write to the canvas / memory. Fence HTML fallback still works if tools are off.
        </p>
        <div className="space-y-2">
          {(
            [
              [
                "create_artifact",
                "Create artifact",
                "Tool: write multi-file artifacts to canvas",
                true,
              ],
              ["edit_file", "Edit file", "Tool: patch a file in an existing artifact", true],
              ["read_artifact", "Read artifact", "Tool: read canvas files before editing", true],
              ["remember", "Remember", "Tool: store project preferences in thread memory", true],
              ["plan_steps", "Plan steps", "Tool: structured plans in Plan mode", true],
              ["fetch_url", "Fetch URL", "Tool: load public page text (SSRF-guarded)", true],
              ["web_search", "Web search", "Tool: needs SEARCH_API_KEY (Tavily) on server", true],
              ["code_interpreter", "Code interpreter", "Coming soon", false],
            ] as const
          ).map(([id, title, description, wired]) => (
            <ToolRow
              key={id}
              id={id}
              title={title}
              description={description}
              checked={Boolean(tools[id])}
              wired={wired}
              onChange={(v) => setTools({ ...tools, [id]: v })}
            />
          ))}
        </div>
      </section>

      {threadId && (
        <section>
          <SectionTitle>Project memory</SectionTitle>
          <p className="mb-3 text-xs text-muted-foreground">
            Injected into the system prompt for this thread. Empty is fine.
          </p>
          {memory.length === 0 ? (
            <p className="mb-3 text-xs text-muted-foreground">
              No project memory yet. Ask the agent to remember something, or add a key below.
            </p>
          ) : (
            <ul className="mb-3 space-y-2">
              {memory.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-muted-foreground">{row.key}</div>
                    <div className="wrap-anywhere text-xs">
                      {typeof row.value === "string" ? row.value : JSON.stringify(row.value)}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete ${row.key}`}
                    className="min-h-11 min-w-11 rounded-md p-2 text-muted-foreground hover:bg-elevated hover:text-foreground"
                    onClick={async () => {
                      await deleteMem({ data: { threadId, key: row.key } });
                      await refetchMem();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="memory-key"
              name="memory_key"
              value={memKey}
              onChange={(e) => setMemKey(e.target.value)}
              placeholder="key"
              autoComplete="off"
              className="min-h-11 flex-1 rounded-md border border-border bg-surface px-3 text-sm"
            />
            <input
              id="memory-value"
              name="memory_value"
              value={memVal}
              onChange={(e) => setMemVal(e.target.value)}
              placeholder="value"
              autoComplete="off"
              className="min-h-11 flex-2 rounded-md border border-border bg-surface px-3 text-sm"
            />
            <button
              type="button"
              className="min-h-11 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
              onClick={async () => {
                if (!memKey.trim() || !memVal.trim()) return;
                await upsertMem({
                  data: { threadId, key: memKey.trim(), value: memVal.trim() },
                });
                setMemKey("");
                setMemVal("");
                await refetchMem();
                toast.success(`Remembered: ${memKey.trim()}`);
              }}
            >
              Add
            </button>
          </div>
        </section>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
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
    <label htmlFor={id} className="settings-row cursor-pointer">
      <div className="min-w-0 pr-2">
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
        className="h-5 w-5 shrink-0 accent-accent-primary"
      />
    </label>
  );
}
