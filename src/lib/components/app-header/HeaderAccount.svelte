<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import { userNameShort } from '$lib/utils/user';

  import { Button } from '$lib/components/ui/button';
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
  } from '$lib/components/ui/dropdown-menu';
  import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';

  export let user: User | null = null;
  export let canSeeAdmin = false;
  export let onNavigate: () => void = () => {};
</script>

<div class="-ml-2 flex shrink-0 items-center">
  {#if user}
    <DropdownMenu>
      <DropdownMenuContent align="start" class="w-56">
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {#if canSeeAdmin}
          <DropdownMenuItem>
            <a href="/admin" on:click={onNavigate}>Admin</a>
          </DropdownMenuItem>
        {/if}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <a href="/auth/signout" on:click={onNavigate}>Sign out</a>
        </DropdownMenuItem>
      </DropdownMenuContent>
      <DropdownMenuTrigger>
        <Button variant="ghost" class="gap-2">
          <Avatar class="h-6 w-6">
            <AvatarImage src={user?.user_metadata?.avatar_url} alt="avatar" />
            <AvatarFallback>{userNameShort(user)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
    </DropdownMenu>
  {:else}
    <Button variant="default">
      <a href="/auth">Sign in</a>
    </Button>
  {/if}
</div>
