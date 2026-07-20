"use client";

import { useEffect, useState } from "react";
import { TOUR_DONE_STORAGE_KEY } from "@/lib/templates.seed";

const STEPS = [
  {
    title: "Composer",
    body: "Describe what to build. Switch Plan / Build, attach images, or pick a starter.",
  },
  {
    title: "Canvas",
    body: "Preview, edit code in Monaco, and share artifacts from the live canvas.",
  },
  {
    title: "Command palette",
    body: "Press ⌘/Ctrl+K for export, model switch, starters, and thread jump.",
  },
] as const;

export function Tour({ enabled }: { enabled: boolean }) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (localStorage.getItem(TOUR_DONE_STORAGE_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [enabled]);

  const finish = () => {
    try {
      localStorage.setItem(TOUR_DONE_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;
  const current = STEPS[step]!;

  return (
    <div
      className="fixed inset-0 z-80 flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal
      aria-label="Builder tour"
    >
      <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-panel p-5 shadow-elevated">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-2 text-lg font-semibold">{current.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{current.body}</p>
        <div className="mt-5 flex justify-between gap-2">
          <button
            type="button"
            className="min-h-11 rounded-md px-3 text-sm text-muted-foreground hover:bg-surface-2"
            onClick={finish}
          >
            Skip
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
              onClick={() => setStep((s) => s + 1)}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
              onClick={finish}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
