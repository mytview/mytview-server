---
title: Behind a reverse proxy
description: ORIGIN, forwarded headers, timeouts, and what federation needs from the proxy.
sidebar: { order: 13 }
---

On a LAN, by address, nothing needs to be set. When you publish the server through Caddy, nginx,
Traefik or Cloudflare with TLS:

| Variable | Set it to |
| --- | --- |
| `ORIGIN` | Your public URL, `https://videos.example.com`. It also marks the address as trusted for federation invites. Leave it entirely unset otherwise; on images before 0.4.10 an empty value stops the server from starting. |
| `ADDRESS_HEADER` | `x-forwarded-for` (Cloudflare: `cf-connecting-ip`). Without it, every login and pairing attempt looks like it comes from the proxy and shares one rate-limit bucket. |
| `XFF_DEPTH` | How many proxies sit in front (default 1), so the right hop of the forwarded chain is read. |
| `PROTOCOL_HEADER`, `HOST_HEADER` | `x-forwarded-proto` and `x-forwarded-host`, only if your proxy rewrites the Host header. Share links, pairing codes and reset links already follow the forwarded host and protocol. |

- Allow at least **60 seconds** of read timeout on `/hls/`: the server itself never holds a request
  beyond about 45 seconds and then answers 503 with a retry hint.
- The image keeps idle connections open for 65 seconds, longer than the 60-second upstream keep-alive
  most proxies use, which avoids intermittent 502s. If your proxy keeps upstream connections open
  longer, raise `KEEP_ALIVE_TIMEOUT` and `HEADERS_TIMEOUT` (headers must stay one second above
  keep-alive).
- For federation, the sharer's `/hls/` and `/media/` paths answer with a permissive CORS header;
  nothing else does.

## The apps get a 403 but the browser works

The server answers 403 only for a media path outside the library root; a 403 on sign-in comes
from the proxy layer, which is judging the client rather than the credentials. Two settings do
that:

- **Cloudflare bot protection.** A proxied (orange-cloud) hostname is fine; the demo server runs
  that way. What refuses the apps is a challenge that a browser passes and an app cannot:
  **Security → Bots → Bot Fight Mode** (on the Free plan it cannot be exempted per hostname or
  path), a WAF managed or custom rule with a challenge action, or Security Level set to "I'm
  Under Attack". Turn the one that is on off for the zone, or on a paid plan tune Super Bot Fight
  Mode to allow the hostname. The proxy itself can stay.
- **Nginx Proxy Manager access lists.** An Access List other than "Publicly Accessible" answers
  403 to the apps, which send no basic auth and may be on cellular. "Block Common Exploits" and
  "Websockets Support" are harmless either way (MytView uses no WebSockets).

To tell the layers apart from any machine:

```sh
curl -i -X POST https://your-host/api/v1/auth/login \
  -H 'Content-Type: application/json' -d '{"username":"x","password":"y"}'
```

MytView answers **401** to bad credentials. A **403** is the proxy layer.
