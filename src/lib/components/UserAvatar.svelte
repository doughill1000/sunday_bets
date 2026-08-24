<script lang="ts">
  import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
  import { getPreset, initialsColor } from '$lib/avatars';
  import { shortName } from '$lib/utils/user';
  import Crown from '@lucide/svelte/icons/crown';

  interface Props {
    avatarKey?: string | null;
    displayName: string;
    size?: 'xs' | 'sm' | 'md';
    /** Reigning champion: overlays a small Crown on the avatar (#279). */
    champion?: boolean;
  }

  let { avatarKey = null, displayName, size = 'sm', champion = false }: Props = $props();

  const sizeClass = { xs: 'size-5 text-[10px]', sm: 'size-7 text-xs', md: 'size-9 text-sm' };
  // Champion badge: Crown sits just off the top-right corner, sized/offset to scale
  // with the avatar.
  const crownWrapClass = {
    xs: '-top-1 -right-0.5',
    sm: '-top-1.5 -right-1',
    md: '-top-2 -right-1'
  };
  const crownIconClass = { xs: 'size-2.5', sm: 'size-3', md: 'size-3.5' };

  const preset = $derived(getPreset(avatarKey));
  const fallbackColor = $derived(initialsColor(displayName));
  const initials = $derived(shortName(displayName) || '?');
</script>

<!-- Wrapper carries `relative` so the Crown can sit outside the Avatar, which is
     `overflow-hidden` (a child crown would otherwise be clipped). -->
<div class="relative inline-flex">
  <Avatar class="{sizeClass[size]} ring-1 ring-foreground/15 ring-inset">
    {#if preset}
      <AvatarFallback style="background:{preset.bg}; color:#fff; font-size:inherit;">
        {preset.emoji}
      </AvatarFallback>
    {:else}
      <AvatarFallback style="background:{fallbackColor}; color:#fff; font-size:inherit;">
        {initials}
      </AvatarFallback>
    {/if}
  </Avatar>
  {#if champion}
    <span class="absolute {crownWrapClass[size]} flex items-center justify-center">
      <Crown
        class="{crownIconClass[
          size
        ]} rotate-12 fill-primary text-primary-ink drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.5)]"
        aria-label="Reigning champion"
      />
    </span>
  {/if}
</div>
