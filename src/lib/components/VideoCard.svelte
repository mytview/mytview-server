<script lang="ts">
	import type { VideoSummary } from '$lib/types';
	import { fmtDuration, fmtViews, fmtDate, fmtEpisode } from '$lib/format';
	import { watchUpdates, noteWatch } from '$lib/watchStore';
	import { canHoverPreview, hoverPreviewEnabled } from '$lib/hoverPreview';
	import { onDestroy } from 'svelte';

	let { video, showChannel = true }: { video: VideoSummary; showChannel?: boolean } = $props();

	// Fall back to the placeholder if the thumb file 404s (e.g. a just-pulled video whose image
	// hasn't landed yet, or one being re-processed) instead of the browser's broken-image icon.
	let imgError = $state(false);

	// Overlay any in-session change from the player over the SSR values.
	const patch = $derived($watchUpdates[video.id]);
	const watched = $derived(patch?.watched ?? video.watched ?? false);
	const position = $derived(patch?.position ?? video.position ?? 0);
	const progress = $derived(
		position && video.duration ? Math.min(100, (position / video.duration) * 100) : 0
	);

	// Series episodes carry no view count (the .nfo has none) — that stat slot renders "— views".
	// When we have a season/episode, show the episode label there instead; else keep views.
	const epLabel = $derived(fmtEpisode(video.season_number, video.episode_number));

	// --- hover preview -------------------------------------------------------------------------
	// Rest the pointer on a card and it plays in place, muted, the way YouTube's cards do. Because it
	// is muted, captions are what make it worth having, so a subtitle file is shown when there is one.
	//
	// It plays the ORIGINAL file and nothing else: no live-HLS fallback, because a transcode session
	// per passing pointer would be absurd. A file this browser can't decode simply errors and the card
	// stays a thumbnail. It never writes watch state. What may play and which caption tracks exist is
	// the server's answer (`/api/videos/[id]/preview`); a track INSIDE the video file arrives as a
	// short window starting where the preview starts, because extracting a whole one is too slow.
	const HOVER_DELAY_MS = 700; // long enough that sweeping the pointer across the grid starts nothing
	type PreviewSub = { lang: string | null; label: string; kind: 'captions' | 'subtitles'; url: string };
	let previewSrc = $state<string | null>(null); // set → the <video> is mounted
	let previewSubs = $state<PreviewSub[]>([]);
	let previewPlaying = $state(false); // a frame is on screen → fade the video in over the thumbnail
	let previewEl = $state<HTMLVideoElement>();
	let hoverTimer: ReturnType<typeof setTimeout> | null = null;
	let hoverToken = 0; // bumped on every leave, so a late response for an abandoned hover is dropped
	// Where the preview starts: where this viewer left off if they are part-way through, else the
	// beginning. Decided BEFORE asking the server, since the caption window is cut from this point.
	let previewStart = 0;

	function onEnter() {
		if (!canHoverPreview() || !hoverPreviewEnabled()) return;
		if (hoverTimer) clearTimeout(hoverTimer);
		hoverTimer = setTimeout(startPreview, HOVER_DELAY_MS);
	}
	async function startPreview() {
		hoverTimer = null;
		const mine = ++hoverToken;
		previewStart =
			position > 5 && (!video.duration || position < video.duration - 10) ? Math.floor(position) : 0;
		try {
			const r = await fetch(`/api/videos/${encodeURIComponent(video.id)}/preview?t=${previewStart}`);
			if (!r.ok) return;
			const d: { url: string | null; subtitles: PreviewSub[] } = await r.json();
			if (mine !== hoverToken || !d.url) return; // pointer already left, or nothing playable here
			previewSubs = d.subtitles;
			previewSrc = d.url;
		} catch {
			/* offline or signed out: the card just stays a thumbnail */
		}
	}
	function stopPreview() {
		hoverToken++;
		if (hoverTimer) clearTimeout(hoverTimer);
		hoverTimer = null;
		if (previewEl) {
			// Dropping the src (and reloading) is what actually aborts the download; removing the
			// element alone can leave the request running.
			previewEl.pause();
			previewEl.removeAttribute('src');
			previewEl.load();
		}
		previewSrc = null;
		previewPlaying = false;
	}
	function onPreviewMeta() {
		const el = previewEl;
		if (!el) return;
		if (previewStart > 0) el.currentTime = previewStart;
		// Captions: the language chosen in the player if this video has it, else the browser's
		// language, else the first track (the server's order). Unlike the player, the preview shows
		// them even when captions are normally off, since there is no sound to follow.
		const tracks = el.textTracks;
		if (!tracks.length || !previewSubs.length) return;
		let want: string | null = null;
		try {
			want = localStorage.getItem('myt-view:subtitleLang');
		} catch {
			want = null;
		}
		const base = (l: string | null) => (l ?? '').toLowerCase().split('-')[0];
		const mine = base(typeof navigator !== 'undefined' ? navigator.language : '');
		let pick = want ? previewSubs.findIndex((t) => t.lang === want) : -1;
		if (pick < 0 && mine) pick = previewSubs.findIndex((t) => base(t.lang) === mine);
		if (pick < 0) pick = 0;
		for (let i = 0; i < tracks.length; i++) tracks[i].mode = i === pick ? 'showing' : 'disabled';
	}
	onDestroy(stopPreview);

	// Mark watched/unwatched straight from the card — no need to open the video. Optimistic via the
	// shared store, persisted to the same endpoint the detail page uses.
	function toggleWatched(e: MouseEvent) {
		e.preventDefault(); // this button lives inside the card's <a> — don't navigate
		e.stopPropagation();
		const next = !watched;
		const update = { watched: next, position: next ? 0 : position };
		noteWatch(video.id, update);
		fetch(`/api/watch/${encodeURIComponent(video.id)}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(update),
			keepalive: true
		}).catch(() => {});
	}
</script>

<a
	href="/video/{encodeURIComponent(video.id)}"
	onmouseenter={onEnter}
	onmouseleave={stopPreview}
	class="group block rounded-lg outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary/70"
>
	<div class="relative aspect-video overflow-hidden rounded-lg border border-line-soft bg-base-300">
		{#if video.thumb_path && !imgError}
			<!-- Watched thumbs dim so unwatched pops when "show watched" is on (full again on hover). -->
			<img
				loading="lazy"
				src="/thumb/{encodeURIComponent(video.id)}?w=480"
				alt=""
				onerror={() => (imgError = true)}
				class="h-full w-full object-cover transition-[transform,opacity,filter] duration-300 group-hover:scale-[1.03] group-hover:brightness-[1.06] {watched
					? 'opacity-55 group-hover:opacity-100'
					: ''}"
			/>
		{:else}
			<div class="grid h-full place-items-center font-mono text-xs text-faint">no thumbnail</div>
		{/if}
		{#if previewSrc}
			<!-- The hover preview. Sits over the thumbnail and under the badges; invisible until a frame
			     is actually playing, so a file that never starts leaves the thumbnail untouched. Clicks
			     pass through to the card's link. `contain`, not `cover`: a vertical video is shown whole. -->
			<video
				bind:this={previewEl}
				src={previewSrc}
				muted
				autoplay
				playsinline
				disablepictureinpicture
				preload="auto"
				tabindex="-1"
				aria-hidden="true"
				onloadedmetadata={onPreviewMeta}
				onplaying={() => (previewPlaying = true)}
				onerror={stopPreview}
				onended={stopPreview}
				class="card-preview pointer-events-none absolute inset-0 h-full w-full bg-black object-contain transition-opacity duration-200 {previewPlaying
					? 'opacity-100'
					: 'opacity-0'}"
			>
				{#each previewSubs as t (t.url)}
					<track kind={t.kind} label={t.label} srclang={t.lang ?? undefined} src={t.url} />
				{/each}
			</video>
		{/if}
		{#if video.duration && !previewPlaying}
			<span
				class="absolute right-1.5 bottom-1.5 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[11px] leading-none text-neutral-100"
			>
				{fmtDuration(video.duration)}
			</span>
		{/if}
		{#if watched}
			<span
				class="absolute top-1.5 left-1.5 rounded bg-primary/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary-content"
				>watched</span
			>
		{:else if progress > 1}
			<div class="absolute inset-x-0 bottom-0 h-[3px] bg-black/50">
				<div class="h-full bg-primary" style="width:{progress}%"></div>
			</div>
		{/if}
		<button
			type="button"
			onclick={toggleWatched}
			aria-label={watched ? 'Mark as unwatched' : 'Mark as watched'}
			title={watched ? 'Mark as unwatched' : 'Mark as watched'}
			class="absolute top-1 right-1 p-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] transition-transform hover:scale-110 {watched
				? 'text-primary'
				: 'text-white/85 hover:text-primary'}"
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M20 6 9 17l-5-5" />
			</svg>
		</button>
	</div>
	<div class="pt-2.5">
		<div class="line-clamp-2 text-[13.5px] leading-snug font-medium">{video.title}</div>
		<div class="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[11.5px] text-muted">
			{#if showChannel && video.channel_name}
				<span class="text-base-content">{video.channel_name}</span>
				<span class="text-faint">·</span>
			{/if}
			<span>{fmtDate(video.timestamp, video.upload_date)}</span>
			<span class="text-faint">·</span>
			{#if epLabel}
				<span class="text-base-content">{epLabel}</span>
			{:else if video.year}
				<!-- Movies: the release year is the meaningful stat (they carry no view count). -->
				<span class="text-base-content">{video.year}</span>
			{:else}
				<span>{fmtViews(video.view_count)} views</span>
			{/if}
		</div>
	</div>
</a>

<style>
	/*
	 * Caption size inside a card. A browser sizes cues as a share of the video's height, which on a
	 * full-size player is right and on a card ~170px tall comes out near 8px. `::cue` lives in the
	 * <video>'s shadow tree, so it has to be :global (same reason as in Player.svelte).
	 */
	:global(video.card-preview::cue) {
		font-size: 150%;
	}
</style>
