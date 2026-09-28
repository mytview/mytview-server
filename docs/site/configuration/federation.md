---
title: Federation
description: Two MytView servers peer so one household shares chosen channels, shows or whole libraries with another.
sidebar: { order: 10 }
---

**Avatar menu → Server → Federation** (owner only)

Two MytView servers can peer so that one household shares chosen channels, shows or whole libraries
with another. The sharer's catalogue is mirrored into the consumer's index, so the friend's content
appears in the consumer's feed, search, tags, grids and watch state exactly like local content; the
**video itself streams directly** from the sharer to the viewer's device, by short-lived signed
links, never through the consumer's server. A server can share with several peers and consume from
several, or both with the same peer. Mirrored content is never re-shared onward, and watch state
never leaves the consumer.

## Requirements

- **The consumer needs nothing public.** Sync is an outbound pull.
- **The sharer must be reachable** by the consumer's server (for sync) and by the consumer's viewers'
  devices (for playback): a public address behind TLS, or a shared LAN, VPN or tailnet. Prefer https:
  Apple devices refuse plain http media, and an https web page cannot load http video.
- Both clocks must be right (NTP); signed links are checked against the peer's clock.

## Sharing

1. Set the **public address** the peers' viewers will reach you at, unless the derived one is already
   right. Precedence: the `EXTERNAL_URL` variable, then this setting, then the address of the request.
2. **New invite** produces a paste-string valid 24 hours, single use. Treat it like a password reset
   link. Pending invites can be revoked.
3. Once paired, choose what the peer gets on the **Sharing** page: each federated server is one more
   column, tickable per channel or *whole* for a library, which covers future content too. Sharing to
   a peer is independent of a channel's private flag for your own users.
4. Each peer row shows what is shared, when it was last seen, live streams now and plays over the last
   day and month, and a **stream cap** (blank or 0 = unlimited). Over the cap, new streams are refused
   politely; playing ones are never cut.

## Consuming

1. Paste the invite, name the peer, and pair; the first sync starts at once. An http-only peer
   triggers a warning about Apple devices and https pages.
2. For each remote library, **map** it: into a new virtual library (its format inherited and locked)
   or merged into an existing local or virtual library of the same format. Several peers can merge
   into one library. Unmapping removes the mirrored items but keeps watch history.
3. Sync repeats every 30 minutes by default (adjustable; 0 = manual). A peer that is down never
   causes a prune; browsing, search, cached artwork and watch state keep working, and only playback
   reports that the peer is unreachable.

**Duplicates:** local content wins. A remote video whose id already exists locally is not mirrored,
and a remote channel with the same id merges into the local tile. Episodes that lack an id in their
`.nfo` cannot be matched and may appear twice. Federated viewers count against the *sharer's*
transcode limits. Federated items never take part in Plex sync.
