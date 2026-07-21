import { useEffect, useState } from "react";
import { Gauge, Smartphone, Zap, Download, Wifi, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAppPreferences } from "@/hooks/use-app-preferences";
import {
  bindInstallPromptCapture,
  getPwaRuntimeStatus,
  isStandaloneDisplay,
  promptInstallApp,
  warmPwaAssets,
  type PwaRuntimeStatus,
} from "@/lib/pwa-booster";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SpeedPwaSettings() {
  const { prefs, update } = useAppPreferences();
  const [status, setStatus] = useState<PwaRuntimeStatus>(() => getPwaRuntimeStatus());

  useEffect(() => {
    const unbind = bindInstallPromptCapture();
    const refresh = () => setStatus(getPwaRuntimeStatus());
    refresh();
    window.addEventListener("builder:pwa-installable", refresh);
    return () => {
      unbind();
      window.removeEventListener("builder:pwa-installable", refresh);
    };
  }, []);

  useEffect(() => {
    if (!prefs.pwaBooster) return;
    void warmPwaAssets();
  }, [prefs.pwaBooster]);

  const onInstall = async () => {
    if (status.ios && !status.installable) {
      toast.info("Add to Home Screen", {
        description:
          "Tap Share in Safari, then “Add to Home Screen”. Launch from the icon for a native full-screen app.",
        duration: 12_000,
      });
      return;
    }
    const outcome = await promptInstallApp();
    if (outcome === "accepted") toast.success("Builder installed");
    else if (outcome === "dismissed") toast.message("Install dismissed");
    else toast.error("Install not available in this browser yet");
    setStatus(getPwaRuntimeStatus());
  };

  return (
    <div className="space-y-6">
      <section>
        <SectionHeader
          icon={Gauge}
          title="Speed"
          description="Snappier UI and a locked shell that feels like a native iPhone app."
        />
        <div className="space-y-2">
          <ToggleRow
            id="pref-native-shell"
            title="Native shell lock"
            description="Freeze the page — no rubber-band bounce when you drag the composer."
            checked={prefs.nativeShellLock}
            onCheckedChange={(v) => update({ nativeShellLock: v })}
          />
          <ToggleRow
            id="pref-speed-mode"
            title="Speed mode"
            description="Skip decorative motion for instant panels and transitions."
            checked={prefs.speedMode}
            onCheckedChange={(v) => update({ speedMode: v })}
          />
          <ToggleRow
            id="pref-haptics"
            title="Haptic feedback"
            description="Light vibration on send, mode switch, and key taps (supported devices)."
            checked={prefs.hapticsEnabled}
            onCheckedChange={(v) => update({ hapticsEnabled: v })}
          />
        </div>
      </section>

      <section>
        <SectionHeader
          icon={Zap}
          title="PWA booster"
          description="Install Builder like a native app and warm offline assets on launch."
        />
        <div className="mb-3 flex flex-wrap gap-2">
          <StatusPill ok={status.standalone} label={status.standalone ? "Standalone" : "Browser tab"} />
          <StatusPill ok={status.serviceWorker} label="Service worker" />
          <StatusPill ok={prefs.pwaBooster} label="Asset warm-up" />
        </div>
        <div className="space-y-2">
          <ToggleRow
            id="pref-pwa-booster"
            title="PWA booster"
            description="Prefetch manifest, icons, and offline shell for faster cold starts."
            checked={prefs.pwaBooster}
            onCheckedChange={(v) => update({ pwaBooster: v })}
          />
          <div className="settings-row">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Download className="h-4 w-4 text-accent-primary" aria-hidden />
                Install app
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {status.standalone
                  ? "You are running from the home screen — full native chrome."
                  : status.ios
                    ? "Safari: Share → Add to Home Screen for standalone mode."
                    : status.installable
                      ? "Chrome/Edge: one-tap install to your dock or home screen."
                      : "Open in Chrome or Edge on desktop/Android for install prompt."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onInstall()}
              disabled={isStandaloneDisplay()}
              className={cn(
                "shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity",
                isStandaloneDisplay() && "opacity-50",
              )}
            >
              {status.standalone ? "Installed" : "Install"}
            </button>
          </div>
          {status.ios && !status.standalone && (
            <div className="flex items-start gap-3 rounded-xl border border-dashed border-border-subtle bg-surface-1/60 px-4 py-3 text-xs text-muted-foreground">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" aria-hidden />
              <p>
                On iPhone: open this page in <strong className="text-foreground">Safari</strong>, tap{" "}
                <strong className="text-foreground">Share</strong>, then{" "}
                <strong className="text-foreground">Add to Home Screen</strong>. The shell lock above
                keeps the UI from floating when the URL bar hides.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Gauge;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <h3 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function ToggleRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="settings-row cursor-pointer">
      <div className="min-w-0 pr-2">
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
        ok
          ? "border-accent-primary/30 bg-accent-primary/10 text-accent-primary"
          : "border-border-subtle bg-surface text-muted-foreground",
      )}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
      {label}
    </span>
  );
}
