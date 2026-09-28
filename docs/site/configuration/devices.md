---
title: Devices and TV sign-in
description: Your signed-in devices, revoking them, and the two ways a TV signs in without typing.
sidebar: { order: 9 }
---

**Avatar menu → Account → Devices**

Every signed-in device is listed with a label (the app's name, or "Chrome on Mac" and the like), when
it was last active and when it signed in. Revoke any one of them, or sign out all others. A revoked app
drops back to its login screen on its next request.

## Signing in a TV

- **Scan the code (recommended):** the TV app shows a QR code; the phone app scans it and signs the
  TV in. The handshake passes through a small relay at `link.mytview.com`, encrypted, for at most
  five minutes, and carries no media and no credentials the relay can read.
- **Enter the code:** the TV also shows a short code of the form `XXXX-XXXX`, valid 15 minutes. Open
  **Link a TV** in a browser (or scan its QR with any camera; a logged-out phone is sent through login
  and back), type the code, approve. The TV signs in within seconds.

From the apps, owner pages that only exist on the web (Sharing, invites, public links, devices) open
already signed in, through a single-use, 60-second code.
