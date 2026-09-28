---
title: Troubleshooting
description: Symptoms, causes and fixes.
sidebar: { order: 2 }
---

| Symptom | Cause and fix |
| --- | --- |
| Library added, nothing appears | Open the library row. A *missing* badge means the folder is not visible inside the container: check the volume mapping. No badge: the files lack sidecars (`.info.json` or `.nfo`), or the format does not match the layout. The About page (owner block) shows the last scan and any error. |
| Direct play works, transcodes fail | Usually the transcode folder cannot be written. The server answers 503 "transcode storage unavailable" and logs the reason once a minute. Check the mapping and free space; on Unraid, check the share's *Minimum free space*, which refuses new files when set above what the pool can honour. |
| "Try again shortly" on playback | All transcode slots are busy (503 with a retry hint), or a cold transcode took longer than 45 seconds for its first segment. Raise `HLS_MAX_SESSIONS` only if the About page shows the encoder keeping up; otherwise it is the host that needs help (a GPU, or faster storage). |
| About says hardware acceleration was requested but not found | `/dev/dri` is not passed into the container, or the host has no Intel or AMD GPU. Run `docker exec mytview vainfo`; it should list an iHD driver. Until then encodes run on the CPU, with the limit lowered to 3. |
| Log says "encoding at 0.6× real time, continuing at 1280×720" | The host cannot encode that file at full resolution in real time; the adaptive downscale did its job. A GPU removes it. |
| Nine seconds to the first frame, then fine | Spun-down disks behind a network share. Adjust spin-down on the storage side or keep the library on always-on disks; the server is not the bottleneck. |
| Container restarts immediately on an older image | A blank `ORIGIN` (many deployment UIs pass blank fields as empty strings). Upgrade to 0.4.10 or later, or remove the variable. |
| Library vanished after a share was unmounted | An incremental scan refuses to prune in that situation and logs a warning; a *full* rescan or a library edit does not. Remount, then rescan, and watch state comes back with the items. |
| Video stops mid-way with "can't play" | Often an expired session rather than a media problem; the web player checks and sends you to login. In the apps, sign in again. |
| A subtitle track is missing | Bitmap formats (PGS, VobSub) are not offered, and the log names the skipped track. Text tracks in a brand-new file may appear only from the second view. |
| Federated video will not play | The sharer is unreachable from this device (a 503 "peer server unreachable", or the card in the web player), or its stream cap is reached (429). Browsing keeps working. If the sharer is http-only, Apple devices and https pages refuse the stream. |
| Login says "too many attempts" for everyone | Behind a proxy without `ADDRESS_HEADER`, all clients share one rate-limit bucket. Set it. |
| Owner locked out | `docker exec -it mytview node scripts/set-password.mjs <username>`. See [Accounts](/docs/configuration/accounts/). |

Something not covered? The server logs are terse and specific; `docker logs mytview` is the first
thing to look at, and an issue on the
[server repository](https://github.com/mytview/mytview-server/issues) is the second.
