import { describe, expect, it } from "vitest";
import { detectSemanticIntent, extractBrand, shouldSeedSkeleton } from "./detect";

describe("detectSemanticIntent", () => {
  it("detects booking / BookSlot-class prompts", () => {
    const d = detectSemanticIntent(
      "Build a booking app for a barbershop called Blade & Oak: service, date, time slot, staff confirm, cancel with ID+email",
    );
    expect(d.intent).toBe("booking");
    expect(shouldSeedSkeleton(d)).toBe(true);
    expect(d.brand).toMatch(/Blade/i);
  });

  it("detects waitlist over generic landing", () => {
    const d = detectSemanticIntent(
      'Create a premium waitlist landing for "Northline Signal" — email join, social proof, coming soon',
    );
    expect(d.intent).toBe("waitlist");
    expect(d.brand).toMatch(/Northline/i);
  });

  it("detects dashboard / ops", () => {
    const d = detectSemanticIntent(
      "Build a dark ops dashboard called Harbor Control with sidebar, KPI cards, revenue chart",
    );
    expect(d.intent).toBe("dashboard");
    expect(d.brand).toMatch(/Harbor/i);
  });

  it("detects crud / inventory", () => {
    const d = detectSemanticIntent(
      "Build a CRUD inventory app to list manage products with filters and empty state",
    );
    expect(d.intent).toBe("crud");
  });

  it("detects landing / SaaS marketing", () => {
    const d = detectSemanticIntent(
      "Build a distinctive SaaS landing page with hero, features, pricing teaser for Northline analytics",
    );
    expect(d.intent).toBe("landing");
  });

  it("returns unknown below threshold", () => {
    const d = detectSemanticIntent("hello");
    expect(d.intent).toBe("unknown");
    expect(shouldSeedSkeleton(d)).toBe(false);
  });

  it("extractBrand falls back per intent", () => {
    expect(extractBrand("make something nice", "booking")).toBeTruthy();
  });
});
