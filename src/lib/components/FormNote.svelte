<script lang="ts">
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Info from '@lucide/svelte/icons/info';

  /**
   * The one persistent inline status note (DESIGN.md principle 10, the "feedback
   * ladder"). Replaces the hand-rolled `{kind, text}` border-only divs scattered across
   * group/admin/auth: it announces to screen readers (`role="status"`, or `role="alert"`
   * for errors) and distinguishes kind by icon + semantic colour, not border colour
   * alone. Body text stays `text-foreground` so it clears AA on the warm-cream card even
   * where the semantic token (e.g. destructive) would not.
   */

  type Kind = 'success' | 'error' | 'warning' | 'info';

  let {
    kind = 'info',
    text,
    class: className = ''
  }: {
    kind?: Kind;
    text: string;
    class?: string;
  } = $props();

  const config = {
    success: { Icon: CircleCheck, tone: 'border-success text-success', label: 'Success' },
    error: { Icon: CircleAlert, tone: 'border-destructive text-destructive', label: 'Error' },
    warning: { Icon: TriangleAlert, tone: 'border-warning text-warning', label: 'Warning' },
    info: { Icon: Info, tone: 'border-border text-muted-foreground', label: 'Note' }
  } as const;

  const current = $derived(config[kind]);
  const Icon = $derived(current.Icon);
  // Errors interrupt (assertive); every other outcome is polite.
  const role = $derived(kind === 'error' ? 'alert' : 'status');
</script>

<div {role} class="flex items-start gap-2 rounded-xl border p-3 text-sm {current.tone} {className}">
  <Icon class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
  <span class="min-w-0 text-foreground">
    <span class="sr-only">{current.label}: </span>{text}
  </span>
</div>
