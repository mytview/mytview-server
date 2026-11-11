import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { resolveTracks } from '$lib/server/subsembed';
import { canSeeChannel } from '$lib/server/visibility';
import type { RequestHandler } from './$types';

/**
 * What a card's hover preview may play (web only — a pointer hovering a card has no TV or touch
 * equivalent, so this is not part of `/api/v1`).
 *
 * The preview is muted, so captions are the half that makes it useful, and they are also the half
 * that could get expensive. Every track the player would offer is offered here too, in the same
 * order (`resolveTracks`: sidecar files, then tracks inside the container), but the two kinds are
 * served differently:
 *  - a SIDECAR file is small, so it is the ordinary `/subs/[id]/N`;
 *  - an EMBEDDED track is served as a short window starting at `?t=` (where the preview will start
 *    playing) by `./subs/[n]`. Extracting a whole embedded track means demuxing the entire file,
 *    which is fine when someone sits down to watch and far too much for a pointer passing over a
 *    card; a window reads a few seconds of it. See `extractEmbeddedWindow`.
 * Listing the tracks costs one header read of the file (ffprobe, memoised); the browser then
 * fetches only the one track the card turns on.
 *
 * `url` is null when there is nothing this server can stream for the id: a federated video plays
 * from its peer over signed URLs, which a passing hover should not mint.
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	const v = db()
		.prepare('SELECT channel_id, peer_id FROM videos WHERE id = ?')
		.get(params.id) as { channel_id: string; peer_id: string | null } | undefined;
	if (!v || !canSeeChannel(locals.user, v.channel_id)) throw error(404);
	if (v.peer_id != null) return json({ url: null, subtitles: [] });

	const t = Number(url.searchParams.get('t'));
	const from = Number.isFinite(t) && t > 0 ? Math.floor(t) : 0;
	const id = encodeURIComponent(params.id);
	const subtitles = (await resolveTracks(params.id)).map((track, i) => ({
		lang: track.lang,
		label: track.label,
		kind: track.kind,
		url:
			track.streamIndex == null
				? `/subs/${id}/${i}`
				: `/api/videos/${id}/preview/subs/${i}?from=${from}`
	}));
	return json(
		{ url: `/media/${id}`, subtitles },
		{ headers: { 'cache-control': 'private, max-age=300' } }
	);
};
