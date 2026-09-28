---
title: Watching
description: What counts as watched, what is hidden where, autoplay, and how browsing, search, tags and related work.
sidebar: { order: 5 }
---

## What counts as watched

A video is watched once playback reaches its duration minus the smaller of 10% and 60 seconds, so a
20-minute video is done with 60 seconds left and a 4-minute one with 24. With an unknown duration it
is watched at the end. Resume is offered when the position is beyond 5 seconds and before that
threshold. Watching a finished item again makes it in-progress from the new position and, on reaching
the threshold, watched again. The web player saves position every 15 seconds and when you leave; the
apps follow the same rules.

## What is hidden, where

| Page | Default | Reveal |
| --- | --- | --- |
| Recent feed, search, tag pages | watched videos hidden | *show watched* adds them back |
| Channels and shows grid | fully watched channels and shows dropped; empty channels stay | *show watched*, with a "N watched hidden" count |
| Channel page | watched videos hidden | *show watched* |
| Show page | every episode listed, watched ones marked; the server names the next unwatched episode in order | always visible |
| Movies wall | watched movies hidden | *show watched* |

A finished show leaves the grid until a new episode arrives, the same way a watched video leaves the
feed. When everything is watched, the feed says so rather than showing an empty page.

## Marking by hand

Every card has a watched toggle. Channel and show pages have **mark all watched** and its reverse.
Movie walls have neither, by design: each film is marked from its own card.

## Autoplay and up next

When a video ends, an up-next card counts down 8 seconds to the next item, with replay and cancel.
The next item is the top of the related list: in a show, the next episode in order, stopping after the
finale; in a channel, the closest match by tags topped up with recent unwatched videos. Movies never
chain. After three unattended advances the player asks whether you are still watching. Autoplay and
that count are per-person preferences, set in the apps' Settings screens; the web player honours them
but has no control of its own.

## Browsing

- **Grids** sort by name, recently updated, or most unwatched, with genre chips from the shows' `.nfo`
  files. **Movie walls** sort by title, year, or recently added, with genre chips. The sort and genre
  you choose are remembered per library, per person, on every device.
- **Search** (the header box) matches titles across everything you can see, minus hidden channels
  and, by default, watched items.
- **Tags** gather channel tags and categories plus movie genres. Show genres stay on the show.
- Libraries with *show in Recent* off remain fully present in search, tags and their own tab.
- **Related** shows eight items: the rest of a show in order; for movies, the same library ranked by
  shared genres, cast and collection then year; for channel videos, rare-tag overlap with the same
  channel down-weighted, watched ones excluded, topped up with recent unwatched.
