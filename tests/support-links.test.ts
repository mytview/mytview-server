/**
 * Creator support links (supportlinks.ts): the "Support this creator" row is INFERRED from video
 * descriptions — allowlisted third-party platforms only, normalised to the creator's profile page,
 * promoted to the channel once the link recurs across its videos (MIN_VIDEOS, or every video of a
 * smaller channel). Unit-level on the extractor, then end-to-end through the real scan + getChannel.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempEnv, writeChannelVideo } from './helpers';

const env = tempEnv();
const { extractSupportLinks, parseSupportLinks, MIN_VIDEOS } = await import('../src/lib/server/supportlinks');
const { scan } = await import('../src/lib/server/indexer');
const { addLibrary } = await import('../src/lib/server/libraries');
const { getChannel, channelSupportLinks } = await import('../src/lib/server/queries');
const { createUser } = await import('../src/lib/server/auth');
const { db } = await import('../src/lib/server/db');

const urls = (text: string) => extractSupportLinks(text).map((l) => l.url);

describe('extractSupportLinks', () => {
	it('keeps the creator tip jar and ignores the sponsor link in the same description (a real sidecar)', () => {
		const desc =
			'Protect your data with Incogni: http://incogni.com/houseofel\n\n' +
			'Support the channel: https://ko-fi.com/houseofel\n\nMusic by …';
		expect(extractSupportLinks(desc)).toEqual([{ platform: 'kofi', label: 'Ko-fi', url: 'https://ko-fi.com/houseofel' }]);
	});

	it('normalises Patreon to the profile: post links drop, /c/ /join/ and bare slugs resolve, punctuation is trimmed', () => {
		expect(urls('Early access: https://www.patreon.com/posts/my-video-12345')).toEqual([]);
		expect(urls('patreon.com/creatorx!')).toEqual(['https://www.patreon.com/creatorx']);
		expect(urls('https://www.patreon.com/c/creatorx/membership')).toEqual(['https://www.patreon.com/c/creatorx']);
		expect(urls('https://patreon.com/join/creatorx')).toEqual(['https://www.patreon.com/c/creatorx']);
		expect(urls('https://www.patreon.com/user?u=12345678')).toEqual(['https://www.patreon.com/user?u=12345678']);
		expect(urls('https://www.patreon.com/login')).toEqual([]);
	});

	it('dedupes spellings of one account and counts a repeated link once', () => {
		expect(urls('patreon.com/CreatorX … later https://www.patreon.com/creatorx/ and PATREON.COM/creatorx?utm=x')).toEqual([
			'https://www.patreon.com/CreatorX'
		]);
	});

	it('drops Ko-fi shop items/posts but keeps profile sub-pages', () => {
		expect(urls('ko-fi.com/s/abc123')).toEqual([]);
		expect(urls('https://ko-fi.com/post/Thanks-everyone-A1B2C3')).toEqual([]);
		expect(urls('https://ko-fi.com/creatorx/tiers')).toEqual(['https://ko-fi.com/creatorx']);
	});

	it('covers the rest of the allowlist and only the sponsors path on github', () => {
		const desc = [
			'buymeacoffee.com/creatorx',
			'https://paypal.me/creatorx/5',
			'https://www.paypal.com/donate?hosted_button_id=ABCDEF123456',
			'https://github.com/sponsors/creatorx',
			'https://github.com/creatorx/some-repo',
			'https://liberapay.com/creatorx/donate',
			'https://opencollective.com/creatorx',
			'https://en.tipeee.com/creatorx',
			'https://subscribestar.com/creatorx'
		].join('\n');
		expect(urls(desc)).toEqual([
			'https://buymeacoffee.com/creatorx',
			'https://paypal.me/creatorx',
			'https://www.paypal.com/donate?hosted_button_id=ABCDEF123456',
			'https://github.com/sponsors/creatorx',
			'https://liberapay.com/creatorx',
			'https://opencollective.com/creatorx',
			'https://tipeee.com/creatorx',
			'https://subscribestar.com/creatorx'
		]);
	});

	it('never matches platform-native tipping, look-alike hosts or non-creator pages', () => {
		expect(urls('Join: https://www.youtube.com/channel/UC123/join · Super Thanks below!')).toEqual([]);
		expect(urls('notpatreon.com/x and fakeko-fi.com/y')).toEqual([]);
		expect(urls('https://www.paypal.com/signin https://ko-fi.com/about')).toEqual([]);
		expect(extractSupportLinks(null)).toEqual([]);
	});

	it("never matches a creator's own short link, however it is labelled (owner decision: hosts only)", () => {
		expect(urls('👋 Support Undecided on Patreon!\nhttps://undecided.link/patreon')).toEqual([]);
		expect(urls('https://creator.link/ko-fi/ and https://creator.link/BMC')).toEqual([]);
	});

	it('parseSupportLinks tolerates NULL and garbage rows', () => {
		expect(parseSupportLinks(null)).toEqual([]);
		expect(parseSupportLinks('nope')).toEqual([]);
		expect(parseSupportLinks('[{"platform":"x","label":"X","url":"javascript:alert(1)"}]')).toEqual([]);
		expect(parseSupportLinks('[{"platform":"kofi","label":"Ko-fi","url":"https://ko-fi.com/a"}]')).toHaveLength(1);
	});
});

describe('per-channel promotion through the scan', () => {
	let uid = 0;
	const kofi = (s: string) => `Support me: https://ko-fi.com/${s}`;
	const patreon = (s: string) => `Become a patron: patreon.com/${s}`;

	beforeAll(async () => {
		uid = (await createUser('owner', 'pw123456')).id;
		// Alpha: Ko-fi in 3 of 4 videos; the 4th is a collaboration whose only link is the GUEST's Patreon.
		for (let i = 1; i <= 3; i++) writeChannelVideo(env.mediaRoot, 'Alpha', `a${i}`, { description: kofi('alpha') });
		writeChannelVideo(env.mediaRoot, 'Alpha', 'a4', { description: `With a guest — ${patreon('guest')}` });
		// Beta: a tiny channel (2 videos) — the link must be in EVERY video (threshold = min(MIN_VIDEOS, total)).
		writeChannelVideo(env.mediaRoot, 'Beta', 'b1', { description: patreon('beta') });
		writeChannelVideo(env.mediaRoot, 'Beta', 'b2', { description: patreon('beta') + ' ' + kofi('beta') });
		// Gamma: no links at all.
		for (let i = 1; i <= 3; i++) writeChannelVideo(env.mediaRoot, 'Gamma', `g${i}`, { description: 'plain' });
		// Delta: Patreon in 5, Ko-fi in 3, PayPal in 1 → Patreon first, PayPal never.
		for (let i = 1; i <= 5; i++) {
			const d = [patreon('delta'), i <= 3 ? kofi('delta') : '', i === 1 ? 'paypal.me/delta' : ''].join('\n');
			writeChannelVideo(env.mediaRoot, 'Delta', `d${i}`, { description: d });
		}
		// Meta: ONE video with no links + a channel-level metafile (yt-dlp's playlist metafile: `_type:
		// 'playlist'`, no media sibling) whose description is the channel's About text — the Undecided
		// case ("you can do so at https://www.patreon.com/mattferrell."). No recurrence needed.
		writeChannelVideo(env.mediaRoot, 'Meta', 'm1', { description: 'Sponsor: https://eightsleep.com/x' });
		writeFileSync(
			path.join(env.mediaRoot, 'Meta', 'Meta - Videos [UCmeta].info.json'),
			JSON.stringify({ id: 'UCmeta', _type: 'playlist', title: 'Meta - Videos', channel: 'Meta', description: "If you'd like to support the channel, you can do so at https://www.patreon.com/mattferrell.\n\nGet in touch: https://example.com/contact", entries: [] })
		);
		// Nfo: a Kodi/Jellyfin tvshow.nfo at the channel root whose <plot> carries the link.
		for (let i = 1; i <= 2; i++) writeChannelVideo(env.mediaRoot, 'Nfo', `n${i}`, { description: 'plain' });
		mkdirSync(path.join(env.mediaRoot, 'Nfo'), { recursive: true });
		writeFileSync(path.join(env.mediaRoot, 'Nfo', 'tvshow.nfo'), '<tvshow><title>Nfo</title><plot>Support me on https://ko-fi.com/nfo</plot></tvshow>');
		// Echo: the channel description names one Patreon page, the videos another → ONE chip, the channel's.
		for (let i = 1; i <= 3; i++) writeChannelVideo(env.mediaRoot, 'Echo', `e${i}`, { description: 'https://www.patreon.com/echo' });
		writeFileSync(path.join(env.mediaRoot, 'Echo', 'Echo [UCecho].info.json'), JSON.stringify({ id: 'UCecho', _type: 'playlist', description: 'patreon.com/echo-official' }));
		addLibrary('Chans', '', 'channels', false);
		await scan();
	});

	it("promotes links from the channel's own description (metafile or tvshow.nfo plot) without recurrence", () => {
		const meta = getChannel('Meta', uid)!;
		expect(meta.channel.supportLinks).toEqual([{ platform: 'patreon', label: 'Patreon', url: 'https://www.patreon.com/mattferrell' }]);
		expect(meta.channel.description).toMatch(/^If you'd like to support/);
		expect(meta.channel.video_count).toBe(1); // the metafile is never indexed as a video
		expect(channelSupportLinks('Nfo').map((l) => l.url)).toEqual(['https://ko-fi.com/nfo']);
	});

	it("the channel's own statement outranks the videos' link for the same platform (one chip)", () => {
		expect(channelSupportLinks('Echo').map((l) => l.url)).toEqual(['https://www.patreon.com/echo-official']);
	});

	it('promotes a recurring link and drops a one-off guest link', () => {
		expect(getChannel('Alpha', uid)!.channel.supportLinks).toEqual([
			{ platform: 'kofi', label: 'Ko-fi', url: 'https://ko-fi.com/alpha' }
		]);
	});

	it('a smaller channel needs the link in every video', () => {
		expect(MIN_VIDEOS).toBe(3);
		expect(channelSupportLinks('Beta').map((l) => l.url)).toEqual(['https://www.patreon.com/beta']); // Ko-fi only in 1 of 2
	});

	it('a channel without links carries none (NULL column, empty array on read)', () => {
		expect(getChannel('Gamma', uid)!.channel.supportLinks).toEqual([]);
		expect((db().prepare('SELECT support_links FROM channels WHERE id = ?').get('Gamma') as { support_links: unknown }).support_links).toBeNull();
	});

	it('orders by recurrence and never leaks the raw column into the channel object', () => {
		const data = getChannel('Delta', uid)!;
		expect(data.channel.supportLinks!.map((l) => l.platform)).toEqual(['patreon', 'kofi']);
		expect('support_links' in data.channel).toBe(false);
	});

	it('a rescan after the description changes re-aggregates (links are never sticky)', async () => {
		for (let i = 1; i <= 3; i++) writeChannelVideo(env.mediaRoot, 'Alpha', `a${i}`, { description: 'links removed' });
		await scan(true);
		expect(getChannel('Alpha', uid)!.channel.supportLinks).toEqual([]);
	});
});
