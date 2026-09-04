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
  // Famous-first order from QUIVER_CAST / NameBank. No Q prefix. Skips used symbols.
  function nextName() { return NAME_BANK.find(n => !state.shafts[n[0]]) || null; }
  function bankRemaining() { return NAME_BANK.filter(n => !state.shafts[n[0]]).length; }
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
    const W = window.QuiverWallet;
    if (!W) {
      state.connected = true; state.demo = true; state.account = null;
      persist(); toast("No wallet module · demo archer"); return paint();
    }
    const res = await W.connect();
    if (res.ok) {
      state.connected = true; state.demo = false; state.account = res.account;
      persist(); toast("Connected " + W.short(res.account)); paint();
    } else {
      state.connected = true; state.demo = true; state.account = null;
      persist(); toast(res.error || "Demo archer"); paint();
    }
  }
  function buy() {
    if (!state.connected) return toast("Connect first");
    const p = state.shafts[state.selected];
    if (!p) return;
    p.draw = Math.min(p.drawTarget, p.draw + 14);
    p.bag = (p.bag || 0) + 50;
    state.log.unshift("Buy on " + p.symbol + " · draw " + p.draw + "/" + p.drawTarget + (p.draw >= p.drawTarget ? " FULL" : ""));
    persist();
    toast(p.draw >= p.drawTarget ? "Draw FULL · ready to nock" : "Buy +14 draw");
    paint();
  }
  function sell() {
    if (!state.connected) return toast("Connect first");
    const p = state.shafts[state.selected];
    if (!p) return;
    state.log.unshift("Sell on " + p.symbol + " · draw does not fill");
    persist();
    toast("Sell · draw does not fill");
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
  function paint() {
    document.querySelectorAll("[data-act]").forEach(el => {
      const act = el.getAttribute("data-act");
      el.onclick = act === "connect" ? connect : act === "buy" ? buy : act === "sell" ? sell : act === "nock" ? nock : act === "claim" ? claim : null;
    });
    document.querySelectorAll("[data-wallet]").forEach(el => {
      if (state.connected && !state.demo && state.account) {
        el.textContent = window.QuiverWallet ? window.QuiverWallet.short(state.account) : state.account.slice(0, 6) + "…";
        el.title = "Tap to disconnect";
      } else if (state.connected && state.demo) {
        el.textContent = "Demo";
        el.title = "Demo archer · connect real wallet";
      } else {
        el.textContent = "Connect";
        el.title = "Connect wallet or use demo";
      }
    });
    const log = document.getElementById("log-list");
    if (log) log.innerHTML = (state.log || []).map(m => "<li><span>" + m + "</span></li>").join("");
    paintForest();
    paintPortfolio();
    const hold = document.getElementById("hold-list");
    if (hold) {
      const list = Object.values(state.shafts).filter(x => x.archer === me() || (state.demo && x.archer === "demo"));
      hold.innerHTML = list.map(x => "<li><span>" + x.symbol + "</span><span class='meta'>bag " + (x.bag || 0) + " · fees " + (x.fees || 0).toFixed(3) + "</span></li>").join("") || "<li class='meta'>Nock to fill this quiver</li>";
    }
    const claimBtn = document.querySelector("[data-act=claim]");
    if (claimBtn) {
      let s = 0;
      Object.values(state.shafts).forEach(x => { if (x.archer === me() || (state.demo && x.archer === "demo")) s += x.fees; });
      claimBtn.textContent = s ? "Claim " + s.toFixed(3) : "Claim";
      claimBtn.disabled = !s;
    }
    const lar = document.getElementById("larder-line");
    if (lar) lar.textContent = state.larder.toFixed(3) + " quarry locked · claimed " + state.claimed.toFixed(3);
  }
  function layout() {
    const canvas = document.getElementById("forest");
    if (!canvas) return {};
    const r = canvas.getBoundingClientRect();
    const cx = r.width / 2, cy = r.height / 2;
    const nodes = { QUIVER: { x: cx, y: cy } };
    const gens = {};
    Object.values(state.shafts).forEach(a => {
      if (a.symbol === "QUIVER") return;
      const g = a.generation || 1;
      if (!gens[g]) gens[g] = [];
      gens[g].push(a.symbol);
    });
    Object.keys(gens).sort((a, b) => a - b).forEach(g => {
      const ring = gens[g];
      const rad = Math.min(r.width, r.height) * (0.18 + 0.12 * (g - 1));
      ring.forEach((sym, i) => {
        const ang = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
        nodes[sym] = { x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad };
      });
    });
    return nodes;
  }
  function drawForest() {
    const canvas = document.getElementById("forest");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, r.width, r.height);
    const nodes = layout();
    // rings
    const maxG = Math.max(0, ...Object.values(state.shafts).map(a => a.generation || 0));
    for (let g = 1; g <= Math.max(3, maxG + 1); g++) {
      const rad = Math.min(r.width, r.height) * (0.18 + 0.12 * (g - 1));
      ctx.beginPath(); ctx.arc(r.width / 2, r.height / 2, rad, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(110,224,138,0.12)"; ctx.lineWidth = 1; ctx.stroke();
    }
    // center glow
    const grd = ctx.createRadialGradient(r.width / 2, r.height / 2, 0, r.width / 2, r.height / 2, 40);
    grd.addColorStop(0, "rgba(212,180,90,0.25)"); grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(r.width / 2, r.height / 2, 40, 0, Math.PI * 2); ctx.fill();
    // edges
    Object.values(state.shafts).forEach(a => {
      if (!a.stringOf || !nodes[a.symbol] || !nodes[a.stringOf]) return;
      const from = nodes[a.stringOf], to = nodes[a.symbol];
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = "rgba(212,180,90,0.35)"; ctx.lineWidth = 1.2; ctx.stroke();
    });
    // nodes
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
      const left = bankRemaining();
      if (!state.connected) hint.textContent = "Connect (or demo) to buy and nock. Bank has " + left + " unused names (famous first, no Q prefix).";
      else if (!nxt) hint.textContent = "Name bank empty — no more shafts this sprint.";
      else if (a.draw < a.drawTarget) hint.textContent = "Need " + (a.drawTarget - a.draw) + " more draw on " + a.symbol + ". Buys fill; sells never do. Next: " + nxt[0] + " · " + left + " left.";
      else hint.textContent = "Draw full on " + a.symbol + ". Nock looses " + nxt[0] + " (" + left + " remaining in bank).";
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

  window.QuiverForest = { state, paint, connect, buy, sell, nock, claim, nextName, bankRemaining };
  document.addEventListener("DOMContentLoaded", function () {
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
    const detail = document.getElementById("shaft-detail");
    if (detail) {
      const id = new URLSearchParams(location.search).get("id") || "LOCKSLEY";
      const c = window.QUIVER_BY[id] || window.QUIVER_CAST[0];
      detail.innerHTML = "<img class='portrait' src='"+c.img+"' alt='' /><p class='kicker'>"+c.role+"</p><h2>"+c.name+"</h2><p class='lede'><b>"+c.symbol+"</b> — "+c.lore+"</p><p><a class='btn gold' href='forest.html'>Loose from the forest</a> <a class='btn ghost' href='lore.html'>All shafts</a></p>";
      document.title = c.name + " — QUIVER";
    }
    paint();
  });
})();
