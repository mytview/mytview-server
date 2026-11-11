<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Player from '$lib/components/Player.svelte';
	import RelatedVideos from '$lib/components/RelatedVideos.svelte';
	import ShareDialog from '$lib/components/ShareDialog.svelte';
	import SupportLinks from '$lib/components/SupportLinks.svelte';
	import { fmtDuration, fmtViews, fmtDate, relDate, fmtEpisode } from '$lib/format';
	import { copyText } from '$lib/copy';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const v = $derived(data.video);
	const res = $derived(v.width && v.height ? `${v.width}×${v.height}` : '');
	// Undated items (an episode whose .nfo has no air date) say nothing rather than "—".
	const dated = $derived(!!v.timestamp || !!v.upload_date);
	const published = $derived(
		dated
			? fmtDate(v.timestamp, v.upload_date) +
					(relDate(v.timestamp, v.upload_date) ? ` (${relDate(v.timestamp, v.upload_date)})` : '')
			: ''
	);

	// Which episode this is. The title alone ("Chip Off the Old Butch") never says, so the label sits
	// beside the show's name under the title, in the Metadata panel, and in the browser tab.
	const epLabel = $derived(fmtEpisode(v.season_number, v.episode_number));

	// Theater mode: the player takes the full browser width and the page stays a page. This component
	// owns the flag because the layout change is its own (lifting the width cap, moving the rail under
	// the player), and because it outlives the Player, which remounts per video: the mode carries
	// through an autoplay run. Remembered in this browser, like YouTube does. Never applied to a
	// portrait video (height-bound, so wider is only black bars) or to the peer-unreachable card.
	const THEATER_KEY = 'myt-view:theater';
	let theater = $state(false);
	let theaterLoaded = false;
	const portrait = $derived(!!v.width && !!v.height && v.height > v.width);
	const theaterOn = $derived(theater && !portrait && !data.peerUnavailable);
	onMount(() => {
		try {
			theater = localStorage.getItem(THEATER_KEY) === '1';
		} catch {
			/* private mode: the choice just doesn't persist */
		}
		theaterLoaded = true;
	});
	$effect(() => {
		const on = theater; // tracked
		if (!theaterLoaded) return;
		try {
			localStorage.setItem(THEATER_KEY, on ? '1' : '0');
		} catch {
			/* see above */
		}
	});

	let copied = $state(false);
	let descOpen = $state(false);
	function flashCopied() {
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	async function shareSource() {
		const url = v.webpage_url;
		if (!url) return;
		// 1) Native share sheet where offered (mobile, Safari).
		if (typeof navigator !== 'undefined' && navigator.share) {
			try {
				await navigator.share({ url, title: v.title });
				return;
			} catch {
				/* user dismissed → fall through to copy */
			}
		}
		// 2) Clipboard with the plain-HTTP LAN fallback ($lib/copy — this page's original helper,
		// now shared with the admin copy buttons that had silently broken on http://<ip>).
		if (await copyText(url)) flashCopied();
		// 3) Last resort: at least surface the URL to copy by hand.
		else window.prompt('Copy this link:', url);
	}

	function back() {
		if (history.length > 1) history.back();
		else goto('/');
	}
</script>

<svelte:head><title>{v.title}{epLabel ? ` (${epLabel})` : ''} · MytView</title></svelte:head>

<button
	onclick={back}
	class="vp-back mb-4 inline-flex gap-1.5 font-mono text-xs text-muted hover:text-base-content"
	class:is-theater={theaterOn}>← back</button
>

<!-- Three grid children (player / details / rail) rather than two columns, so theater mode can
     re-place them with CSS alone: the player must stay the SAME element across the switch or
     playback would restart. Layout rules are in the <style> block below. -->
<div class="vp-grid" class:is-theater={theaterOn}>
	<div class="vp-player">
		{#key v.id}
			{#if data.peerUnavailable}
				<!-- Federated video whose peer server didn't answer: the metadata below is local and fine,
				     but there is nothing to stream. Explicit state — never a fake decode error. -->
				<div
					class="flex aspect-video items-center justify-center rounded-xl border border-dashed border-line bg-base-200 p-8 text-center"
				>
					<div>
						<div class="mb-1 font-medium">The server this video lives on isn’t reachable right now.</div>
						<div class="font-mono text-xs text-muted">
							It streams directly from a federated peer — try again when that server is back online.
						</div>
					</div>
				</div>
			{:else}
				<Player
					id={v.id}
					title={v.title}
					channel={v.channel_name}
					thumbPath={v.thumb_path}
					watch={data.watch}
					watchedAt={data.watchedAt}
					resumePosition={data.resumePosition}
					autoplayNext={data.prefs.autoplayNext && v.channel_kind !== 'movies'}
					stillWatchingAfter={data.prefs.stillWatchingAfter}
					preferCompat={data.preferCompat}
					hlsEnabled={data.hlsEnabled}
					subtitles={data.subtitles}
					audioTracks={data.audioTracks}
					subtitleSize={data.prefs.subtitleSize}
					subtitleColor={data.prefs.subtitleColor}
					srcUrl={data.srcUrl}
					hlsUrl={data.hlsUrl}
					remote={data.remote}
					width={v.width}
					height={v.height}
					bind:theater
				/>
			{/if}
		{/key}
	</div>

	<div class="vp-info">
		<h1 class="text-xl leading-tight font-bold">{v.title}</h1>
		<div class="mt-2.5 flex flex-wrap items-center gap-2 font-mono text-[12.5px] text-muted">
			<a
				href="/channel/{encodeURIComponent(v.channel_id)}"
				class="text-base-content hover:text-primary">{v.channel_name}</a
			>
			{#if epLabel}
				<span class="text-faint">·</span><span class="text-base-content">{epLabel}</span>
			{/if}
			{#if v.channel_kind === 'movies'}
				<!-- A movie's facts: release year (its timestamp is the ADDED date — feed ordering, not
				     display) and runtime. No views/likes — film NFOs carry neither. -->
				{#if v.year}<span class="text-faint">·</span><span>{v.year}</span>{/if}
				{#if v.duration}<span class="text-faint">·</span><span>{fmtDuration(v.duration)}</span>{/if}
			{:else}
				{#if dated}
					<span class="text-faint">·</span><span>{fmtDate(v.timestamp, v.upload_date)}</span>
				{/if}
				<!-- Episodes carry no view count (an .nfo has none): say nothing rather than "— views". -->
				{#if v.view_count != null}
					<span class="text-faint">·</span><span>{fmtViews(v.view_count)} views</span>
				{/if}
				{#if v.like_count != null}
					<span class="text-faint">·</span><span>{fmtViews(v.like_count)} likes</span>
				{/if}
			{/if}
		</div>
		{#if data.supportLinks.length}
			<div class="mt-2"><SupportLinks links={data.supportLinks} /></div>
		{/if}

		{#if v.tags?.length}
			<div class="mt-4 flex flex-wrap gap-1.5">
				{#each v.tags.slice(0, 24) as t}
					<a
						href="/tag/{encodeURIComponent(t)}"
						class="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-muted transition-colors hover:border-primary/60 hover:text-base-content"
						>{t}</a
					>
				{/each}
			</div>
		{/if}

		<div class="mt-4 flex flex-wrap items-center gap-2">
			<ShareDialog videoId={v.id} />
			{#if v.webpage_url}
				<button
					onclick={shareSource}
					title="Copy / share the original source URL"
					class="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-primary/60 hover:text-base-content"
				>
					{#if copied}
						<span class="text-primary">copied</span>
					{:else}
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
							<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
						</svg>
						Share source
					{/if}
				</button>
			{/if}
		</div>

		<!-- Related / Recent: on mobile the rail sits right under the video (before the description);
		     on desktop it lives in the sidebar instead, so this copy is hidden there. -->
		{#if data.related.length || data.recent.length}
			<div class="mt-5 min-[900px]:hidden">
				<RelatedVideos related={data.related} recent={data.recent} variant="grid" />
			</div>
		{/if}

		{#if v.description}
			<div class="mt-5 max-w-[78ch]">
				<div
					class="leading-relaxed whitespace-pre-wrap text-[14px] text-neutral-300 {descOpen
						? ''
						: 'line-clamp-6'}"
				>
					{v.description}
				</div>
				{#if v.description.length > 280}
					<button
						onclick={() => (descOpen = !descOpen)}
						class="mt-1.5 font-mono text-xs text-primary hover:underline"
					>
						{descOpen ? 'Show less' : 'Show more'}
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<div class="vp-side flex flex-col gap-4">
		<!-- The rail first — it's more useful than raw file metadata. On mobile the grid copy above the
		     description is shown instead, so this desktop list is hidden there. -->
		<div class="hidden min-[900px]:block">
			<RelatedVideos related={data.related} recent={data.recent} variant="list" />
		</div>
		<aside class="overflow-hidden rounded-xl border border-line bg-base-200">
			<h2
				class="border-b border-line px-3.5 py-3 font-mono text-[11px] font-semibold tracking-widest text-faint uppercase"
			>
				Metadata
			</h2>
			{#snippet spec(k: string, val: string)}
				{#if val}
					<div
						class="grid grid-cols-[96px_1fr] gap-2.5 border-b border-line-soft px-3.5 py-2 font-mono text-xs last:border-b-0"
					>
						<span class="text-faint">{k}</span>
						<span class="break-words">{val}</span>
					</div>
				{/if}
			{/snippet}
			{@render spec(v.channel_kind === 'series' ? 'Series' : 'Channel', v.channel_name)}
			{@render spec(
				'Season',
				v.season_number == null ? '' : v.season_number === 0 ? 'Specials' : String(v.season_number)
			)}
			{@render spec('Episode', v.episode_number != null ? String(v.episode_number) : '')}
			{@render spec('Published', published)}
			{@render spec('Duration', fmtDuration(v.duration))}
			{@render spec('Views', v.view_count != null ? v.view_count.toLocaleString() : '')}
			{@render spec('Likes', v.like_count != null ? v.like_count.toLocaleString() : '')}
			{@render spec('Resolution', res)}
			{@render spec('FPS', v.fps ? String(Math.round(v.fps)) : '')}
			{@render spec('Video', v.vcodec ?? '')}
			{@render spec('Audio', v.acodec ?? '')}
			{@render spec('Video id', v.id)}
			{#if v.webpage_url}
				<div
					class="grid grid-cols-[96px_1fr] gap-2.5 border-b border-line-soft px-3.5 py-2 font-mono text-xs last:border-b-0"
				>
					<span class="text-faint">Source</span>
					<a href={v.webpage_url} target="_blank" rel="noopener" class="text-primary break-words"
						>open ↗</a
					>
				</div>
			{/if}
		</aside>
	</div>
</div>

<style>
	/*
	 * STANDARD: the player and its details share the left column; the rail runs down the right for
	 * the height of both. Below 900px everything stacks in source order.
	 */
	.vp-grid {
		display: grid;
		row-gap: 1rem;
		column-gap: 1.5rem;
		align-items: start;
	}
	.vp-side {
		margin-top: 0.5rem; /* stacked: a little more air above the Metadata panel */
	}
	@media (min-width: 900px) {
		.vp-grid {
			grid-template-columns: minmax(0, 1fr) 340px;
			/* the rail spans both rows; `1fr` on the second makes any extra height land under the
			   details, never between the player and its title */
			grid-template-rows: auto 1fr;
		}
		.vp-player {
			grid-column: 1;
			grid-row: 1;
		}
		.vp-info {
			grid-column: 1;
			grid-row: 2;
		}
		.vp-side {
			grid-column: 2;
			grid-row: 1 / span 2;
			margin-top: 0;
		}
	}

	/*
	 * THEATER: the player runs the full width of the browser window and everything else sits
	 * underneath it at the normal content width, so the page still scrolls and still reads as a page.
	 * The layout's <main class="wrap"> caps the width at 1500px with 22px side padding; lift both
	 * while a theater player is on the page, then rebuild that same content column for the details
	 * and the rail with gutter tracks. (Doing it this way rather than with 100vw avoids a horizontal
	 * scrollbar on platforms whose scrollbars take up space.)
	 */
	:global(main.wrap:has(.vp-grid.is-theater)) {
		max-width: none;
		padding-left: 0;
		padding-right: 0;
	}
	.vp-back.is-theater {
		margin-left: max(22px, calc((100% - 1456px) / 2));
	}
	.vp-grid.is-theater {
		column-gap: 0;
		grid-template-columns: minmax(22px, 1fr) minmax(0, 1456px) minmax(22px, 1fr);
	}
	.vp-grid.is-theater .vp-player {
		grid-column: 1 / -1;
	}
	.vp-grid.is-theater .vp-info,
	.vp-grid.is-theater .vp-side {
		grid-column: 2;
	}
	@media (min-width: 900px) {
		.vp-grid.is-theater {
			/* 1092 + 364 = 1456 = the 1500px cap minus its two 22px paddings */
			grid-template-columns: minmax(22px, 1fr) minmax(0, 1092px) 364px minmax(22px, 1fr);
			grid-template-rows: auto auto;
		}
		.vp-grid.is-theater .vp-info {
			grid-column: 2;
			grid-row: 2;
		}
		.vp-grid.is-theater .vp-side {
			grid-column: 3;
			grid-row: 2;
			padding-left: 1.5rem;
		}
	}
</style>
