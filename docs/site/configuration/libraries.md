---
title: Libraries and formats
description: What each library format expects on disk, which metadata is read, and how scanning works.
sidebar: { order: 2 }
---

**Avatar menu → Server → Libraries** (owner only)

A library is a name, a format and a folder relative to the mounted media root (blank means the root
itself). Two libraries cannot share a folder, and a folder cannot be outside the mount. Each library
also carries two defaults: whether channels or shows that appear in it are **private by default** (off
by default, so new content is public), and whether its items **show in the Recent feed** (on by
default). The arrows set the order of the header tabs, the promoted tabs in the TV apps, the pickers
and the scan itself. Adding, editing or deleting a library starts a full rescan; deleting also removes
any federated content mapped into it.

Media files: `.mp4`, `.mkv`, `.webm`, `.m4v`. Images: `.jpg`, `.jpeg`, `.png`, `.webp`. Artwork files
named `poster.*` and `fanart.*` (or `banner.jpg`) are recognised in channel, show and movie folders.

## Channels

For creator archives: each immediate subfolder of the library is a channel, keyed by its folder name.
A video is any media file with a sidecar of the same base name ending in `.info.json`, at any depth.
From the sidecar MytView reads the id, title, description, upload date and timestamp, duration, view
and like counts, resolution and frame rate, codecs, tags and categories (merged), chapters and the
original page URL; for the channel, its display name, URL, id and follower count.

A thumbnail is matched case-insensitively: `Title.jpg`, then `Title.mp4.jpg`, then `Title-thumb.jpg`
and similar, then a lone image in the folder. The channel's avatar and banner come from `poster.*` and
`fanart.*` in its folder; without a poster, the tile shows the newest video's thumbnail.

## Series

For TV shows in the Kodi/Emby layout: each immediate subfolder is a show, and every media file under
it, at any depth, is an episode, so season folders are welcome but not required. An optional
`tvshow.nfo` supplies the show title and genres (genres attach to the show and become the genre chips
on the grid). Each episode reads its own `.nfo` for title, season, episode, air date, plot, the tvdb
id and the stream details (resolution, codec, duration). Without an `.nfo`, season and episode come
from `SxxExx` in the filename and the title from what follows it, with quality tags stripped.

Show art is `poster.*`/`fanart.*` in the show folder; episode thumbnails match like channel
thumbnails. Date-coded numbering (a "season" that is a year and an "episode" in the hundreds) is
treated as a date and the show is listed by date.

:::note
A show folder that also contains `.info.json` sidecars is indexed as a channel, with the same ids it
would get in a channels library. Watch state survives moving such a folder between the two formats.
:::

## Movies

One poster wall per library. Each immediate subfolder is a movie (loose files in the root count too).
The main feature is the largest media file in the folder; files ending in `-trailer` or `-sample` are
skipped, and subfolders are ignored. Metadata comes from `movie.nfo` (or `Name.nfo`): title, year,
premiere date, plot, genres, runtime, collection, the top five cast members, directors, tmdb/imdb ids
and stream details. Without an `.nfo`, the title and year are parsed from `Name (Year)` or
scene-style `Name.2012.…` names.

Art is `poster.*`/`fanart.*` in the folder, or `Name-poster.*`/`Name-fanart.*`. On cards the fanart
fills the 16:9 slot and the 2:3 poster is used on the wall and the detail page. Genres become tags,
so genre browsing works everywhere; cast and collection feed the related list. Two folders with the
same tmdb or imdb id collide, and the last one scanned wins. "Recently added" uses the date the file
was first seen, not its modification time.

## How scanning works

- A scan runs at start-up and then every `SCAN_INTERVAL` minutes (default 5; 0 disables). It is
  incremental: a sidecar whose modification time is unchanged is skipped, and files that vanished are
  pruned. It runs in the background in small batches, so the site stays responsive.
- Libraries that have never been indexed are scanned first, and tabs appear as soon as a library has
  items, not when the whole scan ends. A rescan requested while one is running queues one follow-up
  rather than being dropped.
- Subtitle sidecars are rediscovered on every scan, expired share links are removed at its end, and
  card-size artwork variants are prepared after any scan that found something.
- **Rescan library** in the avatar menu (and pull-to-refresh in the apps) is incremental. **Full
  rescan** on the Server page, and **Scan now** on Libraries, re-read every file.
- **Safety valve:** an incremental scan that finds zero videos where the index holds some, the shape
  of an unmounted share, skips the prune and logs a warning instead of emptying your library. A *full*
  rescan does not have that guard, so do not run one while a mount is missing.
- To force a complete re-parse after a metadata change, stop the server, delete `index.db*` in
  `/data` (never `state.db`), and start it again. Owner choices about visibility survive that,
  because "have I seen this channel before" is kept in the durable database.
- Programmatic: `POST /api/scan` with a session cookie or a bearer token; `?full=1` is owner-only.

**Virtual libraries** have no folder: they are created from the Federation page to hold content
mapped from another server. Their format is inherited from the remote library and locked, and the
scanner never walks them.
