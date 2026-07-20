import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Keyboard, MessageSquare, Plus, Settings, Sparkles } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { listThreads } from "@/lib/threads.functions";
import { STARTER_TEMPLATES } from "@/lib/templates";
import { useCreateThread } from "@/hooks/use-thread-mutations";

type Thread = { id: string; title: string };

export function CommandPalette({
  open,
  onOpenChange,
  onToggleView,
  onOpenSettings,
  onShowShortcuts,
  onPickTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleView?: () => void;
  onOpenSettings?: () => void;
  onShowShortcuts?: () => void;
  onPickTemplate?: (prompt: string) => void;
}) {
  const navigate = useNavigate();
  const list = useServerFn(listThreads);
  const createMutation = useCreateThread();
  const { data } = useQuery({ queryKey: ["threads"], queryFn: () => list(), enabled: open });
  const threads = (data ?? []) as Thread[];

  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search chats, run actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => createMutation.mutate())}>
            <Plus /> New chat
            <CommandShortcut>⌘⇧O</CommandShortcut>
          </CommandItem>
          {onToggleView && (
            <CommandItem onSelect={() => run(onToggleView)}>
              <Eye /> Toggle chat / preview
              <CommandShortcut>⌘.</CommandShortcut>
            </CommandItem>
          )}
          {onOpenSettings && (
            <CommandItem onSelect={() => run(onOpenSettings)}>
              <Settings /> Agent settings
            </CommandItem>
          )}
          {onShowShortcuts && (
            <CommandItem onSelect={() => run(onShowShortcuts)}>
              <Keyboard /> Keyboard shortcuts
              <CommandShortcut>?</CommandShortcut>
            </CommandItem>
          )}
        </CommandGroup>
        {onPickTemplate && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Start from a template">
              {STARTER_TEMPLATES.map((t) => (
                <CommandItem key={t.id} onSelect={() => run(() => onPickTemplate(t.prompt))}>
                  <Sparkles /> {t.title}
                  <span className="ml-auto text-xs text-muted-foreground">{t.description}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {threads.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Chats">
              {threads.slice(0, 30).map((t) => (
                <CommandItem
                  key={t.id}
                  value={`${t.title} ${t.id}`}
                  onSelect={() =>
                    run(() => navigate({ to: "/chat/$threadId", params: { threadId: t.id } }))
                  }
                >
                  <MessageSquare /> {t.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
