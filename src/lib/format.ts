/** Presentation helpers (ported from the original vanilla frontend). */

export function fmtDuration(sec?: number | null): string {
	if (sec == null) return '';
	sec = Math.round(sec);
	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	const s = sec % 60;
	const pad = (n: number) => String(n).padStart(2, '0');
	return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Compact SxE label for a series episode, e.g. "S1·E2" (or "E2"/"S1" when only one is known).
 *  Null when neither number is present — i.e. this isn't a series episode. */
export function fmtEpisode(season?: number | null, episode?: number | null): string | null {
	if (season == null && episode == null) return null;
	const s = season != null ? `S${season}` : '';
	const e = episode != null ? `E${episode}` : '';
	return s && e ? `${s}·${e}` : s || e;
}

export function fmtViews(n?: number | null): string {
	if (n == null) return '—';
	if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
	if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
	return String(n);
}

function dateFrom(ts?: number | null, uploadDate?: string | null): Date | null {
	if (ts) return new Date(ts * 1000);
	if (uploadDate && uploadDate.length === 8) {
		return new Date(
			`${uploadDate.slice(0, 4)}-${uploadDate.slice(4, 6)}-${uploadDate.slice(6, 8)}`
		);
	}
	return null;
}

export function fmtDate(ts?: number | null, uploadDate?: string | null): string {
	const d = dateFrom(ts, uploadDate);
	if (!d || isNaN(+d)) return '—';
	return d.toISOString().slice(0, 10);
}

/**
 * Human-friendly recency for the video page's rails: "5 mins ago", "3 hours ago", "1 day ago",
 * "2 weeks ago"… A real `timestamp` resolves down to minutes; a day-only `upload_date` cannot, so
 * anything inside the last day reads "today". Empty when the item carries no date at all, and a
 * timestamp slightly in the future (clock skew between the library host and this one) is "just now".
 * `now` is injectable for tests.
 */
export function fmtAgo(ts?: number | null, uploadDate?: string | null, now = Date.now()): string {
	const d = dateFrom(ts, uploadDate);
	if (!d || isNaN(+d)) return '';
	const secs = Math.floor((now - +d) / 1000);
	const ago = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;
	const days = Math.floor(secs / 86400);
	if (days < 1) {
		if (!ts) return 'today';
		if (secs < 60) return 'just now';
		if (secs < 3600) return ago(Math.floor(secs / 60), 'min');
		return ago(Math.floor(secs / 3600), 'hour');
	}
	if (days < 7) return ago(days, 'day');
	if (days < 30) return ago(Math.floor(days / 7), 'week');
	if (days < 365) return ago(Math.floor(days / 30), 'month');
	return ago(Math.floor(days / 365), 'year');
}

/** Season heading for a show page's sections: "Season 2", "Specials" for season 0 (the Kodi/Emby
 *  convention), and "Other episodes" for files that carry no season number at all. */
export function fmtSeason(season?: number | null): string {
	if (season == null) return 'Other episodes';
	return season === 0 ? 'Specials' : `Season ${season}`;
}

export function relDate(ts?: number | null, uploadDate?: string | null): string {
	const d = dateFrom(ts, uploadDate);
	if (!d || isNaN(+d)) return '';
	const days = Math.floor((Date.now() - +d) / 86400000);
	if (days < 1) return 'today';
	if (days < 30) return `${days}d ago`;
	if (days < 365) return `${Math.floor(days / 30)}mo ago`;
	return `${Math.floor(days / 365)}y ago`;
}
