/**
 * Creator support links — the "Support this creator" row (web pages only, see below).
 *
 * A creator's tip jar / membership page is something they advertise THEMSELVES, in their own video
 * descriptions ("Support the channel: ko-fi.com/…"). The sidecar carries no structured field for it
 * (upstream closed "extract the channel's About-page links" as out of scope), so the links are
 * INFERRED from the description text at scan time and aggregated per channel. Rules (owner decisions
 * 2026-10-27):
 *
 *  - ALLOWLIST of third-party support platforms, nothing else. Sponsor URLs in the same description
 *    (VPNs, "use code …") never match. Platform-native tipping on the source site (Super Thanks /
 *    channel memberships) is deliberately EXCLUDED: a 30% platform cut, and it is a button on the
 *    source page, not a link we could carry — the existing "source ↗" link already leads there.
 *  - Normalised to the creator's PROFILE page: "watch it early on Patreon" post links, Ko-fi shop
 *    items and the like either collapse to the creator slug or are dropped. ONE chip per platform,
 *    however many spellings the descriptions use (a direct profile beats a redirect).
 *  - The channel's OWN description (channels.description — a channel metafile's About text or a
 *    tvshow.nfo <plot>, when the library carries one) states its links outright: those are promoted
 *    with no recurrence threshold. What is NOT matched, by owner decision (2026-10-27): a creator's
 *    short link on their own domain (undecided.link/patreon) — partial-URL matching is too brittle;
 *    only an allowlisted HOST counts.
 *  - RECURRENCE threshold: a link is promoted to the channel only once it appears in MIN_VIDEOS of
 *    the channel's videos (or in every video of a smaller channel). A one-off link in a collaboration
 *    belongs to the guest, not the channel.
 *  - Re-aggregated over the WHOLE channel after every scan (and after a federation sync, since
 *    mirrored descriptions count too): the threshold is a channel-level fact, so an incremental scan
 *    can't maintain it per video. The LIKE prefilter keeps the pass to the few rows that mention a
 *    listed host at all.
 *  - WEB-ONLY presentation (matrix §Sharing): Apple TV has no browser, and an external payment link
 *    inside a handheld media app invites an in-app-purchase steering argument at review. The field
 *    still ships on the channel descriptor so the DECISION (what counts, which platforms, the
 *    threshold) lives server-side; natives simply render nothing for now.
 *
 * Nothing is fetched, nothing is tracked: a link is a `<a target="_blank">` to a page the creator
 * published, and MytView never sees whether anyone clicked it.
 */
import type Database from 'better-sqlite3';
import type { SupportLink } from '$lib/types';

/** A link must recur in this many of the channel's videos (or in ALL of them for a smaller channel). */
export const MIN_VIDEOS = 3;
/** Promoted links per channel, most-recurring first. */
export const MAX_LINKS = 6;

interface Platform {
	/** Stable key on the wire (`SupportLink.platform`). */
	platform: string;
	/** Display name — the chip text. */
	label: string;
	/** Registrable domains matched (any subdomain, case-insensitive). */
	hosts: string[];
	/** Canonical profile URL + dedupe key for a parsed URL on one of `hosts`, or null to drop it. */
	resolve: (u: URL, segs: string[]) => { key: string; url: string } | null;
}

const SLUG = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const slug = (s: string | undefined, reserved: Set<string>): string | null =>
	s && SLUG.test(s) && !reserved.has(s.toLowerCase()) ? s : null;
const profile = (url: string, key: string) => ({ key: key.toLowerCase(), url });

