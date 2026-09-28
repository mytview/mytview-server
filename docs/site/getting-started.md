---
title: Getting started
description: The container is up. Now what? Add your first library, invite the household, decide what is private, connect the apps. Ten minutes.
---

The container is up and you have signed up. The server is empty on purpose: it indexes nothing until
you tell it where your libraries are. This page takes you from that blank screen to a shared, working
server in about ten minutes. Every step links to the configuration pages for the details.

## Step 1: Sign up as the owner

The first visit lands on the login page. Choose **Sign up**: the first account created on a server is
its owner, with no extra step. A username needs two characters, a password six. After this, signing
up requires an invite link (the default), so nobody else can create an account by finding your address.

Everything an owner does lives under the avatar menu, top right: **Server** is the admin hub, with
Libraries, Sharing, Users and Federation inside it.

## Step 2: Add your first library

**Avatar menu → Server → Libraries → Add**

A library is a folder inside your mounted media plus a **format**, which tells the indexer what to
expect in it. Give it a name, pick the format, and use **Browse** to choose the folder (leaving it
blank means the whole mount). The two checkboxes can stay at their defaults for now: new channels
public, shown in the Recent feed.

| Your folder holds | Format | What it expects |
| --- | --- | --- |
| Creator channels: one folder per channel, videos with `.info.json` sidecars | **channels** | Any nesting; a video is a media file with a sidecar of the same name. Thumbnails next to the file. |
| TV shows: one folder per show, seasons, `SxxExx` filenames, Kodi/Emby `.nfo` | **series** | `tvshow.nfo` is optional; episodes read their own `.nfo` or fall back to the filename. |
| Films: `Name (Year)/` folders with `movie.nfo`, `poster.jpg`, `fanart.jpg` | **movies** | One poster wall per library. Trailers and samples are skipped; the largest file is the feature. |

Save. Indexing starts immediately in the background; a spinning ring around your avatar shows
progress, and the first items appear within seconds. Add as many libraries as you have kinds of
folders. A mixed mount is fine: each library is its own subfolder. Details and every field the indexer
reads: [Libraries and formats](/docs/configuration/libraries/).

:::note[Nothing appeared?]
Open the library row: a **missing** badge means the folder is not where the server sees it, which is
almost always the volume mapping in your container, not the library. Otherwise check that the files
actually carry their sidecars: a folder of bare video files indexes as nothing in a channels library.
:::

## Step 3: Look around

The home page is **Recent**: everything, newest first, across all libraries. One tab per library sits
in the header; a movies library opens straight onto its poster wall. Open a video: it plays directly
if your browser can decode it and falls back to a live transcode if not, with nothing for you to
choose. Watched items disappear from the feed on their own; *show watched* brings them back. That
behaviour, and every other rule about what shows where, is in [Watching](/docs/configuration/watching/).

## Step 4: Invite the household

**Avatar menu → Invite someone → Generate invite link**

Each link creates exactly one account and can be sent any way you like. Everyone gets their own
sign-in, watch history, resume points and subtitle preferences, on every device they use. The owner
can later reset a password, deactivate or delete an account from **Server → Users**
([Accounts](/docs/configuration/accounts/)).

## Step 5: Decide what is private

**Avatar menu → Server → Sharing**

By default every channel, show and collection is visible to every account. The Sharing page is a
grid: one row per channel, one column per person. Tick **Priv** on a row to make it private, then tick
the people who should still see it. Private means unreachable, not merely hidden: a guessed address
gets a 404. If a whole library should be private by default, set that on the library itself so new
arrivals start private. Full mechanics, bulk controls and the difference from a personal "hide from my
feed": [Sharing and privacy](/docs/configuration/sharing/).

## Step 6: Connect the apps

The web player already works on every phone, tablet and laptop in the house. The native apps add
remote-control navigation, background audio and offline downloads.

- **Phones and tablets:** install the app, enter the server address exactly as you reach it in a
  browser (for example `http://192.168.1.20:8700`), sign in with the same account.
- **TVs:** the TV shows a QR code; scan it with the phone app and it signs in by itself, nothing typed
  with a remote. Or enter the TV's short code at **Avatar menu → Link a TV** in a browser.
- **Away from home:** the apps need to reach the server. A VPN or tailnet is the simplest way; a public
  address behind a reverse proxy with TLS is the other ([reverse proxy setup](/docs/configuration/reverse-proxy/)).

Apps installed before 1 November 2026 stay free forever; after that they are a 14-day trial and a
one-time purchase. The web player and the Samsung TV app are always free (the Samsung app is still
in Samsung's review; owners who don't want to wait can [build and sideload it](https://github.com/mytview/mytview-tizen)).
Where to get each one: [The apps](/docs/configuration/apps/).

## Step 7: Three settings worth a look on day one

### Hardware transcoding

**Avatar menu → About** shows how this server plays: direct play, live transcoding, and whether
hardware acceleration is on a GPU, on the CPU, or was requested but not found. If you have an Intel
iGPU and it says CPU, the device is not passed into the container yet
([how to](/docs/install/#hardware-transcoding)). Without one, transcoding still works on the CPU and
only happens when a device cannot play a file directly.

### Show in Recent

A library you browse deliberately, a film collection say, can stay out of the Recent feed while
remaining fully searchable and reachable from its tab. Untick **Show this library's items in the
Recent feed** on the library.

### Subtitles, per person

Each account sets its own caption size and colour under **Avatar menu → Account**, and those follow
the person to every device. Sidecar `.srt` and `.vtt` files and text tracks embedded in the containers
are picked up automatically ([Subtitles and audio](/docs/configuration/subtitles/)).

## The map

| Menu item | What it is |
| --- | --- |
| **Account** | Your password, subtitle preferences, your devices, and Plex linking. |
| **About MytView** | Version, library totals, how this server plays; a technical block for the owner. |
| **Public links** | Share links you have created, with views and expiry, and revoke. |
| **Invite someone** | Single-use signup links. |
| **Server** (owner) | Libraries, Sharing, Users, Federation, full rescan, last scan stats. |
| **Rescan library** | An incremental rescan, safe any time. New files are also picked up automatically every five minutes. |

:::tip[That is a working server.]
From here on it is about what MytView can do for your particular library: federation with a friend's
server, Plex watch-state sync, share links, transcoding limits, reverse proxies, and every environment
variable. Start with [How MytView thinks](/docs/configuration/principles/).
:::
