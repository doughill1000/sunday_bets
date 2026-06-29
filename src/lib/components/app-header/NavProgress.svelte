<script lang="ts">
  import { navigating } from '$app/state';
</script>

{#if navigating.to}
  <div class="nav-progress fixed top-0 left-0 z-[100] h-[3px] bg-primary" aria-hidden="true" />
{/if}

<style>
  .nav-progress {
    animation: nav-progress 2s ease-out forwards;
  }

  @keyframes nav-progress {
    0% {
      width: 0%;
    }
    25% {
      width: 60%;
    }
    60% {
      width: 80%;
    }
    100% {
      width: 88%;
    }
  }
</style>
