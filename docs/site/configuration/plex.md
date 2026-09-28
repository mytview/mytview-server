---
title: Plex sync
description: Two-way watched and resume sync with a Plex server on the same files, per person.
sidebar: { order: 11 }
---

**Avatar menu → Account → Plex**

If a Plex Media Server serves the same files, MytView keeps watched flags and resume positions agreed
in both directions, per person, for Plex movie and show sections. Nothing else is synced: no
metadata, no playback, no libraries.

1. **Owner:** enter the Plex server address (for example `http://192.168.1.30:32400`); the page
   confirms the connection. Set the cadence (default every 5 minutes; 0 = manual only) and use *sync
   now* as needed. Counts of matched, unmatched and ambiguous items appear here, with a per-person
   status line.
2. **Each person:** *Link Plex account* shows a four-character code to enter at plex.tv/link, valid
   about 15 minutes; or paste a token. Linking resolves a server-scoped token, so accounts with shared
   access to the Plex server work. Managed Plex Home users cannot link.

**Matching** goes by tmdb, imdb and tvdb ids first, then Plex's legacy movie ids, then the tail of the
file path, and it must be unique both ways; anything ambiguous is listed rather than guessed.

**Merging** pulls the full state each cycle and compares it with the previous snapshot: a change on
one side is applied to the other, a change on both sides goes to the newer, and the very first sync
unions the watched lists so nothing is ever un-watched by setup. Small position differences are
ignored, positions under a minute are never pushed to Plex, and errors are shown per person and never
destructive.
