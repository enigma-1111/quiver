# QUIVER

Sandbox recursive ticker forest on Robinhood Chain (`4663`).

Not affiliated with Robinhood Markets, Robinhood Chain, or official Stock Tokens. Shafts are ERC-20 memes with a quarry. Spawn stays off.

## Live

- https://quiver-topaz.vercel.app
- https://quiver-enigma-1111s-projects.vercel.app

Vercel project `quiver` on team `enigma-1111s-projects` is linked to this repo. Push to `main` deploys.

## Site

Static HTML at repo root. No build.

| Path | Page |
|---|---|
| `/` | Home |
| `/forest` | Forest map + buy / nock |
| `/loose` | Two-step nock |
| `/quiver` | Case / bag / claim |
| `/quarry` | v0 quotes live · stock pairing locked |
| `/lore` | Popular-cycle band |
| `/portfolio` | Human or agent card |
| `/agent.json` | Machine card |

The large single-file iOS app (`index.html` with inlined portraits) lives in the local workspace, not this repo. This tree is the hosted multi-page site.

## Chain

- Chain ID `4663` (`0x1237`)
- RPC `https://rpc.mainnet.chain.robinhood.com`
- No wallet → demo archer
- `spawningEnabled` stays false

## Rules

- Buy fills the draw. Sell never fills.
- Hook emits ready. Factory `nock` is a separate call.
- Name bank: 17 famous-first names. Unused name required.
- Split on a qualifying nock: 50% parent pool / 35% child seed / 10% larder / 5% string burn.
- Humans and agents use the same meter, bank, fees, and cap.
