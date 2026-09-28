---
title: How MytView thinks
description: The six rules behind every other setting.
sidebar: { order: 1 }
---

Decisions such as when a video counts as watched, what shows in the feed, or when a file is
transcoded are made by the server, once, so the web player and every app give the same answer. Six
rules explain most of what follows.

- **Your library is read-only.** MytView never creates, renames, moves or deletes anything in it.
  Whatever tool produces the files owns that folder tree; MytView reads the videos and the metadata
  sidecars next to them and keeps its own state elsewhere.
- **Two kinds of state, one folder.** `/data` holds a disposable index (rebuilt from disk by every scan)
  and a durable database with accounts, sessions, watch state and settings. Back up `/data`; nothing
  else is yours to lose.
- **Libraries are explicit.** Nothing is indexed until the owner adds a library: a folder plus a
  format. A mount can hold several kinds of content, each in its own library.
- **Everything is per person.** Each account has its own watch history, resume points, subtitle
  preferences, hidden channels and browsing settings, and they follow the person to every device.
- **The server decides, the clients render.** Watched thresholds, feed ordering, what is hidden,
  whether a file needs transcoding, what plays next: one answer, computed on the server, so a phone, a
  TV and a browser never disagree.
- **Direct play first.** A device that can decode the file gets the file. Only a real failure to
  decode triggers a live transcode, and nothing is ever converted ahead of time or stored.
