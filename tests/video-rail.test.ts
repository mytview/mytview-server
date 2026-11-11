/**
 * The video page's rail and the card hover preview (web, 2026-11-11):
 *  - `fmtAgo` / `fmtSeason`: the wording the rail and the season headings show.
 *  - the page load's `recent` list: the Recent feed minus the playing video, with the feed's own
 *    filters, and never a replacement for `related` (which is what up-next follows).
 *  - `/api/videos/[id]/preview`: what a hover may play. Sidecar subtitle files go to the ordinary
 *    `/subs/[id]/N`; a track INSIDE the container goes to the windowed route (a whole embedded track
 *    costs an ffmpeg pass over the entire file, a window reads a few seconds). `url: null` for a
 *    federated video, and a private channel 404s like every other by-id route.
 *  - `extractEmbeddedWindow`, against a REAL generated MKV: the cues are the ones inside the window,
 *    with ABSOLUTE times. That is the property that is easy to lose: the obvious ffmpeg spelling
 *    rebases the cues to the keyframe it seeked to, so captions drift by a few seconds.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempEnv } from './helpers';
import { fmtAgo, fmtSeason } from '../src/lib/format';

const env = tempEnv();
const { db } = await import('../src/lib/server/db');
const { stateDb } = await import('../src/lib/server/state');
const { saveWatch } = await import('../src/lib/server/watch');
const { setChannelPrivate } = await import('../src/lib/server/visibility');
const { load } = await import('../src/routes/video/[id]/+page.server');
const { GET: preview } = await import('../src/routes/api/videos/[id]/preview/+server');
const { GET: previewSub } = await import('../src/routes/api/videos/[id]/preview/subs/[n]/+server');
const { extractEmbeddedWindow, PREVIEW_SUB_WINDOW_SEC } = await import('../src/lib/server/subsembed');

let haveFfmpeg = true;
try {
	execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
	execFileSync('ffprobe', ['-version'], { stdio: 'ignore' });
} catch {
	haveFfmpeg = false;
}

afterAll(() => env.cleanup());

describe('fmtAgo', () => {
	const now = Date.UTC(2026, 10, 11, 12, 0, 0);
	const secsAgo = (s: number) => Math.floor(now / 1000) - s;
	const at = (s: number) => fmtAgo(secsAgo(s), null, now);

	it('resolves a timestamp down to minutes and hours, singular and plural', () => {
		expect(at(20)).toBe('just now');
		expect(at(60)).toBe('1 min ago');
		expect(at(5 * 60)).toBe('5 mins ago');
		expect(at(3600)).toBe('1 hour ago');
		expect(at(3 * 3600)).toBe('3 hours ago');
	});

	it('steps through days, weeks, months and years', () => {
		expect(at(86400)).toBe('1 day ago');
		expect(at(6 * 86400)).toBe('6 days ago');
		expect(at(13 * 86400)).toBe('1 week ago');
		expect(at(21 * 86400)).toBe('3 weeks ago');
		expect(at(45 * 86400)).toBe('1 month ago');
		expect(at(200 * 86400)).toBe('6 months ago');
		expect(at(800 * 86400)).toBe('2 years ago');
	});

	it('says "today" for a day-only upload_date, which cannot resolve to hours', () => {
		expect(fmtAgo(null, '20261111', now)).toBe('today');
		expect(fmtAgo(null, '20261109', now)).toBe('2 days ago');
	});

	it('treats a slightly-future timestamp as just now, and an undated item as nothing', () => {
		expect(at(-90)).toBe('just now');
		expect(fmtAgo(null, null, now)).toBe('');
	});
});

describe('fmtSeason', () => {
	it('names seasons, specials and unnumbered episodes', () => {
		expect(fmtSeason(2)).toBe('Season 2');
		expect(fmtSeason(0)).toBe('Specials');
		expect(fmtSeason(null)).toBe('Other episodes');
	});
});

// --- seed: a public channel (4 videos), a private one, a federated row; an owner and a viewer ---
db().exec("INSERT INTO channels (id, name) VALUES ('pub', 'Public'), ('priv', 'Private')");
const ins = db().prepare(
	'INSERT INTO videos (id, channel_id, title, video_path, info_path, mtime, timestamp, peer_id) VALUES (?, ?, ?, ?, ?, 1, ?, ?)'
);
ins.run('a', 'pub', 'A', 'pub/a.mp4', 'pub/a.info.json', 400, null);
ins.run('b', 'pub', 'B', 'pub/b.mp4', 'pub/b.info.json', 300, null);
ins.run('c', 'pub', 'C', 'pub/c.mp4', 'pub/c.info.json', 200, null);
ins.run('d', 'pub', 'D', 'pub/d.mp4', 'pub/d.info.json', 100, null);
ins.run('secret', 'priv', 'Secret', 'priv/s.mp4', 'priv/s.info.json', 500, null);
ins.run('fed:peer1:x', 'pub', 'From a peer', 'fed://x', 'fed://x', 50, 'peer1');
// `a` has two sidecar subtitle files (its media file does not exist, so nothing is embedded).
const sub = db().prepare(
	'INSERT INTO video_subtitles (video_id, lang, label, kind, sub_path, ord) VALUES (?, ?, ?, ?, ?, ?)'
);
sub.run('a', 'en', 'English', 'subtitles', 'pub/a.en.vtt', 0);
sub.run('a', 'es', 'Español (CC)', 'captions', 'pub/a.es.srt', 1);

const addUser = (name: string) =>
	Number(
		stateDb()
			.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)')
			.run(name, 'x', Date.now()).lastInsertRowid
	);
const owner = { id: addUser('owner'), username: 'owner' };
const viewer = { id: addUser('viewer'), username: 'viewer' };
setChannelPrivate('priv', true);

describe('video page load: the Recent tab', () => {
	const run = (id: string, user = viewer) =>
		load({ params: { id }, locals: { user } } as never) as Promise<{
			related: { id: string }[];
			recent: { id: string }[];
		}>;

	it('is the feed in feed order, without the playing video', async () => {
		const { recent } = await run('a');
		expect(recent.map((r) => r.id)).toEqual(['b', 'c', 'd', 'fed:peer1:x']);
	});

	it('applies the feed filters: watched videos and private channels stay out', async () => {
		saveWatch(viewer.id, 'c', { watched: true });
		const { recent } = await run('a');
		expect(recent.map((r) => r.id)).toEqual(['b', 'd', 'fed:peer1:x']);
		expect(recent.some((r) => r.id === 'secret')).toBe(false);
	});

	it('leaves the related list alone', async () => {
		const { related } = await run('a');
		// untagged channel video → related is the recent-unwatched top-up, still without itself
		expect(related.map((r) => r.id)).not.toContain('a');
		expect(related.length).toBeGreaterThan(0);
	});
});

describe('GET /api/videos/[id]/preview', () => {
	const call = async (id: string, user: { id: number; username: string } | null = viewer) =>
		(await (
			(await preview({ params: { id }, url: new URL('http://t/?t=0'), locals: { user } } as never)) as Response
		).json()) as {
			url: string | null;
			subtitles: { lang: string | null; label: string; kind: string; url: string }[];
		};

	it('offers the original file and its sidecar subtitle files on the ordinary /subs route', async () => {
		const p = await call('a');
		expect(p.url).toBe('/media/a');
		expect(p.subtitles).toEqual([
			{ lang: 'en', label: 'English', kind: 'subtitles', url: '/subs/a/0' },
			{ lang: 'es', label: 'Español (CC)', kind: 'captions', url: '/subs/a/1' }
		]);
	});

	it('returns no subtitles for a video that has none', async () => {
		expect(await call('b')).toEqual({ url: '/media/b', subtitles: [] });
	});

	it('has nothing to play for a federated video', async () => {
		expect(await call('fed:peer1:x')).toEqual({ url: null, subtitles: [] });
	});

	it('404s a private channel for a non-granted user, an unknown id, and a signed-out caller', async () => {
		const as = (id: string, user: typeof viewer | null) =>
			preview({ params: { id }, url: new URL('http://t/'), locals: { user } } as never);
		await expect(as('secret', viewer)).rejects.toMatchObject({ status: 404 });
		await expect(as('nope', viewer)).rejects.toMatchObject({ status: 404 });
		await expect(as('a', null)).rejects.toMatchObject({ status: 404 });
	});

	it('lets the owner preview a private channel', async () => {
		expect((await call('secret', owner)).url).toBe('/media/secret');
	});
});

// --- captions INSIDE the video file: the windowed path, with real ffmpeg ---------------------
// A 10-minute MKV whose subtitle track has one cue every 20 seconds, each saying its own start
// time ("cue 300" starts at 300 s). So any drift in the extracted times is visible in the text.
describe.skipIf(!haveFfmpeg)('embedded captions for the hover preview (real ffmpeg)', () => {
	const rel = 'pub/emb.mkv';
	const stamp = (sec: number) =>
		`00:${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')},000`;
	const cues = Array.from({ length: 30 }, (_, i) => i * 20);
	mkdirSync(path.join(env.mediaRoot, 'pub'), { recursive: true });
	const srt = path.join(env.base, 'emb.srt');
	writeFileSync(srt, cues.map((c, i) => `${i + 1}\n${stamp(c)} --> ${stamp(c + 4)}\ncue ${c}\n`).join('\n'));
	if (haveFfmpeg) {
		execFileSync(
			'ffmpeg',
			['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=64x36:d=600:r=5', '-i', srt,
			 '-c:v', 'libx264', '-preset', 'ultrafast', '-g', '50', '-c:s', 'srt',
			 '-metadata:s:s:0', 'language=eng', path.join(env.mediaRoot, rel)],
			{ stdio: 'ignore' }
		);
		ins.run('emb', 'pub', 'Embedded', rel, 'pub/emb.info.json', 600, null);
		// Watched for the viewer, so it stays out of the Recent lists the tests above pin exactly
		// (this block's setup runs at collection time, before those tests execute).
		saveWatch(viewer.id, 'emb', { watched: true });
	}
	// "HH:MM:SS.mmm" or "MM:SS.mmm" → seconds, paired with the cue text on the next line.
	const parse = (vtt: string) =>
		[...vtt.matchAll(/^((?:\d+:)?\d{2}:\d{2}\.\d{3}) --> .*\n(.*)$/gm)].map((m) => {
			const p = m[1].split(':').map(Number);
			const at = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
			return { at: Math.round(at), text: m[2].trim() };
		});

	it('lists the embedded track on the windowed route, carrying where the preview starts', async () => {
		const res = (await preview({
			params: { id: 'emb' },
			url: new URL('http://t/?t=300'),
			locals: { user: viewer }
		} as never)) as Response;
		const p = (await res.json()) as { subtitles: { lang: string | null; url: string }[] };
		expect(p.subtitles).toHaveLength(1);
		expect(p.subtitles[0].lang).toBe('en');
		expect(p.subtitles[0].url).toBe('/api/videos/emb/preview/subs/0?from=300');
	});

	it('extracts only the window, and every cue keeps its absolute time', async () => {
		const row = db().prepare("SELECT mtime FROM videos WHERE id = 'emb'").get() as { mtime: number };
		const got = parse((await extractEmbeddedWindow(rel, 1, row.mtime, 300))!);
		expect(got.length).toBeGreaterThan(0);
		for (const c of got) expect(c.text).toBe(`cue ${c.at}`); // no drift: the text IS the time
		expect(got.some((c) => c.at === 300)).toBe(true);
		// nothing from well before the start, nothing past the end of the window
		expect(Math.min(...got.map((c) => c.at))).toBeGreaterThanOrEqual(240);
		expect(Math.max(...got.map((c) => c.at))).toBeLessThanOrEqual(300 + PREVIEW_SUB_WINDOW_SEC);
	});

	it('starts at the beginning when the preview does', async () => {
		const row = db().prepare("SELECT mtime FROM videos WHERE id = 'emb'").get() as { mtime: number };
		const got = parse((await extractEmbeddedWindow(rel, 1, row.mtime, 0))!);
		expect(got[0]).toEqual({ at: 0, text: 'cue 0' });
		expect(Math.max(...got.map((c) => c.at))).toBeLessThanOrEqual(PREVIEW_SUB_WINDOW_SEC);
	});

	it('serves the window as WebVTT, and 404s a private channel and a track that is not there', async () => {
		const get = (id: string, n: string, user: typeof viewer | null = viewer) =>
			previewSub({
				params: { id, n },
				url: new URL('http://t/?from=300'),
				request: new Request('http://t/'),
				locals: { user }
			} as never) as Promise<Response>;
		const res = await get('emb', '0');
		expect(res.headers.get('content-type')).toContain('text/vtt');
		expect(parse(await res.text()).some((c) => c.text === 'cue 300')).toBe(true);
		await expect(get('emb', '5')).rejects.toMatchObject({ status: 404 });
		await expect(get('secret', '0')).rejects.toMatchObject({ status: 404 });
		await expect(get('emb', '0', null)).rejects.toMatchObject({ status: 404 });
	});
});
