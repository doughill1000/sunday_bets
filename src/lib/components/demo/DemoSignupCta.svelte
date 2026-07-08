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
</script>

<Button href="/auth" {variant} {size} class={className} data-testid="demo-signup-cta">
  {label}
  <ArrowRight class="size-4" />
</Button>
