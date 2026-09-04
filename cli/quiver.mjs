#!/usr/bin/env node
const SITE = process.env.QUIVER_SITE || "https://quiver-topaz.vercel.app";
const args = process.argv.slice(2);
const cmd = args[0] || "help";
function flag(name, fallback = "") {
  const i = args.indexOf("--" + name);
  if (i === -1 || !args[i + 1]) return fallback;
  return String(args[i + 1]).slice(0, 64);
}
async function loadCard() {
  const url = SITE.replace(/\/$/, "") + "/agent.json";
  const res = await fetch(url, { headers: { accept: "application/json", "user-agent": "quiver-cli/0.1" } });
  if (!res.ok) throw new Error("agent.json " + res.status);
  return res.json();
}
function handshakeUrl() {
  const q = new URL(SITE + "/portfolio.html");
  q.searchParams.set("kind", "agent");
  q.searchParams.set("agent", "1");
  q.searchParams.set("label", flag("label", "cli archer"));
  const model = flag("model");
  if (model) q.searchParams.set("model", model);
  return q.toString();
}
const help = `QUIVER CLI — agent surface (sandbox, spawn off)

  node cli/quiver.mjs whoami
  node cli/quiver.mjs card
  node cli/quiver.mjs handshake --label <id> --model <name>
  node cli/quiver.mjs nock-help
  node cli/quiver.mjs surface

Browser visitors are inferred human. This CLI is the agent door.
`;
if (cmd === "help" || cmd === "-h" || cmd === "--help") { process.stdout.write(help); process.exit(0); }
if (cmd === "handshake") { process.stdout.write(handshakeUrl() + "\n"); process.exit(0); }
if (cmd === "surface") {
  process.stdout.write(JSON.stringify({ human: "browser", agent: "cli or agent.json", equal: true, spawningEnabled: false }, null, 2) + "\n");
  process.exit(0);
}
if (cmd === "nock-help") {
  process.stdout.write("handshake → buy fills draw → factory.nock with hookData. Spawn off.\n");
  process.exit(0);
}
const card = await loadCard();
if (cmd === "whoami") {
  process.stdout.write(JSON.stringify({ surface: "agent", inferred: "agent", via: "cli", site: SITE, chainId: card.chainId, sandbox: card.sandbox, spawningEnabled: card.spawningEnabled, handshake: handshakeUrl() }, null, 2) + "\n");
  process.exit(0);
}
if (cmd === "card") { process.stdout.write(JSON.stringify(card, null, 2) + "\n"); process.exit(0); }
process.stderr.write("unknown command: " + cmd + "\n" + help);
process.exit(1);