// First path segments that are site pages, not creator slugs. A false negative here only hides a
// link; a false positive would advertise e.g. "patreon.com/login" as a creator page.
const PATREON_PAGES = new Set([
	'posts', 'c', 'cw', 'user', 'join', 'bepatron', 'login', 'home', 'create', 'explore', 'checkout',
	'search', 'settings', 'about', 'policy', 'pricing', 'product', 'blog', 'apps', 'press', 'careers',
	'hc', 'm', 'api', 'oauth2', 'messages', 'notifications', 'dashboard', 'creator-home', 'edit',
	'download', 'invoice', 'member', 'membership', 'community', 'help', 'terms', 'privacy', 'sitemap',
	'signup', 'logout', 'notes', 'collection', 'collections', 'shop', 'feed', 'rss', 'new', 'teams',
	'store', 'legal', 'brand', 'podcasts', 'video', 'features'
]);
const KOFI_PAGES = new Set([
	's', 'post', 'home', 'explore', 'about', 'gold', 'manage', 'art', 'login', 'signup', 'account',
	'help', 'discover', 'memberships', 'shop', 'commissions', 'goals', 'faq', 'terms', 'privacy',
	'summary', 'settings', 'blog', 'c', 'i', 'album', 'stream', 'legal', 'press', 'go', 'app'
]);
const BMC_PAGES = new Set([
	'login', 'signup', 'explore', 'pricing', 'about', 'help', 'blog', 'api', 'terms', 'privacy', 'faq',
	'support', 'features', 'creators', 'dashboard', 'extras', 'membership', 'commissions', 'posts',
	'shop', 'e', 'app', 'brand', 'press', 'legal', 'search', 'discover', 'wishlist'
]);
const LIBERAPAY_PAGES = new Set(['about', 'explore', 'search', 'sign-in', 'sign-up', 'for', 'assets', 'admin', 'callbacks']);
const OC_PAGES = new Set([
	'discover', 'search', 'signin', 'create', 'pricing', 'help', 'about', 'blog', 'become-a-sponsor',
	'how-it-works', 'fiscal-hosting', 'home', 'dashboard', 'embed', 'redirect', 'contribute', 'collectives'
]);
const TIPEEE_PAGES = new Set(['login', 'signup', 'about', 'faq', 'search', 'explore', 'help', 'blog', 'team', 'terms', 'privacy', 'cgu', 'news', 'contact', 'api']);
const SUBSCRIBESTAR_PAGES = new Set(['login', 'signup', 'about', 'pricing', 'blog', 'faq', 'terms', 'privacy', 'explore', 'support', 'help', 'posts', 'api', 'legal', 'search']);

export const PLATFORMS: Platform[] = [
	{
		platform: 'patreon',
		label: 'Patreon',
		hosts: ['patreon.com'],
		resolve(u, [a, b]) {
			// /user?u=123 and /bePatron?u=123 — profiles with no vanity slug; keyed by the numeric id.
			if ((a === 'user' || a?.toLowerCase() === 'bepatron') && /^\d{1,12}$/.test(u.searchParams.get('u') ?? '')) {
				const id = u.searchParams.get('u')!;
				return profile(`https://www.patreon.com/user?u=${id}`, `user:${id}`);
			}
			// /c/<slug> (current), /cw/<slug>, /join/<slug> → the same creator as /<slug>.
			if (a === 'c' || a === 'cw' || a === 'join') {
				const s = slug(b, PATREON_PAGES);
				return s ? profile(`https://www.patreon.com/c/${s}`, s) : null;
			}
			const s = slug(a, PATREON_PAGES);
			return s ? profile(`https://www.patreon.com/${s}`, s) : null; // /posts/… drops here (reserved)
		}
	},
	{
		platform: 'kofi',
		label: 'Ko-fi',
		hosts: ['ko-fi.com'],
		resolve(_u, [a]) {
			const s = slug(a, KOFI_PAGES); // /s/<shop item> and /post/<…> drop (reserved)
			return s ? profile(`https://ko-fi.com/${s}`, s) : null;
		}
	},
	{
		platform: 'buymeacoffee',
		label: 'Buy Me a Coffee',
		hosts: ['buymeacoffee.com', 'bmc.link'],
		resolve(_u, [a]) {
			const s = slug(a, BMC_PAGES);
			return s ? profile(`https://buymeacoffee.com/${s}`, s) : null;
		}
	},
	{
		platform: 'paypal',
		label: 'PayPal',
		hosts: ['paypal.me', 'paypal.com'],
		resolve(u, segs) {
			const host = u.hostname.toLowerCase();
			if (host === 'paypal.me' || host.endsWith('.paypal.me')) {
				const s = slug(segs[0], new Set()); // paypal.me/<slug>[/<amount>]
				return s ? profile(`https://paypal.me/${s}`, s) : null;
			}
			if (segs[0]?.toLowerCase() === 'paypalme') {
				const s = slug(segs[1], new Set());
				return s ? profile(`https://paypal.me/${s}`, s) : null;
			}
			// Hosted donate buttons: /donate?hosted_button_id=… or the legacy /cgi-bin/webscr?…&hosted_button_id=…
			const btn = u.searchParams.get('hosted_button_id');
			if (btn && /^[A-Za-z0-9]{6,32}$/.test(btn) && (segs[0] === 'donate' || segs[0] === 'cgi-bin')) {
				return profile(`https://www.paypal.com/donate?hosted_button_id=${btn}`, `donate:${btn}`);
			}
			return null; // any other paypal.com page (sign-in, help…) is not a creator link
		}
	},
	{
		platform: 'liberapay',
		label: 'Liberapay',
		hosts: ['liberapay.com'],
		resolve(_u, [a]) {
			const s = slug(a, LIBERAPAY_PAGES);
			return s ? profile(`https://liberapay.com/${s}`, s) : null;
		}
	},
	{
		platform: 'github-sponsors',
		label: 'GitHub Sponsors',
		hosts: ['github.com'],
		resolve(_u, [a, b]) {
			if (a !== 'sponsors') return null; // only the sponsors page, never a repo link
			const s = slug(b, new Set());
			return s ? profile(`https://github.com/sponsors/${s}`, s) : null;
		}
	},
	{
		platform: 'opencollective',
		label: 'Open Collective',
		hosts: ['opencollective.com'],
		resolve(_u, [a]) {
			const s = slug(a, OC_PAGES);
			return s ? profile(`https://opencollective.com/${s}`, s) : null;
		}
	},
	{
		platform: 'tipeee',
		label: 'Tipeee',
		hosts: ['tipeee.com'],
		resolve(_u, [a]) {
			const s = slug(a, TIPEEE_PAGES);
			return s ? profile(`https://tipeee.com/${s}`, s) : null;
		}
	},
	{
		platform: 'subscribestar',
		label: 'SubscribeStar',
		hosts: ['subscribestar.com'],
		resolve(_u, [a]) {
			const s = slug(a, SUBSCRIBESTAR_PAGES);
			return s ? profile(`https://subscribestar.com/${s}`, s) : null;
		}
	}
];

