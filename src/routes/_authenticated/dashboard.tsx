import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { listUserArtifacts, setArtifactPublic } from "@/lib/threads.functions";
import { Header } from "@/components/app-shell/Header";
import { AppDialog } from "@/components/app-shell/AppDialog";
import { AgentSettingsPanel } from "@/components/app-shell/AgentSettingsPanel";
import {
  DashboardShell,
  type DashboardRailId,
} from "@/components/dashboard/DashboardShell";
import { OverviewHeader } from "@/components/dashboard/OverviewHeader";
import {
  VisibilityCard,
  type VisibilityMode,
} from "@/components/dashboard/VisibilityCard";
import { InviteCard } from "@/components/dashboard/InviteCard";
import { AgentsCard, SecretsCard } from "@/components/dashboard/SecretsCard";

const VIS_KEY = "builder:visibility";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listArts = useServerFn(listUserArtifacts);
  const share = useServerFn(setArtifactPublic);

  const [rail, setRail] = useState<DashboardRailId>("overview");
  const [showSettings, setShowSettings] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [mode, setMode] = useState<VisibilityMode>(() => {
    if (typeof window === "undefined") return "private";
    try {
      const v = localStorage.getItem(VIS_KEY);
      return v === "public" ? "public" : "private";
    } catch {
      return "private";
    }
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setCreatedAt(data.user?.created_at ?? null);
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VIS_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const { data: artifacts = [], isLoading } = useQuery({
    queryKey: ["user-artifacts"],
    queryFn: () => listArts({ data: { limit: 24 } }),
  });

  const publicArtifact = useMemo(
    () => artifacts.find((a) => a.is_public) ?? null,
    [artifacts],
  );

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = publicArtifact ? `${appUrl}/a/${publicArtifact.id}` : null;

  const createdLabel = createdAt
    ? `Joined ${formatDistanceToNow(new Date(createdAt), { addSuffix: true })}`
    : "Workspace overview";

  const onTogglePublic = async (id: string, next: boolean) => {
    setBusyId(id);
    try {
      await share({ data: { artifactId: id, isPublic: next } });
      await qc.invalidateQueries({ queryKey: ["user-artifacts"] });
      toast.success(next ? "Artifact is public" : "Artifact is private");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const copy = async (text: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(ok);
    } catch {
      toast.error("Copy failed");
    }
  };

  const onRail = (id: DashboardRailId) => {
    if (id === "chat") {
      navigate({ to: "/chat" });
      return;
    }
    if (id === "agents") {
      setShowSettings(true);
      setRail("agents");
      return;
    }
    if (id === "secrets") {
      setRail("secrets");
      const el = document.getElementById("dashboard-secrets");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setRail("overview");
  };

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <Header
        surface="dashboard"
        onOpenSettings={() => setShowSettings(true)}
      />

      <DashboardShell active={rail === "secrets" ? "secrets" : rail === "agents" ? "agents" : "overview"} onSelect={onRail}>
        <OverviewHeader email={email} createdLabel={createdLabel} />

        <div className="grid gap-4 md:grid-cols-2">
          <VisibilityCard
            mode={mode}
            onModeChange={setMode}
            artifacts={artifacts}
            onTogglePublic={onTogglePublic}
            busyId={busyId}
          />
          <InviteCard
            appUrl={appUrl || "https://…"}
            shareUrl={shareUrl}
            onCopyApp={() => copy(appUrl, "App link copied")}
            onCopyShare={() => {
              if (shareUrl) copy(shareUrl, "Share link copied");
            }}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <AgentsCard onOpenSettings={() => setShowSettings(true)} />
          <div id="dashboard-secrets">
            <SecretsCard />
          </div>
        </div>

        {isLoading && (
          <p className="mt-6 text-center text-sm text-muted-foreground">Loading artifacts…</p>
        )}
      </DashboardShell>

      <AppDialog open={showSettings} onClose={() => setShowSettings(false)} title="Agent settings">
        <AgentSettingsPanel />
      </AppDialog>
    </div>
  );
}
