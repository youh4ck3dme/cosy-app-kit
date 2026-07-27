export class MistralKeyRotator {
  private keys: string[] = [];
  private currentIndex = 0;
  private coolDownKeys = new Map<string, number>(); // Keys that received 429 status

  constructor(customKeys?: string[]) {
    if (customKeys && customKeys.length > 0) {
      this.keys = customKeys.map((k) => k.trim()).filter(Boolean);
    } else {
      const rawKeys =
        (typeof process !== "undefined" &&
          (process.env.MISTRAL_API_KEYS || process.env.MISTRAL_API_KEY)) ||
        "";
      this.keys = rawKeys
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
    }

    if (this.keys.length === 0) {
      console.warn("[MistralRotator] WARNING: No Mistral API keys found!");
    } else {
      console.log(
        `[MistralRotator] Successfully loaded ${this.keys.length} Mistral API key(s) for Load Balancing.`,
      );
    }
  }

  public get keyCount(): number {
    return this.keys.length;
  }

  /**
   * Returns the next available API key (Round-Robin with 429 cooldown protection)
   */
  public getNextKey(): string {
    if (this.keys.length === 0) {
      throw new Error("Missing MISTRAL_API_KEYS or MISTRAL_API_KEY environment variables.");
    }

    const now = Date.now();
    let attempts = 0;

    while (attempts < this.keys.length) {
      const key = this.keys[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;

      const coolDownUntil = this.coolDownKeys.get(key);
      if (!coolDownUntil || now > coolDownUntil) {
        return key;
      }

      attempts++;
    }

    // Fallback: If all keys are in cooldown, return the least recently marked key
    const fallbackKey = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return fallbackKey;
  }

  /**
   * Marks a key as temporarily rate-limited (HTTP 429) for 60 seconds
   */
  public markRateLimited(key: string, cooldownMs: number = 60000): void {
    console.warn(
      `[MistralRotator] Key ending in '...${key.slice(-4)}' received 429 Rate Limit. Cooldown active for ${cooldownMs / 1000}s.`,
    );
    this.coolDownKeys.set(key, Date.now() + cooldownMs);
  }

  /**
   * Executes an asynchronous task with automatic key failover retry on HTTP 429
   */
  public async executeWithRetry<T>(
    operation: (apiKey: string) => Promise<T>,
    maxRetries: number = this.keys.length || 1,
  ): Promise<T> {
    let attempt = 0;
    let lastError: unknown = null;

    while (attempt < maxRetries) {
      const activeKey = this.getNextKey();
      try {
        return await operation(activeKey);
      } catch (error: any) {
        lastError = error;
        const isRateLimit =
          error?.status === 429 ||
          error?.statusCode === 429 ||
          error?.message?.includes("429") ||
          error?.message?.includes("Rate limit") ||
          error?.message?.includes("too many requests");

        if (isRateLimit) {
          this.markRateLimited(activeKey);
          attempt++;
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error("[MistralRotator] Exceeded all key retries.");
  }
}

export const mistralKeyRotator = new MistralKeyRotator();
