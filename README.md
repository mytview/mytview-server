# MytView Server

**A media server that shows your video library and nothing else. Fast, private, read-only.**

[Website](https://mytview.com) · [Documentation](https://mytview.com/docs/) · [Privacy](https://mytview.com/privacy/)

MytView does one job: it shows the video library on your own disks, quickly, to the people you
share it with. No streaming catalogue, no rentals, no "discover" tab, no ads, no account with
anybody's cloud. It runs as one container on a NAS or home server, and you watch in a browser or in
the apps for iPhone, iPad, Apple TV, Android, Google TV and Samsung TV.

<p align="center">
  <img src="docs/screenshots/web-hero.jpg" width="820" alt="The web app: the Recent feed of a library, with the main features called out" />
</p>

- **Fast.** Nothing is looked up online. Titles, artwork and descriptions come from the `.nfo` and
  `.info.json` files already next to your videos, so a scan is a walk through your folders and the
  first items appear in seconds. Devices play the original file, and the server transcodes live
  only when a device can't.
- **Private.** The only account is on your own server. No telemetry, no licence check, no outbound
  connections unless you switch on Plex sync or federation. Video goes straight from your server
  to your screen.
- **Read-only.** The library is mounted `:ro`, so nothing is renamed, moved or written next to your
  files. It runs beside Plex or Jellyfin on the same folders.

The trade-off: it shows what is on disk. If your library has no `.nfo` files or artwork, MytView
will not fetch them.

## Quick start

```yaml
# docker-compose.yml
services:
  mytview:
    image: ghcr.io/mytview/mytview:latest
    container_name: mytview
    restart: unless-stopped
    ports:
      - "8700:8700"
    volumes:
      - /path/to/your/library:/media:ro   # your videos, read-only
      - mytview-data:/data                # accounts, watch state, index: back this up
      - /path/to/scratch:/transcodes      # scratch space for live transcoding
volumes:
  mytview-data:
```

Run `docker compose up -d`, then open **http://your-host:8700**:

1. **Sign up.** The first account becomes the owner. After that, signing up needs an invite.
2. **Add a library** (avatar menu → Server → Libraries): a name, a format and a folder under
   `/media`. Nothing is indexed until you do.

Other ways to install:

- **Unraid:** search `MytView` in Community Applications.
- **Synology, TrueNAS, CasaOS, OpenMediaVault:** see the [install guide](https://mytview.com/docs/install/).
- **Intel iGPU for transcoding:** add the override file,
  `docker compose -f docker-compose.yml -f docker-compose.hwaccel.yml up -d`.
- **Behind a reverse proxy or Cloudflare:** see [Behind a reverse proxy](https://mytview.com/docs/configuration/reverse-proxy/).

## What your library needs to look like

A library is a folder under `/media` in one of three formats:

| Format | Layout | Metadata read |
| --- | --- | --- |
| Movies | `Movie Name (2024)/Movie Name (2024).mkv` | `movie.nfo`, `poster.jpg`, `fanart.jpg` |
| Series | `Show Name/Season 1/Show - S01E02 - Title.mkv` | Kodi/Emby `.nfo` files and local artwork, or `SxxExx` in the filename when there is no `.nfo` |
| Channels | `Channel Name/Video Title.mp4` | `Video Title.info.json` beside it: title, date, description, tags |

Every detail is in [Libraries and formats](https://mytview.com/docs/configuration/libraries/).

## What is in it

- **Films, shows and creator channels.** A poster wall with genres for films, seasons and
  next-episode for shows, and a newest-first feed across channels, with their own descriptions
  and tags.
- **Accounts by invite**, each with their own history and resume points. Channels, shows and
  movie collections can be private to the people you choose.
  [Accounts](https://mytview.com/docs/configuration/accounts/) ·
  [Sharing and privacy](https://mytview.com/docs/configuration/sharing/)
- **Direct play first.** When a device cannot decode a file, the server transcodes it live
  (Intel VAAPI, or CPU). Nothing is converted ahead of time or stored.
  [Playback](https://mytview.com/docs/configuration/playback/)
- **Subtitles and audio tracks** from `.srt` and `.vtt` files or from text tracks inside the file.
  Image-based subtitles (PGS, VobSub) are not supported.
  [Subtitles](https://mytview.com/docs/configuration/subtitles/)
- **Share links** for a single video, with an expiry and a view cap.
  [Share links](https://mytview.com/docs/configuration/share-links/)
- **Federation.** Pair with other MytView servers to share a show or a whole library with another
  household. Their catalogue merges into your libraries, and video streams directly from the
  server that holds the file. [Federation](https://mytview.com/docs/configuration/federation/)
- **Plex sync.** Two-way sync of watched state and resume points with a Plex server on the same
  files, linked per user. [Plex sync](https://mytview.com/docs/configuration/plex/)
- **Offline downloads** in the iPhone and iPad app.

Reference: [environment variables](https://mytview.com/docs/reference/environment/) ·
[troubleshooting](https://mytview.com/docs/reference/troubleshooting/)

## The apps

The web player ships with the server and is complete on its own. The native apps are separate,
closed-source products by the same author:

- **iPhone, iPad, Apple TV:** [App Store](https://apps.apple.com/app/id6790113115)
- **Android phone, tablet, Google TV:** [Google Play](https://play.google.com/store/apps/details?id=com.mytview.app),
  an open beta, no invite needed
- **Samsung TV:** free, and in review for the Samsung store. Until it is listed, you can
  [build it from source and sideload it](https://github.com/mytview/mytview-tizen).

The apps start with a 14-day free trial, then a small one-time purchase per store, with no
subscription. An app installed before 1 November 2026 stays free forever, with nothing to claim.

<p align="center">
  <img src="docs/screenshots/iphone-recent.jpg" width="196" alt="Recent feed on iPhone" />
  <img src="docs/screenshots/iphone-offline.jpg" width="196" alt="Offline mode on iPhone: the copies on the device" />
  <img src="docs/screenshots/iphone-download.jpg" width="196" alt="Downloading a video on iPhone" />
  <img src="docs/screenshots/android-library.jpg" width="196" alt="Library on an Android phone" />
</p>

*The demo library in these shots is Blender's open movies and NASA public-domain footage.*

Third-party clients are welcome. The client API is documented in [`docs/api.md`](docs/api.md).

## Development

```bash
npm install
cp .env.example .env    # set MEDIA_ROOT to a local path
npm run dev             # Vite dev server
npm run check           # svelte-check, must stay clean
npm test                # vitest suite
npm run build && node build   # production build (adapter-node)
```

Runtime dependencies are deliberately few: SvelteKit, `better-sqlite3`, and `hls.js` in the web
player. Transcoding shells out to `ffmpeg` and `ffprobe`, which the image bundles. `/data` holds two
SQLite databases: `index.db`, a cache rebuilt by scanning, and `state.db`, the accounts and watch
state, which is the one thing to back up.

## How it is built

MytView is a solo project, proudly co-created with Anthropic's Claude (Opus and Fable) under my
direction: the design, the product decisions, the review and the field testing are mine, and every
increment ships with tests and runs on my own servers before it is released. It is 2026; get over it.
Opinions on the tooling are not sought here and will not be engaged with. Bug reports and pull
requests about what the software does are very welcome.

## License

GPL-3.0, see [LICENSE](LICENSE). Contributions are welcome under the terms in
[CONTRIBUTING.md](CONTRIBUTING.md).
