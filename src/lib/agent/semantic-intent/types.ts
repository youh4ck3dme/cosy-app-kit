/** Product intents for Instant Product Skeleton (MVP). */
export const SEMANTIC_INTENTS = ["booking", "landing", "dashboard", "crud", "waitlist"] as const;

export type SemanticIntent = (typeof SEMANTIC_INTENTS)[number];

export type DetectedIntent =
  | {
      intent: SemanticIntent;
      confidence: number;
      scores: Record<SemanticIntent, number>;
      brand: string;
      title: string;
      reasons: string[];
    }
  | {
      intent: "unknown";
      confidence: number;
      scores: Record<SemanticIntent, number>;
      brand: string;
      title: string;
      reasons: string[];
    };

export type SkeletonSeedResult = {
  artifactId: string;
  title: string;
  kind: "html";
  intent: SemanticIntent;
  confidence: number;
  brand: string;
};

/** Minimum score for auto-seed (keyword weight units). */
export const INTENT_SEED_MIN_SCORE = 2;

/** Marker embedded in skeletons so Build can find stable edit targets. */
export const SKELETON_META_ATTR = "data-nf-skeleton";
export const SKELETON_SLOT_ATTR = "data-nf-slot";
