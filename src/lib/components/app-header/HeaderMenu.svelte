<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Sheet, SheetContent, SheetTrigger } from '$lib/components/ui/sheet';
  import { Separator } from '$lib/components/ui/separator';
  import Menu from '@lucide/svelte/icons/menu';

  interface Props {
    canSeeAdmin?: boolean;
    canInstall?: boolean;
    installPwa: (e: MouseEvent) => void;
    open?: boolean;
    onNavigate?: () => void;
  }

  let {
    canSeeAdmin = false,
    canInstall = false,
    installPwa,
    open = $bindable(false),
    onNavigate = () => {}
  }: Props = $props();
</script>

<div class="-mr-2 ml-auto flex shrink-0 items-center gap-2">
  <Sheet bind:open>
    <SheetTrigger>
      <Button size="icon" variant="ghost" aria-label="Open menu" class="rounded-xl">
        <Menu class="size-5" />
      </Button>
    </SheetTrigger>
    <SheetContent side="right" class="w-72 pr-4">
      <div class="mt-2 mb-4 font-semibold tracking-wide">SUNDAY BETS</div>

      <nav class="mt-1 grid gap-0 text-sm rounded-md overflow-hidden">
        <a
          class="flex items-center px-3 py-3 min-h-11 hover:bg-accent border-b border-white/15 last:border-b-0"
          href="/picks"
          onclick={onNavigate}>My Picks</a
        >
        <a
          class="flex items-center px-3 py-3 min-h-11 hover:bg-accent border-b border-white/15 last:border-b-0"
          href="/leaderboard"
          onclick={onNavigate}>Leaderboard</a
        >
        {#if canSeeAdmin}
          <a
            class="flex items-center px-3 py-3 min-h-11 hover:bg-accent border-b border-white/15 last:border-b-0"
            href="/admin"
            onclick={onNavigate}>Admin</a
          >
        {/if}
      </nav>

      <Separator class="my-3" />

      {#if canInstall}
        <Button class="w-full" onclick={installPwa}>Install App</Button>
      {/if}

      <nav class="mt-3 grid gap-0 text-sm rounded-md overflow-hidden">
        <a
          class="flex items-center px-3 py-3 min-h-11 hover:bg-accent border-b border-white/15 last:border-b-0"
          href="/auth/signout"
          onclick={onNavigate}>Sign out</a
        >
      </nav>
    </SheetContent>
  </Sheet>
</div>
