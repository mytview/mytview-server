---
title: The apps
description: What the native apps need, offline downloads, and the founder, trial and one-time unlock rules.
sidebar: { order: 12 }
---

The web player ships with the server and is free. The native apps are separate products by the same
author: iPhone, iPad and Apple TV on the App Store; Android phones, tablets and Google TV on Google
Play; Samsung TV on the Samsung store (free, waiting for Samsung's review; until it is listed, the
[source and a build-and-sideload guide](https://github.com/mytview/mytview-tizen) are the temporary
way onto a Samsung TV). Each needs only the server address, exactly as you reach
it in a browser, and the same account. They read the server's capability list, so a feature the server
lacks simply does not show.

- **Offline downloads** on iPhone and iPad (Android following): a download is either the original
  file or a live remux in the format the device plays, kept only on the device; the server never
  records what a device holds, and downloads are paced so they never crowd out someone watching.
  Following a show keeps the next unwatched episodes on the device.
- **Settings** in the apps hold the per-person autoplay and still-watching preferences, which the web
  player also honours.
- **Pricing:** an app installed before 1 November 2026 stays free forever, detected from the install
  date itself, nothing to claim. After that date a first install gets a 14-day trial and then a
  one-time unlock per store (one purchase covers iPhone, iPad and Apple TV; one covers Android phones,
  tablets and Google TV). Only starting playback is gated, never browsing, pairing or settings, and if
  the store cannot be reached the app lets you watch. The web player and the Samsung app never gate.

Third-party clients are welcome: the client contract is documented in the
[server repository](https://github.com/mytview/mytview-server/blob/main/docs/api.md).
