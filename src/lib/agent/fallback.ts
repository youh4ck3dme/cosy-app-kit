/**
 * P2 — model resilience helpers (server-side).
 *
 * Streaming can only be handed to the client once we know the provider actually
 * accepted the request, so we peek the first chunk of the UI message stream and
 * re-wrap it. If that read rejects (401/402/404/429/network), the caller can
 * transparently retry with the next model in the fallback chain.
 */

export async function withFirstChunk<T>(
  stream: ReadableStream<T>,
): Promise<ReadableStream<T>> {
  const reader = stream.getReader();
  let first: { value: T | undefined; done: boolean };
  try {
    first = await reader.read();
  } catch (err) {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
    throw err;
  }

  return new ReadableStream<T>({
    start(controller) {
      if (!first.done && first.value !== undefined) controller.enqueue(first.value);
      if (first.done) {
        controller.close();
        return;
      }
      void (async () => {
        try {
          for (;;) {
            const next = await reader.read();
            if (next.done) break;
            if (next.value !== undefined) controller.enqueue(next.value);
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      })();
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
