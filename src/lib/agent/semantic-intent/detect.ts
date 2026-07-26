import {
  INTENT_SEED_MIN_SCORE,
  SEMANTIC_INTENTS,
  type DetectedIntent,
  type SemanticIntent,
} from "./types";

type WeightedTerm = { re: RegExp; w: number; reason: string };

const INTENT_TERMS: Record<SemanticIntent, WeightedTerm[]> = {
  booking: [
    { re: /\bbook(ing|ings)?\b/i, w: 3, reason: "booking" },
    { re: /\bappointment(s)?\b/i, w: 3, reason: "appointment" },
    { re: /\breserv(e|ation|ations)\b/i, w: 3, reason: "reservation" },
    { re: /\btime\s*slot(s)?\b/i, w: 3, reason: "time slot" },
    { re: /\bslot(s)?\b/i, w: 2, reason: "slot" },
    { re: /\bschedule\b/i, w: 2, reason: "schedule" },
    { re: /\bbarber|salon|spa|clinic|dentist|tattoo\b/i, w: 2, reason: "service business" },
    { re: /\bstaff\b/i, w: 1, reason: "staff" },
    { re: /\bcancel.*(id|email)|id\+email\b/i, w: 2, reason: "cancel by id+email" },
    { re: /\bconfirm(ation)?\b/i, w: 1, reason: "confirm" },
    { re: /\bbookslot\b/i, w: 4, reason: "bookslot" },
  ],
  landing: [
    { re: /\blanding\b/i, w: 3, reason: "landing" },
    { re: /\bmarketing\s+page\b/i, w: 3, reason: "marketing page" },
    { re: /\bhero\b/i, w: 2, reason: "hero" },
    { re: /\bpricing\b/i, w: 2, reason: "pricing" },
    { re: /\bfeatures?\b/i, w: 1, reason: "features" },
    { re: /\bsaas\b/i, w: 2, reason: "saas" },
    { re: /\bportfolio\b/i, w: 2, reason: "portfolio" },
    { re: /\bhomepage\b|\bhome\s+page\b/i, w: 2, reason: "homepage" },
    { re: /\bcta\b/i, w: 1, reason: "cta" },
  ],
  dashboard: [
    { re: /\bdashboard\b/i, w: 4, reason: "dashboard" },
    { re: /\bops\b/i, w: 2, reason: "ops" },
    { re: /\bkpi(s)?\b/i, w: 3, reason: "kpi" },
    { re: /\banalytics\b/i, w: 2, reason: "analytics" },
    { re: /\bsidebar\b/i, w: 2, reason: "sidebar" },
    { re: /\brevenue\b/i, w: 1, reason: "revenue" },
    { re: /\bchart(s)?\b/i, w: 2, reason: "chart" },
    { re: /\badmin\s+panel\b/i, w: 2, reason: "admin panel" },
    { re: /\bcontrol\s+center\b/i, w: 2, reason: "control center" },
  ],
  crud: [
    { re: /\bcrud\b/i, w: 4, reason: "crud" },
    { re: /\binventory\b/i, w: 3, reason: "inventory" },
    { re: /\btable\b/i, w: 1, reason: "table" },
    { re: /\b(list|manage)\s+(items?|records?|entries|products?|users?)\b/i, w: 3, reason: "list/manage records" },
    { re: /\bcreate.?read.?update.?delete\b/i, w: 4, reason: "create-read-update-delete" },
    { re: /\bkanban\b/i, w: 2, reason: "kanban" },
    { re: /\btodo\b|\btasks?\b/i, w: 2, reason: "todo/tasks" },
    { re: /\bfilter(s|ing)?\b/i, w: 1, reason: "filter" },
    { re: /\bempty\s+state\b/i, w: 1, reason: "empty state" },
  ],
  waitlist: [
    { re: /\bwaitlist\b/i, w: 4, reason: "waitlist" },
    { re: /\bcoming\s+soon\b/i, w: 3, reason: "coming soon" },
    { re: /\bearly\s+access\b/i, w: 3, reason: "early access" },
    { re: /\bjoin\s+the\s+(list|waitlist)\b/i, w: 3, reason: "join list" },
    { re: /\bemail\s+capture\b/i, w: 3, reason: "email capture" },
    { re: /\bnotify\s+me\b/i, w: 2, reason: "notify me" },
    { re: /\blaunch\s+list\b/i, w: 2, reason: "launch list" },
    { re: /\bsocial\s+proof\b/i, w: 1, reason: "social proof" },
  ],
};

