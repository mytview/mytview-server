---
title: Environment variables
description: Every variable the server reads, with defaults.
sidebar: { order: 1 }
---

Container paths are baked into the image (`/media`, `/data`, `/transcodes`, port 8700), so a plain
install sets nothing. A blank value counts as unset (from 0.4.10).

| Variable | Default | Meaning |
| --- | --- | --- |
| `ALLOW_SIGNUP` | `invite` | `invite`, `all` or `off`. See [Accounts](/docs/configuration/accounts/). |
| `ALLOW_INVITES` | `owner` | `owner` or `all`. |
| `SCAN_ON_START` | `true` | Scan when the server starts. |
| `SCAN_INTERVAL` | `5` | Minutes between incremental rescans; `0` disables. |
| `TRANSCODE_HWACCEL` | `0` | `1` = Intel VAAPI encoding (needs `/dev/dri`; amd64 only). Falls back to CPU by itself. |
| `HLS_DIR` | `/transcodes/hls` | Segment scratch. `off` disables live transcoding. |
| `HLS_MAX_SESSIONS` | `3`, `6` with a working GPU | Simultaneous encodes. |
| `HLS_MAX_COPY_SESSIONS` | `4` | Simultaneous remuxes (no encoder), including app downloads. |
| `HLS_IDLE_SEC` | `60` | Seconds without a request before the encoder is stopped (the session survives for resume). |
| `HLS_SESSION_TTL` | `1800` | Seconds before an idle session and its segments are removed. |
| `HLS_SEGMENT_SEC` | `4` | Segment length. |
| `HLS_SESSION_MAX_SEG` | `40` | Segments kept behind the play head. |
| `HLS_AHEAD_SEG` | `30` | How far ahead of the play head the encoder runs before pausing. |
| `PREFER_HLS_TEXT_STREAMS` | `8` | Files with more embedded subtitle tracks than this are hinted to the apps to start on HLS; `0` never. |
| `EMBEDDED_SUBS` | `1` | `off` stops extracting subtitle tracks from containers. |
| `SUBS_CACHE_DIR` | `/transcodes/subcache` | Extracted subtitles. `off` keeps them in memory only. |
| `IMAGE_CACHE_DIR` | `/transcodes/imgcache` | Resized artwork. `off` serves originals. |
| `ORIGIN` | unset | Public URL, only behind a reverse proxy. See [Behind a reverse proxy](/docs/configuration/reverse-proxy/). |
| `ADDRESS_HEADER`, `XFF_DEPTH`, `PROTOCOL_HEADER`, `HOST_HEADER` | unset, `1` | Reverse proxy headers. See [Behind a reverse proxy](/docs/configuration/reverse-proxy/). |
| `KEEP_ALIVE_TIMEOUT`, `HEADERS_TIMEOUT` | `65`, `66` | Idle connection timeouts, in seconds. |
| `EXTERNAL_URL` | unset | Federation only: the address other servers' viewers reach you at, if it cannot be derived. Overrides the in-app setting. |
| `MEDIA_URL_SECRET` | generated | Signs media links for the apps and federation; changing it invalidates every signed link in flight. |
| `MEDIA_ROOT`, `DB_PATH`, `TRANSCODE_DIR`, `PORT`, `HOST` | baked in | Container paths and bind address. Change the volume mappings, not these. |
