// Container entry point: `node scripts/start.mjs` (the Dockerfile CMD). Same as `node build`, after
// one fix-up: every environment variable whose value is the EMPTY STRING is removed first.
//
// Why: deployment UIs pass a blank field as '' rather than leaving the variable unset — Unraid's
// dockerMan, Portainer, TrueNAS app forms — and so does the compose idiom `ORIGIN: ${ORIGIN:-}`
// when .env doesn't set it. adapter-node validates ORIGIN at import time and THROWS on '' (a
// crash loop before a single log line from us; measured 2026-09-26 on every tag back to 0.4.6).
// Our own config.ts already treats '' like unset for every variable it reads, so scrubbing empties
// globally makes "blank" mean "default" everywhere, whichever tool wrote the environment.
for (const [key, value] of Object.entries(process.env)) {
	if (value === '') delete process.env[key];
}

await import('../build/index.js');
