<script lang="ts">
  import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
  import { getPreset, initialsColor } from '$lib/avatars';
  import { shortName } from '$lib/utils/user';

  interface Props {
    avatarKey?: string | null;
    displayName: string;
    size?: 'xs' | 'sm' | 'md';
  }

  let { avatarKey = null, displayName, size = 'sm' }: Props = $props();

  const sizeClass = { xs: 'size-5 text-[10px]', sm: 'size-7 text-xs', md: 'size-9 text-sm' };

  const preset = $derived(getPreset(avatarKey));
  const fallbackColor = $derived(initialsColor(displayName));
  const initials = $derived(shortName(displayName) || '?');
</script>

<Avatar class={sizeClass[size]}>
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
