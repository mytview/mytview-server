import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { extractEmbeddedWindow, resolveTracks } from '$lib/server/subsembed';
import { canSeeChannel } from '$lib/server/visibility';
import type { RequestHandler } from './$types';

/**
 * One EMBEDDED subtitle track, as a short window of WebVTT for the card hover preview: the cues
 * from `?from=` (seconds) for the next few minutes, with absolute times. Web-internal, session
 * auth only — native players and share links use `/subs/[id]/[n]`, which serves whole tracks.
 *
 * Track N is the same N as everywhere else (`resolveTracks`). A sidecar file needs no window, so
 * that index just redirects to the ordinary route. Same visibility rule as every by-id route: a
 * private channel 404s for anyone not granted, exactly like an id that does not exist.
 */
export const GET: RequestHandler = async ({ params, url, request, locals }) => {
	const v = db()
		.prepare('SELECT channel_id, peer_id, video_path, mtime FROM videos WHERE id = ?')
		.get(params.id) as
		| { channel_id: string; peer_id: string | null; video_path: string; mtime: number }
		| undefined;
	if (!v || v.peer_id != null || !canSeeChannel(locals.user, v.channel_id)) throw error(404);

	const n = Number(params.n);
	if (!Number.isInteger(n) || n < 0) throw error(404);
	const track = (await resolveTracks(params.id))[n];
	if (!track) throw error(404);
	if (track.streamIndex == null) throw redirect(307, `/subs/${encodeURIComponent(params.id)}/${n}`);

	const vtt = await extractEmbeddedWindow(
		v.video_path,
		track.streamIndex,
		v.mtime,
		Number(url.searchParams.get('from')),
		request.signal
	);
	if (vtt === null) throw error(404, 'subtitle window could not be extracted');
	return new Response(vtt, {
		headers: { 'content-type': 'text/vtt; charset=utf-8', 'cache-control': 'private, max-age=300' }
	});
};
