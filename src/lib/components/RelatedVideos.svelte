<script lang="ts">
	import { fmtDuration, fmtEpisode, fmtAgo } from '$lib/format';
	import type { VideoSummary } from '$lib/types';

	// Both lists come from the page's SSR load (indexed queries), so there is no client fetch and no
	// flash when switching tabs.
	//  - `related` is the server's related list (the one up-next and autoplay follow).
	//  - `recent` is the Recent feed minus the playing video: a second tab for browsing on from here.
	//  - variant 'list' = the desktop sidebar (thumbnail left, title right, boxed).
	//  - variant 'grid' = mobile, right under the video (2-up cards, thumbnail on top).
	let {
		related,
		recent = [],
		variant = 'list'
	}: { related: VideoSummary[]; recent?: VideoSummary[]; variant?: 'list' | 'grid' } = $props();

	type Tab = 'related' | 'recent';
	// Related is the default. The choice is kept while this page stays mounted (clicking through
	// several videos from the Recent tab keeps you on it) and is not stored beyond that.
	let picked = $state<Tab>('related');
	// Only tabs that have something to show; a show's finale has no related list, so Recent leads.
	const tabs = $derived<Tab[]>([
		...(related.length ? (['related'] as const) : []),
		...(recent.length ? (['recent'] as const) : [])
	]);
	const tab = $derived<Tab | undefined>(tabs.includes(picked) ? picked : tabs[0]);
	const items = $derived(tab === 'recent' ? recent : related);

	// Series episodes lead the meta line with their SxE label (the rail is next-episodes for a show).
	const ep = (v: VideoSummary) => fmtEpisode(v.season_number, v.episode_number);
	// When it aired, or for a movie when it was added (its timestamp is the file's): "2 hours ago".
	const ago = (v: VideoSummary) => fmtAgo(v.timestamp, v.upload_date);
</script>

{#snippet tabBar(boxed: boolean)}
	{#if tabs.length > 1}
		<div
			role="tablist"
			aria-label="More to watch"
			class="flex gap-5 {boxed ? 'border-b border-line px-3.5' : 'mb-2.5 border-b border-line-soft'}"
		>
			{#each tabs as t (t)}
				<button
					role="tab"
					aria-selected={tab === t}
					onclick={() => (picked = t)}
					class="-mb-px border-b-2 font-mono text-[11px] font-semibold tracking-widest uppercase transition-colors {boxed
						? 'py-3'
						: 'pb-2'} {tab === t
						? 'border-primary text-base-content'
						: 'border-transparent text-faint hover:text-muted'}">{t}</button
				>
			{/each}
		</div>
	{:else}
		<h2
			class="font-mono text-[11px] font-semibold tracking-widest text-faint uppercase {boxed
				? 'border-b border-line px-3.5 py-3'
				: 'mb-2.5'}"
		>
			{tab}
		</h2>
	{/if}
{/snippet}

{#if tab}
	{#if variant === 'grid'}
		<section>
			{@render tabBar(false)}
			<div class="grid grid-cols-2 gap-3">
				{#each items as v (v.id)}
					<a href="/video/{encodeURIComponent(v.id)}" class="group block">
						<div class="relative aspect-video overflow-hidden rounded-lg bg-base-300">
							{#if v.thumb_path}
								<img
									loading="lazy"
									src="/thumb/{encodeURIComponent(v.id)}"
									alt=""
									class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
								/>
							{/if}
							{#if v.duration}
								<span
									class="absolute right-1 bottom-1 rounded bg-black/80 px-1 font-mono text-[9px] leading-tight text-neutral-100"
									>{fmtDuration(v.duration)}</span
								>
							{/if}
						</div>
						<div class="mt-1.5 line-clamp-2 text-xs leading-snug font-medium">{v.title}</div>
						<div class="mt-0.5 truncate font-mono text-[10px] text-muted">
							{#if ep(v)}<span class="text-base-content">{ep(v)}</span>{' · '}{/if}{v.channel_name}
						</div>
						{#if ago(v)}
							<div class="truncate font-mono text-[10px] text-faint">{ago(v)}</div>
						{/if}
					</a>
				{/each}
			</div>
		</section>
	{:else}
		<div class="overflow-hidden rounded-xl border border-line bg-base-200">
			{@render tabBar(true)}
			{#each items as v (v.id)}
				<a
					href="/video/{encodeURIComponent(v.id)}"
					class="flex gap-2.5 border-b border-line-soft p-2.5 last:border-b-0 hover:bg-base-300"
				>
					<div class="relative aspect-video w-24 shrink-0 self-start overflow-hidden rounded bg-base-300">
						{#if v.thumb_path}
							<img
								loading="lazy"
								src="/thumb/{encodeURIComponent(v.id)}"
								alt=""
								class="h-full w-full object-cover"
							/>
						{/if}
						{#if v.duration}
							<span
								class="absolute right-0.5 bottom-0.5 rounded bg-black/80 px-1 font-mono text-[9px] leading-tight text-neutral-100"
								>{fmtDuration(v.duration)}</span
							>
						{/if}
					</div>
					<div class="min-w-0">
						<div class="line-clamp-2 text-xs leading-snug font-medium">{v.title}</div>
						<div class="mt-1 truncate font-mono text-[10px] text-muted">
							{#if ep(v)}<span class="text-base-content">{ep(v)}</span>{' · '}{/if}{v.channel_name}
						</div>
						{#if ago(v)}
							<div class="truncate font-mono text-[10px] text-faint">{ago(v)}</div>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
{/if}
