<script lang="ts">
  // The read-only demo's single call to action (#460, ADR-0026). Every disabled action control
  // on the demo surfaces routes here — "Sign up to do this" — so the demo has exactly one verb:
  // convert. Links to the auth screen where a visitor starts their own league.
  import { Button } from '$lib/components/ui/button';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';

  let {
    label = 'Sign up to do this',
    variant = 'default',
    size = 'default',
    class: className = ''
  }: {
    label?: string;
    variant?: 'default' | 'secondary' | 'outline';
    size?: 'default' | 'sm' | 'lg';
    class?: string;
  } = $props();

  // Filled CTA carries the same brass-gold → ember spark as the app's Lock-in button, so the
  // demo's one verb (convert) glows with the brand accent. Always-on: this renders as an <a>
  // (no enabled: state) and a marketing CTA should always look live — including on mobile,
  // where the glow is a base shadow, not a hover effect.
  const emberClass = $derived(
    variant === 'default'
      ? 'bg-ember text-primary-foreground shadow-lg shadow-ember/30 transition-shadow hover:shadow-ember/50'
      : ''
  );
</script>

<Button
  href="/auth"
  {variant}
  {size}
  class={`${emberClass} ${className}`.trim()}
  data-testid="demo-signup-cta"
>
  {label}
  <ArrowRight class="size-4" />
</Button>