const HOSTS = PLATFORMS.flatMap((p) => p.hosts);
// A listed host (any subdomain, with or without a scheme — descriptions often write bare
// "ko-fi.com/name") followed by its path/query up to whitespace or a bracket/quote. The lookbehind
// keeps "notpatreon.com" from matching as patreon.com.
const URL_RE = new RegExp(
	'(?<![A-Za-z0-9.-])(?:https?://)?(?:[A-Za-z0-9-]+\\.)*(?:' +
		HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|') +
		')(?:[/?#][^\\s<>"\'()\\[\\]{}]*)?',
	'gi'
);

function platformFor(hostname: string): Platform | null {
	const h = hostname.toLowerCase();
	for (const p of PLATFORMS) {
		if (p.hosts.some((d) => h === d || h.endsWith('.' + d))) return p;
	}
	return null;
}

/** Resolve one URL-ish token to a support link, or null when it isn't a creator profile. */
function resolveToken(token: string): (SupportLink & { key: string }) | null {
	const cleaned = token.replace(/[.,;:!?'"]+$/, ''); // sentence punctuation glued to the link
	let u: URL;
	try {
		u = new URL(/^https?:\/\//i.test(cleaned) ? cleaned : 'https://' + cleaned);
	} catch {
		return null;
	}
	const p = platformFor(u.hostname);
	if (!p) return null; // only an allowlisted host — never a look-alike or a creator-domain redirect
	const segs = u.pathname.split('/').filter(Boolean).map((s) => {
		try {
			return decodeURIComponent(s);
		} catch {
			return s;
		}
	});
	const r = p.resolve(u, segs);
	if (!r) return null;
	return { platform: p.platform, label: p.label, url: r.url, key: `${p.platform}:${r.key}` };
}

/** Every distinct support link a description advertises (one per platform account). Pure. */
export function extractSupportLinks(text: string | null | undefined): SupportLink[] {
	if (!text) return [];
	const seen = new Map<string, SupportLink>();
	for (const m of text.matchAll(URL_RE)) {
		const r = resolveToken(m[0]);
		if (r && !seen.has(r.key)) seen.set(r.key, { platform: r.platform, label: r.label, url: r.url });
	}
	return [...seen.values()];
}

/** The stored JSON → links; tolerant of NULL/garbage (index.db is disposable, never trust a row shape). */
export function parseSupportLinks(json: string | null | undefined): SupportLink[] {
	if (!json) return [];
	try {
		const parsed: unknown = JSON.parse(json);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(l): l is SupportLink =>
				!!l && typeof l === 'object' && typeof (l as SupportLink).platform === 'string' &&
				typeof (l as SupportLink).label === 'string' && /^https:\/\//.test(String((l as SupportLink).url))
		);
	} catch {
		return [];
	}
}

const tick = () => new Promise<void>((r) => setImmediate(r));
const CHUNK = 500;

/**
 * Re-aggregate `channels.support_links` from every video description in the index. Runs after a
 * scan and after a federation sync (both own rows in `videos`). Returns the number of channels that
 * ended up with at least one promoted link.
 */
export async function refreshSupportLinks(database: Database.Database): Promise<number> {
	// LIKE prefilter on the listed hosts (case-insensitive for ASCII by SQLite's default) — the regex
	// pass is the arbiter, this just keeps the sweep to the rows that could possibly match.
	const where = HOSTS.map((h) => `description LIKE '%${h}%'`).join(' OR ');
	const rows = database
		.prepare(`SELECT channel_id, description FROM videos WHERE ${where}`)
		.all() as { channel_id: string; description: string }[];
	// The channel's OWN description (when the library carries one) — its links need no recurrence.
	const chanRows = database
		.prepare(`SELECT id, description FROM channels WHERE description IS NOT NULL AND (${where})`)
		.all() as { id: string; description: string }[];
	const totals = new Map<string, number>(
		(database.prepare('SELECT id, video_count FROM channels').all() as { id: string; video_count: number }[]).map(
			(r) => [r.id, r.video_count]
		)
	);

	// channel → key → link + how many of its videos carry it (a description counts once per link).
	const counts = new Map<string, Map<string, { link: SupportLink; n: number; ord: number }>>();
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const links = extractSupportLinks(row.description);
		if (links.length) {
			let per = counts.get(row.channel_id);
			if (!per) counts.set(row.channel_id, (per = new Map()));
			for (const link of links) {
				const key = `${link.platform}:${link.url.toLowerCase()}`;
				const cur = per.get(key);
				if (cur) cur.n++;
				else per.set(key, { link, n: 1, ord: PLATFORMS.findIndex((p) => p.platform === link.platform) });
			}
		}
		if ((i + 1) % CHUNK === 0) await tick(); // the regex pass is sync — don't stall requests mid-scan
	}

	const STATED = Number.MAX_SAFE_INTEGER; // "the channel itself says so" outranks any recurrence count
	for (const row of chanRows) {
		const links = extractSupportLinks(row.description);
		if (!links.length) continue;
		let per = counts.get(row.id);
		if (!per) counts.set(row.id, (per = new Map()));
		for (const link of links) {
			const key = `${link.platform}:${link.url.toLowerCase()}`;
			per.set(key, { link, n: STATED, ord: PLATFORMS.findIndex((p) => p.platform === link.platform) });
		}
	}

	const promoted = new Map<string, SupportLink[]>();
	for (const [cid, per] of counts) {
		const total = totals.get(cid) ?? 0;
		if (total <= 0) continue;
		const needed = Math.min(MIN_VIDEOS, total);
		// One chip per platform: the channel's own statement first, then most-recurring, then the
		// allowlist's order (a creator who links both paypal.me and a donate button gets ONE PayPal chip).
		const seenPlatform = new Set<string>();
		const links = [...per.values()]
			.filter((e) => e.n >= needed)
			.sort((a, b) => b.n - a.n || a.ord - b.ord)
			.filter((e) => !seenPlatform.has(e.link.platform) && !!seenPlatform.add(e.link.platform))
			.slice(0, MAX_LINKS)
			.map((e) => e.link);
		if (links.length) promoted.set(cid, links);
	}

	const clear = database.prepare('UPDATE channels SET support_links = NULL WHERE support_links IS NOT NULL');
	const set = database.prepare('UPDATE channels SET support_links = ? WHERE id = ?');
	database.transaction(() => {
		clear.run();
		for (const [cid, links] of promoted) set.run(JSON.stringify(links), cid);
	})();
	return promoted.size;
}
