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
    if (state.connected && !state.demo) {
      if (window.QuiverWallet) window.QuiverWallet.disconnect();
      state.connected = false; state.account = null; state.demo = true;
      persist(); toast("Disconnected"); return paint();
    }
    if (state.connected && state.demo) {
      state.connected = false; state.account = null; state.demo = true;
      persist(); toast("Demo closed"); return paint();
    }
    const W = window.QuiverWallet;
    if (!W) {
      state.connected = true; state.demo = true; state.account = null;
      persist(); toast("No wallet module · demo archer"); return paint();
    }
    const res = await W.connect();
    if (res.ok) {
      state.connected = true; state.demo = false; state.account = res.account;
      toast("Connected on 4663 · " + W.short(res.account));
    } else if (res.reason === "no_provider") {
      state.connected = true; state.demo = true; state.account = null;
      toast("No wallet · demo archer");
    } else {
      toast(res.reason || "Wallet rejected");
    }
    persist(); paint();
  }
  function paintWallet() {
    const W = window.QuiverWallet;
    document.querySelectorAll("[data-wallet]").forEach(el => {
      if (!state.connected) {
        el.textContent = "Connect";
        el.title = "Connect wallet or use demo";
      } else if (state.demo) {
        el.textContent = "Demo archer";
        el.title = "Tap to close demo";
      } else {
        el.textContent = W ? W.short(state.account) : (state.account.slice(0,6)+"…"+state.account.slice(-4));
        el.title = "Tap to disconnect · chain 4663";
      }
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
    if (p.draw < p.drawTarget) return toast("Need " + (p.drawTarget - p.draw) + " more draw · buy fills, sell does not");
    state.shafts[n[0]] = shaft(n[0], n[1], p.symbol, p.generation + 1, me(), 0, p.hit ? p.drawTarget + 20 : 100 + p.generation * 10, false, 0, 250, state.kind || "unset");
    p.draw = 0; state.selected = n[0];
    state.log.unshift("Nocked " + n[0] + " from " + p.symbol);
    persist(); toast("Loosed " + n[0] + " · quarry " + p.quarry);
    paint();
  }
  function claim() {
    if (!state.connected) return toast("Connect first");
    let s = 0;
    Object.values(state.shafts).forEach(x => { if (x.archer === me() || (state.demo && x.archer === "demo")) { s += x.fees; x.fees = 0; } });
    state.claimed += s; persist(); toast(s ? "Claimed " + s.toFixed(3) : "Nothing to claim"); paint();
  }
  function refresh() {
    const keep = { connected: state.connected, account: state.account, demo: state.demo };
    try { localStorage.removeItem(KEY); } catch (e) {}
    state = Object.assign(seed(), keep); persist(); toast("Forest refreshed"); paint();
  }
  function setKind() {}
  function saveCard() { persist(); toast("Card saved"); }
  function exportCard() {
    const payload = {
      protocol: "QUIVER", chainId: 4663, sandbox: true, spawningEnabled: false,
      kind: state.kind, label: state.label, model: state.model, via: state.via,
      account: state.account, demo: state.demo,
      holdings: Object.values(state.shafts).filter(x => x.archer === me() || (state.demo && x.archer === "demo")),
      fairness: {
        sameMeter: true, sameNock: true, sameBank: true, sameSplit: true, sameCap: true,
        noCaptcha: true, noAgentOnlyPools: true, noCheaperAgentFees: true,
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
    if (window.QuiverWallet) {
      window.QuiverWallet.onAccountsChanged(function (addr) {
        if (!addr) {
          state.connected = false; state.account = null; state.demo = true;
          toast("Wallet disconnected");
        } else {
          state.connected = true; state.demo = false; state.account = addr;
          toast("Account " + window.QuiverWallet.short(addr));
        }
        persist(); paint();
      });
      window.QuiverWallet.onChainChanged(function (chainId) {
        const id = typeof chainId === "string" ? parseInt(chainId, 16) : chainId;
        if (id !== 4663) {
          toast("Wrong chain · switch to 4663");
        } else {
          toast("On Robinhood Chain 4663");
        }
      });
    }
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
  });

  // rest of file (paintForest etc) kept from prior; truncated in this push payload if needed — full file follows in workspace
})();
