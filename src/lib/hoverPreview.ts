/**
 * The "play a preview when the pointer rests on a card" switch.
 *
 * Kept in the BROWSER, not on the account: it only means anything on a device with a pointer that
 * can hover, so a choice made on a laptop has no business following you to a phone or a TV. On by
 * default; `/account` has the checkbox. (Same `myt-view:` key prefix as the other per-browser
 * conveniences — see docs/brand-assets.md on why that prefix is never renamed.)
 */
const KEY = 'myt-view:hoverPreview';

export function hoverPreviewEnabled(): boolean {
	try {
		return localStorage.getItem(KEY) !== '0';
	} catch {
		return true; // storage blocked: fall back to the default
	}
}

export function setHoverPreview(on: boolean): void {
	try {
		localStorage.setItem(KEY, on ? '1' : '0');
	} catch {
		/* private mode: the choice just doesn't persist */
	}
}

/** True only where hovering is a real gesture (a mouse or trackpad) and the viewer hasn't asked the
 *  system for less motion. Touch screens report `hover: none`, so a tap never starts a preview. */
export function canHoverPreview(): boolean {
	if (typeof matchMedia === 'undefined') return false;
	return (
		matchMedia('(hover: hover) and (pointer: fine)').matches &&
		!matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}
