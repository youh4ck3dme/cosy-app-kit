export {
  detectSemanticIntent,
  extractBrand,
  shouldSeedSkeleton,
} from "./detect";
export {
  formatSkeletonSystemAppendix,
  seedInstantProductSkeleton,
  type SeedSkeletonArgs,
} from "./seed";
export {
  renderProductSkeleton,
  REQUIRED_SKELETON_MARKERS,
  type SkeletonInput,
} from "./skeletons";
export {
  INTENT_SEED_MIN_SCORE,
  SEMANTIC_INTENTS,
  SKELETON_META_ATTR,
  SKELETON_SLOT_ATTR,
  type DetectedIntent,
  type SemanticIntent,
  type SkeletonSeedResult,
} from "./types";
