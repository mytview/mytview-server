---
title: Sharing and privacy
description: Channel visibility is access control; hide-from-my-feed is a personal filter. Which to use when.
sidebar: { order: 4 }
---

**Avatar menu → Server → Sharing** (owner only)

Two independent tools exist, and it matters which one you reach for.

## Channel visibility: access control

Every channel, show and movie collection is **public** (visible to every account) or **private**
(visible to the owner and to the people ticked next to it). This is real access control: a private
channel is missing from feeds, search, tags, related lists and counts for anyone not granted, and a
direct link to it, its videos, its artwork or its files answers 404. Share links are the one
deliberate exception: a share grants its single video to whoever holds the link.

The page is a grid, rows grouped by library (collapsed by default), one column per person and one per
federated server. Ticking **Priv** makes the row private; the person columns are only active on private
rows. Making a channel public again clears its grants.

Bulk controls sit on each column: *all*/*none* on the Priv column set everything private (keeping
grants) or public (which deletes every grant); *all*/*none* under a person grant or revoke every
currently private channel for them, as a one-off snapshot, not a rule for the future. Filters narrow
by name, private/public, or a single person. Changes save as you tick.

The per-library **private by default** setting applies once, the first time a channel is ever seen,
and never overrides a choice you made afterwards, even across index rebuilds.

## Hide from my feed: a personal filter

On any channel or show page, **hide from my feed** removes it from your own Recent feed, search
results, tag pages and related lists. It is per person, it is not access control (the channel stays
reachable by link and in its library tab), and it is reversed from the same place.

Movie collections have no per-person hide; the library-level **show in Recent** switch is the tool
there, and it too leaves search and tags untouched.