const DEFAULT_BRAND: Record<SemanticIntent, string> = {
  booking: "Blade & Oak",
  landing: "Northline",
  dashboard: "Harbor Control",
  crud: "Ledger Desk",
  waitlist: "Northline Signal",
};

const DEFAULT_TITLE: Record<SemanticIntent, string> = {
  booking: "Booking — product skeleton",
  landing: "Landing — product skeleton",
  dashboard: "Dashboard — product skeleton",
  crud: "CRUD — product skeleton",
  waitlist: "Waitlist — product skeleton",
};

function emptyScores(): Record<SemanticIntent, number> {
  return { booking: 0, landing: 0, dashboard: 0, crud: 0, waitlist: 0 };
}

/**
 * Extract a short product brand from free text (best-effort, no LLM).
 */
export function extractBrand(prompt: string, intent: SemanticIntent | "unknown"): string {
  const text = prompt.trim();
  // Allow "Blade & Oak", "Northline Signal", quoted names.
  const nameChunk = String.raw`[A-Z][\w'.]*(?:\s+(?:&|and)\s+[A-Z][\w'.]*|\s+[A-Z\d][\w'.]*){0,3}`;
  const patterns: RegExp[] = [
    new RegExp(String.raw`\b(?:called|named)\s+[“"']?(${nameChunk})[”"']?`, "u"),
    new RegExp(
      String.raw`\bfor\s+(?:a\s+)?(?:barbershop|salon|spa|clinic|saas|product|app|startup)?\s*[“"']?(${nameChunk})[”"']?`,
      "u",
    ),
    new RegExp(String.raw`\b(?:brand|product|app)\s*[:=]\s*[“"']?(${nameChunk})[”"']?`, "u"),
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const brand = m[1].replace(/[.,;:!?]+$/, "").trim().slice(0, 48);
      if (brand.length >= 2) return brand;
    }
  }
  if (intent === "unknown") return "Forge App";
  return DEFAULT_BRAND[intent];
}

/**
 * Deterministic semantic intent from first user prompt.
 * Fast keyword scoring — suitable for pre-stream skeleton seed.
 */
export function detectSemanticIntent(prompt: string): DetectedIntent {
  const text = (prompt ?? "").trim();
  const scores = emptyScores();
  const reasons: string[] = [];

  if (!text) {
    return {
      intent: "unknown",
      confidence: 0,
      scores,
      brand: "Forge App",
      title: "Product skeleton",
      reasons: ["empty prompt"],
    };
  }

  for (const intent of SEMANTIC_INTENTS) {
    for (const term of INTENT_TERMS[intent]) {
      if (term.re.test(text)) {
        scores[intent] += term.w;
        reasons.push(`${intent}:${term.reason}+${term.w}`);
      }
    }
  }

  // Soft disambiguation: waitlist beats generic landing when both fire.
  if (scores.waitlist >= 3 && scores.landing > 0) {
    scores.landing = Math.max(0, scores.landing - 2);
    reasons.push("disambiguate:waitlist>landing");
  }
  // Booking with schedule/slot should not lose to dashboard chart alone.
  if (scores.booking >= 3 && scores.dashboard > 0 && !/\bdashboard\b/i.test(text)) {
    scores.dashboard = Math.max(0, scores.dashboard - 1);
  }

  let best: SemanticIntent = "landing";
  let bestScore = -1;
  let second = 0;
  for (const intent of SEMANTIC_INTENTS) {
    const s = scores[intent];
    if (s > bestScore) {
      second = bestScore;
      bestScore = s;
      best = intent;
    } else if (s > second) {
      second = s;
    }
  }

  if (bestScore < INTENT_SEED_MIN_SCORE) {
    return {
      intent: "unknown",
      confidence: bestScore / 10,
      scores,
      brand: extractBrand(text, "unknown"),
      title: "Product skeleton",
      reasons: reasons.length ? reasons : ["below threshold"],
    };
  }

  const margin = bestScore - Math.max(0, second);
  const confidence = Math.min(0.99, 0.35 + bestScore * 0.08 + margin * 0.05);
  const brand = extractBrand(text, best);
  const title = `${brand} — ${best} skeleton`;

  return {
    intent: best,
    confidence,
    scores,
    brand,
    title: title.slice(0, 120) || DEFAULT_TITLE[best],
    reasons,
  };
}

/** Whether chat should auto-seed a skeleton for this detection. */
export function shouldSeedSkeleton(detected: DetectedIntent): detected is DetectedIntent & {
  intent: SemanticIntent;
} {
  return detected.intent !== "unknown" && detected.scores[detected.intent] >= INTENT_SEED_MIN_SCORE;
}
