---
title: Playback and transcoding
description: Direct play first, live HLS when needed, hardware encoding, limits, and how to read the About page.
sidebar: { order: 6 }
---

## Direct play, then live HLS

The player asks for the original file first, streamed with range requests. If the device reports a
genuine decode failure at the start, the player switches to a live HLS transcode of the same file,
without a prompt. A failure that appears after playback has started is first treated as a bad patch
(skip ahead a couple of seconds, a few times) before falling back.

The web player starts on HLS in two cases where no error would ever fire: `.mkv` containers, and audio
codecs Chrome plays silently (AC-3, E-AC-3, DTS, TrueHD). The apps make the same call from a hint the
server sends with every video, including one for containers with many embedded subtitle tracks, which
some TVs choke on when direct-playing.

## What the transcoder does

- One rendition at the source resolution, segments of 4 seconds, started in a few seconds, and nothing
  kept: segments live under `/transcodes/hls` only while someone is watching, are removed after a
  minute of no requests (the session itself survives a pause for 30 minutes), and any leftovers are
  swept at start-up.
- Where the codecs allow it (H.264 or HEVC video with AAC, AC-3, E-AC-3 or MP3 audio), it is a
  **remux**, a copy into a new container with no re-encoding and no quality loss. This is also what
  the apps' offline downloads use.
- Otherwise it **encodes**, on the Intel GPU when `TRANSCODE_HWACCEL=1` and `/dev/dri` is passed in
  ([setup](/docs/install/#hardware-transcoding)), else on the CPU. HDR is tone-mapped. If the GPU path
  fails once, the server switches to the CPU for the rest of its run and says so on the About page.
- **Adaptive downscale:** after ten seconds of measuring, an encode that cannot keep up with real time
  steps down to 1080p, then 720p, mid-stream, and the verdict is remembered per file so the next viewer
  starts at the right size. Downloads never downscale.
- **Limits:** 3 simultaneous encodes on the CPU, 6 with a working GPU, and 4 remuxes, each adjustable.
  Beyond the limit a viewer gets a "try again shortly" (an HTTP 503 with a retry hint) rather than a
  degraded stream for everyone; viewers already playing are never cut.
- Choosing a non-default audio track forces HLS, since the original file cannot be re-muxed on the fly
  in the browser; choosing the default track returns to direct play.

Set `HLS_DIR=off` to disable live transcoding altogether: files then play only where the device can
decode them, the player says so honestly, and audio-track switching is hidden.

## Reading the About page

**Avatar menu → About**

Every user sees how this server plays: direct play (always), live transcoding on or off, hardware
acceleration on the GPU, on the CPU, or "requested but no usable GPU was found", the artwork cache,
and Plex sync. The owner also sees the ffmpeg version, the encoder slots in use, whether the GPU
device is present, federation counts and the last scan. On the host, `docker exec mytview vainfo`
lists the GPU driver the container can see.

## Artwork

Thumbnails and posters are resized on the server for cards, prepared in the background after each
scan and cached under `/transcodes/imgcache`. When the cache is busy, the original is served instead
of making anyone wait. `IMAGE_CACHE_DIR=off` serves originals only.
