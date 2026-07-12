<script lang="ts">
  let {
    options,
    value,
    ariaLabel,
    idPrefix,
    onchange
  }: {
    options: ReadonlyArray<{ value: string; label: string }>;
    value: string;
    ariaLabel: string;
    idPrefix: string;
    onchange: (value: string) => void;
  } = $props();

  function onKeydown(event: KeyboardEvent) {
    const index = options.findIndex((option) => option.value === value);
    if (index < 0 || options.length === 0) return;

    let next = index;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (index + 1) % options.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (index - 1 + options.length) % options.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextValue = options[next].value;
    onchange(nextValue);
    document.getElementById(`${idPrefix}-${nextValue}`)?.focus();
  }
</script>

<div role="radiogroup" aria-label={ariaLabel} class="-mx-1 flex flex-wrap gap-2 px-1 pb-1">
  {#each options as option (option.value)}
    {@const selected = value === option.value}
    <button
      type="button"
      role="radio"
      id="{idPrefix}-{option.value}"
      aria-checked={selected}
      tabindex={selected ? 0 : -1}
      class="rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none {selected
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-secondary text-muted-foreground hover:text-foreground'}"
      onclick={() => onchange(option.value)}
      onkeydown={onKeydown}
    >
      {option.label}
    </button>
  {/each}
</div>
