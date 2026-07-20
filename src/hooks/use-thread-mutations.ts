import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createThread, deleteThread, renameThread } from "@/lib/threads.functions";
import { haptic } from "@/lib/haptics";

type Thread = { id: string; title: string; updated_at?: string; created_at?: string };

const THREADS_KEY = ["threads"] as const;

/** Create a thread and navigate to it; an optimistic row appears in the list instantly. */
export function useCreateThread(onNavigate?: () => void) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const create = useServerFn(createThread);

  return useMutation({
    mutationFn: () => create({ data: {} }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: THREADS_KEY });
      const previous = qc.getQueryData<Thread[]>(THREADS_KEY);
      const optimistic: Thread = {
        id: `optimistic-${Date.now()}`,
        title: "New chat",
        updated_at: new Date().toISOString(),
      };
      qc.setQueryData<Thread[]>(THREADS_KEY, (old) => [optimistic, ...(old ?? [])]);
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(THREADS_KEY, ctx.previous);
      toast.error((e as Error).message);
    },
    onSuccess: ({ id }) => {
      haptic();
      onNavigate?.();
      navigate({ to: "/chat/$threadId", params: { threadId: id } });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: THREADS_KEY }),
  });
}

export function useRenameThread() {
  const qc = useQueryClient();
  const rename = useServerFn(renameThread);

  return useMutation({
    mutationFn: (vars: { threadId: string; title: string }) => rename({ data: vars }),
    onMutate: async ({ threadId, title }) => {
      await qc.cancelQueries({ queryKey: THREADS_KEY });
      const previous = qc.getQueryData<Thread[]>(THREADS_KEY);
      qc.setQueryData<Thread[]>(THREADS_KEY, (old) =>
        old?.map((t) => (t.id === threadId ? { ...t, title } : t)),
      );
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(THREADS_KEY, ctx.previous);
      toast.error((e as Error).message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: THREADS_KEY }),
  });
}

/** Delete a thread; the row disappears immediately and comes back on failure. */
export function useDeleteThread(activeThreadId?: string) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const del = useServerFn(deleteThread);

  return useMutation({
    mutationFn: (vars: { threadId: string }) => del({ data: vars }),
    onMutate: async ({ threadId }) => {
      await qc.cancelQueries({ queryKey: THREADS_KEY });
      const previous = qc.getQueryData<Thread[]>(THREADS_KEY);
      qc.setQueryData<Thread[]>(THREADS_KEY, (old) => old?.filter((t) => t.id !== threadId));
      haptic([10, 30, 10]);
      if (activeThreadId === threadId) navigate({ to: "/chat" });
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(THREADS_KEY, ctx.previous);
      toast.error((e as Error).message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: THREADS_KEY }),
  });
}
