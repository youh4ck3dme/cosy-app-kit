export type ThreadListItem = {
  id: string;
  title: string;
  updated_at?: string;
  created_at?: string;
};

/** Bucket threads into Today / Yesterday / Previous 7 days / Older by last activity. */
export function groupThreads(threads: ThreadListItem[], now = Date.now()) {
  const DAY = 24 * 60 * 60 * 1000;
  const groups: { label: string; items: ThreadListItem[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];
  for (const t of threads) {
    const ts = new Date(t.updated_at ?? t.created_at ?? now).getTime();
    const diff = now - ts;
    if (diff < DAY) groups[0].items.push(t);
    else if (diff < 2 * DAY) groups[1].items.push(t);
    else if (diff < 8 * DAY) groups[2].items.push(t);
    else groups[3].items.push(t);
  }
  return groups.filter((g) => g.items.length > 0);
}
