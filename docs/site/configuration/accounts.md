---
title: Accounts
description: The owner, signup policy, invites, resets, deactivation, and the lockout escape hatch.
sidebar: { order: 3 }
---

## Owner and signup policy

The first account is the owner; there is no separate role to assign, and the owner account cannot be
deactivated or deleted. Who else may sign up is set by `ALLOW_SIGNUP`: `invite` (default) requires a
single-use invite link after the first account, `all` opens signup, `off` closes it once an owner
exists. Login is always allowed. Usernames need two characters and passwords six; the same minimum
applies to changes and resets.

## Invites

**Avatar menu → Invite someone**

Generates a link of the form `https://your-server/signup?invite=…`. Each link creates one account and
is then spent; unused links do not expire. By default only the owner can invite; `ALLOW_INVITES=all`
lets every signed-in user do it. The page lists your invites as active or used.

## Users

**Avatar menu → Server → Users** (owner only)

- **Reset link:** no email is involved. The owner generates a single-use link, valid three days, and
  sends it to the person; using it sets a new password and signs out all of that account's devices.
- **Deactivate:** the account is locked at once, all its sessions and pending TV codes are revoked,
  and any share links it created stop working until it is reactivated.
- **Delete:** removes the account, its watch history, shares, grants and preferences, after a
  confirmation.

### Locked out as owner?

From a shell on the host:

```bash
docker exec -it mytview node scripts/set-password.mjs <username>
```

It prompts for the new password (or reads `MYT_NEW_PASSWORD`), works while the server is running, and
also reactivates a deactivated account.

## Your account

**Avatar menu → Account**

Change your password (this signs out your other devices), set your caption size and colour, open your
[Devices](/docs/configuration/devices/), and link Plex. Signing in stays valid for a long time: a
session expires after 90 days unused, or 400 days at most. Login is rate limited to 20 attempts per
minute per address and 10 per username.
