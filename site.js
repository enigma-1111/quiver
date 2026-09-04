(function () {
  const KEY = "quiver.forest.v1";
  const NAME_BANK = window.QUIVER_CAST.map(c => [c.symbol, c.name]);
  function shaft(symbol, name, stringOf, generation, archer, draw, drawTarget, hit, fees, bag, kind) {
    return { symbol, name, stringOf, generation, quarry: "USDG", archer, draw, drawTarget, hit, fees, bag, kind: kind || "unset" };
  }
  function seed() {
    return {
      selected: "QUIVER", connected: false, account: null, demo: true,
      kind: "unset", label: "", model: "",
      maxShafts: 17, larder: 0.031, claimed: 0,
      log: ["Forest opened."],
      shafts: {
        QUIVER: shaft("QUIVER","QUIVER",null,0,"protocol",72,100,false,0,0),
        LOCKSLEY: shaft("LOCKSLEY","Robin of Locksley","QUIVER",1,"demo",40,100,false,0.12,1200,"human"),
        MARIAN: shaft("MARIAN","Maid Marian","QUIVER",1,"demo",22,100,false,0.08,800,"human"),
        JOHN: shaft("JOHN","Little John","LOCKSLEY",2,"0x9c22",18,100,false,0.03,0,"agent"),
        SHERWOOD: shaft("SHERWOOD","Sherwood","LOCKSLEY",2,"demo",88,120,true,0.21,400,"human")
      }
    };
  }
  let state = seed();
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s && s.shafts && Object.keys(s.shafts).length > 0) Object.assign(state, s);
  } catch (e) {}
  function agentHandshake() {
    try {
      const q = new URLSearchParams(location.search);
      if (q.get("kind") === "agent" || q.get("agent") === "1") {
        const card = {
          kind: "agent",
          label: (q.get("label") || "cli archer").slice(0, 64),
          model: (q.get("model") || "").slice(0, 64),
          via: "cli"
        };
        sessionStorage.setItem("quiver.agent.handshake", JSON.stringify(card));
        return card;
      }
      const raw = sessionStorage.getItem("quiver.agent.handshake");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    if (window.QUIVER_AGENT) {
      const a = window.QUIVER_AGENT;
      return { kind: "agent", label: (a.label || "embedded agent").slice(0, 64), model: (a.model || "").slice(0, 64), via: "embed" };
    }
    return null;
  }
  function inferSurface() {
    const hs = agentHandshake();
    if (hs && hs.kind === "agent") return hs;
    return { kind: "human", label: "browser archer", model: "", via: "browser" };
  }
  const inferred = inferSurface();
  state.kind = inferred.kind;
  state.via = inferred.via;
  if (inferred.kind === "agent") {
    state.label = inferred.label;
    state.model = inferred.model;
  } else {
    state.label = state.account ? state.account.slice(0, 6) + "…" + state.account.slice(-4) : "browser archer";
    state.model = "";
  }
  function persist() {
    try {
      if (state.log && state.log.length > 14) state.log = state.log.slice(0, 14);
      localStorage.setItem(KEY, JSON.stringify({
        selected: state.selected, connected: state.connected, account: state.account, demo: state.demo,
        kind: state.kind, label: state.label, model: state.model, via: state.via,
        larder: state.larder, claimed: state.claimed, log: state.log, shafts: state.shafts
      }));
    } catch (e) {}
  }
  function kindBadge(k) { return k === "agent" ? "AI agent" : k === "human" ? "Human" : "Unlabeled"; }
  function toast(m) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
    t.textContent = m; t.style.display = "block";
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.style.display = "none"; }, 1800);
  }
  function band(sym) { return Object.values(state.shafts).filter(s => s.stringOf === sym); }
  function nextName() { return NAME_BANK.find(n => !state.shafts[n[0]]) || null; }
  function path(sym) { const o=[]; let c=state.shafts[sym]; while(c){ o.unshift(c.symbol); c=c.stringOf?state.shafts[c.stringOf]:null;} return o.join(" → "); }
  function me() { return state.account || "demo"; }
  function art(sym) {
    if (sym === "QUIVER") return "img/mark.svg";
    const c = window.QUIVER_BY[sym];
    return c ? c.img : "img/mark.svg";
  }
  function blurb(sym) {
    if (sym === "QUIVER") return "The case that holds the shafts.";
    const c = window.QUIVER_BY[sym];
    return c ? c.lore : "A shaft of the popular cycle.";
  }

  async function connect() {
    if (state.connected) { state.connected = false; state.account = null; state.demo = true; persist(); toast("Disconnected"); return paint(); }
    const eth = window.ethereum;
    if (!eth) { state.connected = true; state.demo = true; persist(); toast("No wallet · demo archer"); return paint(); }
    try {
      try { await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x1237" }] }); }
      catch (e) {
        if (e && (e.code === 4902 || e.code === -32603)) {
          await eth.request({ method: "wallet_addEthereumChain", params: [{
            chainId: "0x1237", chainName: "Robinhood Chain",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"],
            blockExplorerUrls: ["https://robinhoodchain.blockscout.com"]
          }]});
        }
      }
      const acc = await eth.request({ method: "eth_requestAccounts" });
      state.connected = true; state.demo = false; state.account = acc[0];
      toast("Connected on 4663");
    } catch (e) { toast(e.message || "Wallet rejected"); }
    persist(); paint();
  }
  function paintWallet() {
    document.querySelectorAll("[data-wallet]").forEach(el => {
      el.textContent = state.connected ? (state.demo ? "Demo archer" : state.account.slice(0,6)+"…"+state.account.slice(-4)) : "Connect";
    });
  }
  function paint() {
    paintWallet();
    paintLists();
    paintPortfolio();
    if (document.getElementById("forest")) paintForest();
  }
  function buy() {
    if (!state.connected) return toast("Connect first");
    const a = state.shafts[state.selected];
    a.draw = Math.min(a.drawTarget, a.draw + 14); a.fees += 0.004; state.larder += 0.001;
    if (a.draw >= a.drawTarget && a.generation >= 1 && a.drawTarget >= 120) a.hit = true;
    state.log.unshift("Buy " + a.symbol + " · draw " + a.draw + "/" + a.drawTarget);
    persist(); toast(a.draw >= a.drawTarget ? "Buy · draw FULL" : "Buy · draw fills");
    paint();
  }
  function sell() {
    if (!state.connected) return toast("Connect first");
    const a = state.shafts[state.selected];
    a.fees += 0.003;
    state.log.unshift("Sell " + a.symbol + " · draw unchanged " + a.draw + "/" + a.drawTarget);
    persist(); toast("Sell · draw does not fill");
    paint();
  }
  function nock() {
    if (!state.connected) return toast("Connect first");
    const p = state.shafts[state.selected], n = nextName();
    if (!n) return toast("Name bank empty");
    if (Object.keys(state.shafts).length >= state.maxShafts) return toast("Shaft cap reached");
    if (p.draw < p.drawTarget) return toast("Need " + (p.drawTarget - p.draw) + " more · buy fills, sell does not");
    state.shafts[n[0]] = shaft(n[0], n[1], p.symbol, p.generation + 1, me(), 0, p.hit ? p.drawTarget + 20 : 100 + p.generation * 10, false, 0, 250, state.kind || "unset");
    p.draw = 0; state.larder += 0.01; state.selected = n[0];
    state.log.unshift("Nocked " + n[0] + " from " + p.symbol + (state.kind !== "unset" ? " · " + state.kind : ""));
    persist(); toast("Loosed " + n[0] + " · quarry " + p.quarry);
    paint();
  }
  function claim() {
    if (!state.connected) return toast("Connect first");
    let s = 0;
    Object.values(state.shafts).forEach(x => { if (x.archer === me() || (state.demo && x.archer === "demo")) { s += x.fees; x.fees = 0; } });
    state.claimed += s; persist(); toast(s ? "Claimed " + s.toFixed(3) : "Nothing to claim");
    paint();
  }
  function refresh() {
    const keep = { connected: state.connected, account: state.account, demo: state.demo };
    localStorage.removeItem(KEY); state = Object.assign(seed(), keep);
    const inferred = inferSurface();
    state.kind = inferred.kind; state.via = inferred.via;
    if (inferred.kind === "agent") { state.label = inferred.label; state.model = inferred.model; }
    persist(); toast("Forest refreshed"); paint();
  }

  function layout() {
    const c = document.getElementById("forest"); if (!c) return {};
    const w = c.clientWidth, h = c.clientHeight, cx = w * 0.5, cy = h * 0.52;
    const scale = Math.max(0.62, Math.min(w / 420, h / 380, 1.25));
    const out = { QUIVER: { x: cx, y: cy } };
    function place(sym, depth) {
      const kids = band(sym);
      kids.forEach((k, i) => {
        const ring = 52 * k.generation * scale, slice = Math.PI * 1.5, start = -slice / 2 - 0.2;
        const ang = start + (slice * (i + 1)) / (kids.length + 1) + depth * 0.08;
        out[k.symbol] = { x: cx + Math.cos(ang) * (64 * scale + ring), y: cy + Math.sin(ang) * (46 * scale + ring * 0.8) };
        place(k.symbol, depth + 1);
      });
    }
    place("QUIVER", 0); return out;
  }
  function drawForest() {
    const canvas = document.getElementById("forest"); if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1; const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 0.52;
    for (let i = 4; i >= 1; i--) { ctx.beginPath(); ctx.arc(cx, cy, 52 * i, 0, Math.PI * 2); ctx.strokeStyle = "rgba(212,180,90," + (0.1 + i * 0.04) + ")"; ctx.stroke(); }
    const nodes = layout();
    Object.values(state.shafts).forEach(a => {
      if (!a.stringOf || !nodes[a.stringOf] || !nodes[a.symbol]) return;
      ctx.beginPath(); ctx.moveTo(nodes[a.stringOf].x, nodes[a.stringOf].y); ctx.lineTo(nodes[a.symbol].x, nodes[a.symbol].y);
      ctx.strokeStyle = "rgba(110,224,138,.35)"; ctx.stroke();
    });
    ctx.textAlign = "center"; ctx.font = "11px ui-sans-serif,system-ui";
    Object.values(state.shafts).forEach(a => {
      const n = nodes[a.symbol]; if (!n) return; const sel = a.symbol === state.selected;
      ctx.beginPath(); ctx.arc(n.x, n.y, sel ? 15 : 10, 0, Math.PI * 2);
      ctx.fillStyle = a.hit ? "#6ee08a" : sel ? "#d4b45a" : "#1d3a24"; ctx.fill(); ctx.strokeStyle = "#d4b45a"; ctx.stroke();
      ctx.fillStyle = "#e8f3e4"; ctx.fillText(a.symbol, n.x, n.y + 24);
    });
  }
  function paintForest() {
    const a = state.shafts[state.selected]; if (!a) return;
    const nxt = nextName(); const count = Object.keys(state.shafts).length;
    const can = a.draw >= a.drawTarget && count < state.maxShafts && !!nxt && state.connected;
    const lab = !state.connected ? "Connect to nock" : can ? ("Nock " + nxt[0]) : nxt ? "Draw not full" : "Bank empty";
    document.querySelectorAll("[data-nock]").forEach(el => { el.disabled = !can; el.textContent = lab; });
    const hint = document.getElementById("nock-hint");
    if (hint) {
      if (!state.connected) hint.textContent = "Connect (or demo) to buy and nock.";
      else if (!nxt) hint.textContent = "Name bank empty — no more shafts this sprint.";
      else if (a.draw < a.drawTarget) hint.textContent = "Need " + (a.drawTarget - a.draw) + " more draw on " + a.symbol + ". Buys fill; sells never do.";
      else hint.textContent = "Draw full on " + a.symbol + ". Nock looses " + nxt[0] + ".";
    }
    if (!document.getElementById("sel-name")) { drawForest(); return; }
    document.getElementById("sel-art").src = art(a.symbol);
    document.getElementById("sel-kicker").textContent = a.hit ? "Hit the mark" : "String " + a.generation;
    document.getElementById("sel-name").textContent = a.name;
    document.getElementById("sel-sym").textContent = a.symbol + " · quarry " + a.quarry;
    const pathEl = document.getElementById("sel-path"); if (pathEl) pathEl.textContent = path(a.symbol);
    document.getElementById("sel-blurb").textContent = blurb(a.symbol);
    document.getElementById("meter-fill").style.width = Math.min(100, (a.draw / a.drawTarget) * 100) + "%";
    document.getElementById("meter-label").textContent = a.draw + " / " + a.drawTarget + " draw";
    document.getElementById("cap-label").textContent = count + " / " + state.maxShafts;
    const nt = nxt ? ("Next shaft: " + nxt[1] + " · " + nxt[0]) : "Name bank empty";
    const nn = document.getElementById("next-name"); if (nn) nn.textContent = nt;
    const hudC = document.getElementById("hud-count"); if (hudC) hudC.textContent = String(count);
    const hudN = document.getElementById("hud-next"); if (hudN) hudN.textContent = nxt ? nxt[0] : "—";
    const bandEl = document.getElementById("band-list");
    if (bandEl) bandEl.innerHTML = band(a.symbol).map(c => "<li><a href='shaft.html?id="+c.symbol+"'>"+c.name+"</a>"+(c.hit?" <em class='hit'>HIT</em>":"")+"<span class='meta'>"+c.symbol+"</span></li>").join("") || "<li><span class='meta'>No shafts in this band</span></li>";
    drawForest();
  }

  function paintPortfolio() {
    const card = document.getElementById("id-card");
    if (card) {
      const who = state.account ? state.account.slice(0, 6) + "…" + state.account.slice(-4) : (state.demo ? "demo archer" : "not connected");
      const how = state.kind === "agent" ? ("Inferred agent · " + (state.via || "cli")) : "Inferred human · browser";
      card.innerHTML = "<div><b>" + kindBadge(state.kind) + "</b><div class='meta'>" + how + "</div><div class='meta'>" + (state.label || "") + (state.model ? " · " + state.model : "") + "</div><div class='meta'>" + who + "</div></div><span class='hit'>equal rules</span>";
    }
    const list = Object.values(state.shafts).filter(x => x.archer === me() || (state.demo && x.archer === "demo"));
    const portList = document.getElementById("port-list") || document.getElementById("hold-list");
    if (portList) {
      portList.innerHTML = list.map(x =>
        "<li><span>" + x.symbol + " · " + kindBadge(x.kind || state.kind) + "</span><span class='meta'>bag " + (x.bag || 0) + " · fees " + (x.fees || 0).toFixed(3) + "</span></li>"
      ).join("") || "<li class='meta'>Nock to fill this portfolio</li>";
    }
    const lar = document.getElementById("port-larder") || document.getElementById("larder-line");
    if (lar) lar.textContent = state.larder.toFixed(3) + " quarry locked · claimed " + state.claimed.toFixed(3);
    const note = document.getElementById("equal-note");
    if (note) note.textContent = "Kind is inferred. A browser session is human. An agent arrives through the CLI or agent.json handshake — no form, no CAPTCHA. Same draw meter, 17-name bank, 50/35/10/5 split, and cap.";
  }
  function setKind() { /* kind is inferred; buttons removed */ }
  function saveCard() { toast("Card is inferred — nothing to save"); }
  function exportCard() {
    const payload = {
      protocol: "QUIVER", chainId: 4663, sandbox: true, spawningEnabled: false,
      kind: state.kind, label: state.label, model: state.model,
      account: state.account, demo: state.demo,
      holdings: Object.values(state.shafts).filter(x => x.archer === me() || (state.demo && x.archer === "demo")),
      larder: state.larder, claimed: state.claimed,
      fairness: {
        humansAndAgents: "equal",
        sameDrawMeter: true,
        sameNameBank: true,
        sameFeeSplit: [50, 35, 10, 5],
        noCaptcha: true,
        noAgentOnlyPools: true,
        unlabeledCanTrade: true
      },
      howAgentsNock: "Inferred kind. Buy until draw full. factory.nock separate from afterSwap. Non-empty hookData required."
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "quiver-portfolio.json"; a.click();
    toast("Portfolio JSON exported");
  }

  window.QuiverApp = { state, connect, buy, sell, nock, claim, refresh, paint, paintForest, paintWallet, paintPortfolio, paintLists, drawForest, toast, setKind, saveCard, exportCard };
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-act]");
    if (!b) return;
    ev.preventDefault();
    const act = b.getAttribute("data-act");
    if (act === "connect") connect();
    if (act === "buy") buy();
    if (act === "sell") sell();
    if (act === "nock") nock();
    if (act === "claim") claim();
    if (act === "refresh") refresh();
    if (act === "export-card") exportCard();
  });
  function paintLists() {
    const mine = Object.values(state.shafts).filter(x => x.archer === me() || (state.demo && x.archer === "demo"));
    const claimable = mine.reduce((s,x)=>s+(x.fees||0),0);
    const bagTotal = mine.reduce((s,x)=>s+(x.bag||0),0);
    const qvL = document.getElementById("qv-loosed"); if (qvL) qvL.textContent = String(mine.length);
    const qvC = document.getElementById("qv-claimable"); if (qvC) qvC.textContent = claimable.toFixed(3);
    const qvB = document.getElementById("qv-bag"); if (qvB) qvB.textContent = String(bagTotal);
    const claimBtn = document.getElementById("claim-btn"); if (claimBtn) { claimBtn.disabled = !state.connected || claimable <= 0; claimBtn.textContent = claimable > 0 ? ("Claim " + claimable.toFixed(3)) : "Nothing to claim"; }
    const hold = document.getElementById("hold-list");
    if (hold) hold.innerHTML = mine.map(x => "<li><span><a href='shaft.html?id="+x.symbol+"'>"+x.symbol+"</a>"+(x.hit?" · hit":"")+" <span class='meta'>gen "+x.generation+(x.stringOf?" · from "+x.stringOf:"")+"</span></span><span class='meta'>bag "+(x.bag||0)+" · fees "+(x.fees||0).toFixed(3)+"</span></li>").join("") || "<li><span class='meta'>Nock to fill this quiver</span></li>";
    const qeh = document.getElementById("quiver-empty-hint"); if (qeh) qeh.textContent = mine.length ? "" : "Buy on a string, fill the draw, then nock. Fees and bag appear here after you loose.";
    const log = document.getElementById("log-list");
    if (log) log.innerHTML = state.log.slice(0,10).map(m => "<li>"+m+"</li>").join("");
    const lar = document.getElementById("larder-line");
    if (lar) lar.textContent = state.larder.toFixed(3) + " quarry locked · claimed " + state.claimed.toFixed(3) + " · lineage larder is shared";
  }
  document.addEventListener("DOMContentLoaded", () => {
    paint();
    const canvas = document.getElementById("forest");
    if (canvas) {
      function pickNode(ev) {
        const nodes = layout(); const r = ev.currentTarget.getBoundingClientRect();
        const pt = (ev.changedTouches && ev.changedTouches[0]) || ev;
        const x = pt.clientX - r.left, y = pt.clientY - r.top;
        let best = null, d0 = Math.max(32, Math.min(r.width, r.height) * 0.08);
        Object.entries(nodes).forEach(([sym, n]) => { const d = Math.hypot(n.x - x, n.y - y); if (d < d0) { d0 = d; best = sym; } });
        if (best) { state.selected = best; persist(); paint(); }
      }
      canvas.addEventListener("click", pickNode);
      canvas.addEventListener("touchend", (ev) => { ev.preventDefault(); pickNode(ev); }, { passive: false });
      window.addEventListener("resize", drawForest);
      if (window.visualViewport) window.visualViewport.addEventListener("resize", drawForest);
    }
    const grid = document.getElementById("cast-grid");
    if (grid) {
      grid.innerHTML = window.QUIVER_CAST.map(c =>
        "<a class='card' href='shaft.html?id="+c.symbol+"'><img src='"+c.img+"' alt='' /><div class='pad'><b>"+c.symbol+"</b>"+c.name+"</div></a>"
      ).join("");
    }
    const detail = document.getElementById("shaft-detail");
    if (detail) {
      const id = new URLSearchParams(location.search).get("id") || "LOCKSLEY";
      const c = window.QUIVER_BY[id] || window.QUIVER_CAST[0];
      detail.innerHTML = "<img class='portrait' src='"+c.img+"' alt='' /><p class='kicker'>"+c.role+"</p><h2>"+c.name+"</h2><p class='lede'><b>"+c.symbol+"</b> — "+c.lore+"</p><p><a class='btn gold' href='forest.html'>Loose from the forest</a> <a class='btn ghost' href='lore.html'>All shafts</a></p>";
      document.title = c.name + " — QUIVER";
    }
  });
})();
