<script lang="ts">
	// "Support this creator" — the channel's promoted tip-jar / membership pages (server-inferred,
	// see lib/server/supportlinks.ts). Plain outbound links: nothing is embedded or tracked. Each chip
	// carries the platform's glyph (lib/brandIcons.ts) so a reader recognises Patreon / Ko-fi / PayPal
	// at a glance, in the theme's own colour rather than the brand's.
	import type { SupportLink } from '$lib/types';
	import { brandIconPath } from '$lib/brandIcons';

	let { links }: { links: SupportLink[] } = $props();
</script>

{#if links.length}
	<div class="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-muted">
		<span>Support this creator</span>
		{#each links as l (l.url)}
			<a
				href={l.url}
				target="_blank"
				rel="noopener"
				title="Opens the creator's {l.label} page in a new tab"
				class="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-base-content transition-colors hover:border-primary/60 hover:text-primary"
			>
				<svg viewBox="0 0 24 24" class="h-3.5 w-3.5 flex-none" fill="currentColor" aria-hidden="true">
					<path d={brandIconPath(l.platform)} />
				</svg>
				<span>{l.label}</span>
			</a>
		{/each}
	</div>
{/if}
