---
title: Subtitles and audio
description: Sidecar naming, embedded track extraction, per-person caption preferences, and audio track switching.
sidebar: { order: 7 }
---

## Sidecar files

`.srt` and `.vtt` files next to the video are picked up by name: `Title.en.srt`,
`Title.eng.forced.srt`, `Title.en.sdh.srt`, `Title.pt-BR.vtt`. The markers `sdh`, `cc`, `hi` and
`hoh` mark captions; `forced` and `foreign` mark forced tracks. Everything is served as WebVTT,
captions listed first and forced tracks last.

## Embedded tracks

Text subtitles inside the container (SubRip, ASS/SSA, mov_text, WebVTT) are extracted on demand and
cached under `/transcodes/subcache`. Bitmap subtitles (PGS, VobSub) are not offered.
`EMBEDDED_SUBS=off` turns extraction off; sidecars still work. Extraction reads the whole file once,
so on slow network storage turning it off is a reasonable choice. A brand-new file may show one track
fewer on its very first view.

## Preferences

Captions are never on by default. Each person sets caption size (small, medium, large) and colour
(white, yellow) under Account, and those apply on every device. The web player remembers the language
you last picked in that browser.

## Audio tracks

A track menu appears when a file has two or more, labelled by the server ("English · 5.1 · AC3").
Picking a non-default track switches to a live transcode; see
[Playback and transcoding](/docs/configuration/playback/).
