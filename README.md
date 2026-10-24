# Brick Breaker

Twenty dense levels, with a minimal game-only interface.

Live: https://brick-breaker.suryansh.lol

A reference-inspired TypeScript and Canvas game with sequential level unlocking, three lives per level, unlimited retries, replayable levels, and a 54 by 54 brick grid, breakable maze walls, wide-paddle and slow-ball power-ups, and +3 ball pickups with swarms of up to 48 balls.

## Play

- Desktop: mouse, arrow keys, or A/D. Space launches or pauses; P and Escape pause. Paddle contact position changes the ball’s angle.
- Mobile: use the thumb drag strip below the board, or enable touch buttons. Tap the board to launch.
- Guest progress saves in this browser. Google players resume their exact game across devices.
- A guest game transfers into a new Google account. Existing account progress prompts the player to choose between the two saves. Concurrent device updates use optimistic version checks and the same explicit choice.
- Cards are generated locally. Recent silent clips use overlapping, independently playable MediaRecorder segments, generally 10–20 seconds after warm-up. At most two encoders run. No microphone, camera, screen-capture permission, video uploads, or video database storage. Unsupported browsers retain image sharing. Clip buffers vanish when the tab closes.

## Develop

Use Node 22.12 or newer.

```sh
npm ci
npm run build
npx wrangler d1 migrations apply brick-breaker --local
npm run dev:worker
```

This serves the built app and local API on port 8787. For frontend hot reload, also run `npm run dev`; Vite on port 5173 proxies `/api` to port 8787. Google sign-in is restricted to the production domain. Local development supports guest play; do not add an unrestricted Google test origin to the production client.

```sh
npm test
npm run test:e2e
npm run check
npm run build
npm run deploy
```

## Hosting and push-to-deploy

Cloudflare Worker `brick-breaker` serves Vite assets and `/api` routes. D1 database `brick-breaker` stores account profiles, hashed session identifiers, and game saves. Infrastructure IDs and the public Google client ID are in `wrangler.jsonc`; they are not credentials. There is no Google client secret in this project: the Worker verifies Google ID token signatures, issuer, audience, expiry, verified email, and a browser-specific nonce against Google’s public keys.

The repository’s GitHub Actions check runs unit tests, a production build, and headless desktop/mobile browser checks. On Windows the browser checks use installed Google Chrome; elsewhere run `npx playwright install --with-deps chromium` first. Cloudflare Workers Builds connects this repository’s `main` branch to the Worker. Build command: `npm test && npm run build`. Deploy command: `npx wrangler deploy`. Preview deployments are disabled because Google sign-in is restricted to the production domain. Keep the Worker name aligned with the Wrangler configuration. Future D1 schema migrations should be reviewed and applied with `npx wrangler d1 migrations apply brick-breaker --remote` before deploying code that needs them.

## Data and security

Only basic Google identity is requested. Sessions use a 30-day Secure, HttpOnly, SameSite cookie; only its SHA-256 hash is stored. Writes require a same-origin request and JSON. Account saves encode the 2916 brick hit-point values compactly, are validated, and are limited to 64 KB; records are selected using the authenticated session’s user ID. Concurrent saves cannot silently replace each other. Account deletion removes the user profile, save, and sessions. Game scores are client-generated and intended for personal play, not a competitive leaderboard.

Guest data and each account’s offline cache use separate storage keys. Account saves retry while online; expired sessions keep the device copy. No recordings or cards are uploaded. See [privacy](https://brick-breaker.suryansh.lol/privacy.html).

## Verification

Tests cover all 20 layouts, unlock rules, exact snapshot simulation, lives and multiball, aiming, collision substeps, malformed saves, cross-origin writes, anonymous save access, and sign-in nonce requirements. Browser checks cover desktop and mobile layouts, keyboard and touch-strip controls, persistence, sharing, recording, and production Google sign-in.
