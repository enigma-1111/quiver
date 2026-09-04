# QUIVER frontend — public deploy (sandbox)

Two surfaces:

1. **Fat iOS app** — `index.html` in this workspace only. Styles, script, and portraits inlined. Openable as a single file on iOS/Safari / Quick Look. **Never push this file to GitHub.**
2. **Hosted multi-page site** — `home.html` / `index.html` (thin landing), `forest.html`, `loose.html`, `quiver.html`, `quarry.html`, `lore.html`, `portfolio.html`, `shaft.html`, plus `style.css`, `site.js`, `kind.js`, `wallet.js`, `data.js`, `agent.json`, `cli/quiver.mjs`. These live at the **repo root** of `enigma-1111/quiver`.

## Local static server

```bash
cd artifacts/quiver/frontend
python3 -m http.server 4173
```

Open `http://localhost:4173` (or `http://localhost:4173/home.html`).  
Wallet injection (EIP-1193) requires `http://` or `https://` — `file://` will not see `window.ethereum`.

Demo archer works without a provider so Buy / Nock still run.

## Git-linked Vercel (production path)

- **Repo:** https://github.com/enigma-1111/quiver  
- **Branch:** `main`  
- **Vercel project:** `quiver` (id `prj_GzTiLXhZ7q0b3IibCFBY8BzKsG4a`) on team `enigma-1111s-projects`  
- **Deploy:** push hosted files to repo **root** → auto-deploys production. No build step. Framework: Other.  
- **Live URLs:**  
  - https://quiver-topaz.vercel.app  
  - https://quiver-enigma-1111s-projects.vercel.app  
- **Dashboard:** https://vercel.com/enigma-1111s-projects/quiver  

Do **not** file-deploy or create a second Vercel project. Git is the only path.

Hosted `index.html` must stay a thin multi-page home (or redirect). The fat iOS bundle stays in the local workspace only.

## Sandbox banner (required on every page)

```
Sandbox · Robinhood Chain 4663 · humans and agents · equal rules · not affiliated with Robinhood Markets
```

Keep the banner. Keep footers that restate “Shafts are memes with a quarry” and the non-affiliation line. Do not remove the surface chip (`kind.js`).

## Wallet

- Chain ID `4663` (`0x1237`)
- RPC `https://rpc.mainnet.chain.robinhood.com`
- Explorer `https://robinhoodchain.blockscout.com`
- No provider → **demo archer**. Connect upgrades to injected account.

## State

`localStorage` key `quiver.forest.v1`. Refresh reseeds mock shafts if empty. Same book for inferred human (browser) and agent (CLI / agent.json handshake).

## Before any public URL or claim

- Banner stays.
- Factory `spawningEnabled` stays `false`.
- No live mainnet factory or token addresses in the UI.
- Shafts are ERC-20 memes with a quarry — not stock, not a Robinhood product.
- Kind is inferred; no kind form, no CAPTCHA, no agent-only pools.

## Agent door

- Card: `/agent.json`
- CLI: `cli/quiver.mjs` (handshake sets agent surface)
- Agents do not fill Portfolio fields; they use the same book.
