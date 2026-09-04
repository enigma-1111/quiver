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
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.shafts) Object.assign(state, s); } catch (e) {}
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        selected: state.selected, connected: state.connected, account: state.account, demo: state.demo,
        kind: state.kind, label: state.label, model: state.model,
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
    const c = window.QUIVER_BY && window.QUIVER_BY[sym];
    return (c && c.img) || "img/mark.jpg";
  }
  async function connect() {
    if (state.connected && !state.demo) { state.connected = false; state.account = null; state.demo = true; persist(); paintWallet(); toast("Disconnected"); return paintForest(); }
    const eth = window.ethereum;
    if (!eth) { state.connected = true; state.demo = true; persist(); paintWallet(); toast("No wallet · demo archer"); return paintForest(); }
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
    persist(); paintWallet(); paintForest();
  }
  function paintWallet() {
    document.querySelectorAll("[data-wallet]").forEach(el => {
      el.textContent = state.connected ? (state.demo ? "Demo archer" : state.account.slice(0,6)+"…"+state.account.slice(-4)) : "Connect";
    });
  }
  function buy() {
    if (!state.connected) return toast("Connect first");
    const a = state.shafts[state.selected];
    a.draw = Math.min(a.drawTarget, a.draw + 14); a.fees += 0.004; state.larder += 0.001;
    if (a.draw >= a.drawTarget && a.generation >= 1 && a.drawTarget >= 120) a.hit = true;
    state.log.unshift("Buy " + a.symbol); persist(); toast("Buy on " + a.symbol); paintForest();
  }
  function sell() {
    if (!state.connected) return toast("Connect first");
    state.shafts[state.selected].fees += 0.003;
    state.log.unshift("Sell " + state.selected + " · no nock"); persist(); toast("Sell · no nock"); paintForest();
  }
  function nock() {
    if (!state.connected) return toast("Connect first");
    const p = state.shafts[state.selected], n = nextName();
    if (!n || p.draw < p.drawTarget) return toast("Draw not full");
    if (Object.keys(state.shafts).length >= state.maxShafts) return toast("Cap reached");
    state.shafts[n[0]] = shaft(n[0], n[1], p.symbol, p.generation + 1, me(), 0, p.hit ? p.drawTarget + 20 : 100 + p.generation * 10, false, 0, 250, state.kind || "unset");
    p.draw = 0; state.larder += 0.01; state.selected = n[0];
    state.log.unshift("Nocked " + n[0] + (state.kind !== "unset" ? " · " + state.kind : ""));
    persist(); toast("Nocked " + n[0]); paintForest();
  }
  function claim() {
    const mine = Object.values(state.shafts).filter(x => x.archer === me() || (state.demo && x.archer === "demo"));
    const amt = mine.reduce((s,x)=>s+(x.fees||0),0);
    if (amt <= 0) return toast("Nothing to claim");
    mine.forEach(x => { state.claimed += x.fees || 0; x.fees = 0; });
    state.log.unshift("Claimed " + amt.toFixed(3)); persist(); toast("Claimed " + amt.toFixed(3)); paintForest(); paintPortfolio();
  }
  function refresh() { persist(); paintForest(); toast("Refreshed"); }
  function layout() {
    const canvas = document.getElementById("forest"); if (!canvas) return {};
    const w = canvas.clientWidth || 360, h = canvas.clientHeight || 320;
    const cx = w/2, cy = h/2, nodes = {};
    const gens = {};
    Object.values(state.shafts).forEach(s => { (gens[s.generation] = gens[s.generation] || []).push(s); });
    Object.keys(gens).sort((a,b)=>a-b).forEach(g => {
      const list = gens[g], n = list.length, r = 28 + Number(g)*42;
      list.forEach((s,i) => {
        const a = (i / Math.max(1,n)) * Math.PI * 2 - Math.PI/2;
        nodes[s.symbol] = { x: cx + Math.cos(a)*r, y: cy + Math.sin(a)*r, s };
      });
    });
    if (nodes.QUIVER) { nodes.QUIVER.x = cx; nodes.QUIVER.y = cy; }
    return nodes;
  }
  function drawForest() {
    const canvas = document.getElementById("forest"); if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.scale(dpr, dpr);
    ctx.clearRect(0,0,w,h);
    const nodes = layout();
    // rings
    const maxG = Math.max(0, ...Object.values(state.shafts).map(s => s.generation));
    for (let g=1; g<=maxG+1; g++) {
      ctx.beginPath(); ctx.arc(w/2, h/2, 28 + g*42, 0, Math.PI*2);
      ctx.strokeStyle = "rgba(120,180,100," + (0.08 + g*0.02) + ")"; ctx.lineWidth = 1; ctx.stroke();
    }
    // edges
    Object.values(state.shafts).forEach(s => {
      if (!s.stringOf || !nodes[s.stringOf] || !nodes[s.symbol]) return;
      const a = nodes[s.stringOf], b = nodes[s.symbol];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = "rgba(180,160,80,0.35)"; ctx.lineWidth = 1.5; ctx.stroke();
    });
    // nodes
    Object.entries(nodes).forEach(([sym, n]) => {
      const sel = sym === state.selected;
      const r = sel ? 14 : 10;
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2);
      ctx.fillStyle = sel ? "#c9a227" : (n.s.hit ? "#3d8b5a" : "#1a3a28");
      ctx.fill();
      if (sel) { ctx.strokeStyle = "#f0d78c"; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.fillStyle = "#e8f0e4"; ctx.font = "10px system-ui"; ctx.textAlign = "center";
      ctx.fillText(sym, n.x, n.y + r + 12);
      if (n.s.quarry) {
        ctx.fillStyle = "rgba(200,180,100,0.7)"; ctx.font = "8px system-ui";
        ctx.fillText(n.s.quarry, n.x, n.y + r + 22);
      }
    });
  }
  function paintForest() {
    drawForest();
    paintLists();
    paintPortfolio();
    const a = state.shafts[state.selected]; if (!a) return;
    const nxt = nextName();
    const can = state.connected && !!nxt && Object.keys(state.shafts).length < state.maxShafts && a.draw >= a.drawTarget;
    const lab = !state.connected ? "Connect to nock" : can ? ("Nock " + nxt[0]) : nxt ? "Draw not full" : "Bank empty";
    document.querySelectorAll("[data-nock]").forEach(el => { el.disabled = !can; el.textContent = lab; });
    const meter = document.getElementById("draw-meter") || document.getElementById("loose-meter-fill");
    if (meter) meter.style.width = Math.min(100, (a.draw / a.drawTarget) * 100) + "%";
    const ml = document.getElementById("meter-label") || document.getElementById("loose-meter-label");
    if (ml) ml.textContent = a.draw + " / " + a.drawTarget + " draw";
    const hint = document.getElementById("nock-hint") || document.getElementById("loose-nock-reason");
    if (hint) {
      let reason = "Select a string, buy until full, then nock.";
      if (!state.connected) reason = "Connect (or demo) to buy and nock.";
      else if (!nxt) reason = "Name bank exhausted.";
      else if (a.draw < a.drawTarget) reason = "Need " + (a.drawTarget - a.draw) + " more draw on " + a.symbol;
      else reason = "Ready · two-step nock";
      hint.textContent = reason;
    }
    const selName = document.getElementById("sel-name"); if (selName) selName.textContent = a.name || a.symbol;
    const selSym = document.getElementById("sel-sym"); if (selSym) selSym.textContent = a.symbol + " · quarry " + (a.quarry || "USDG");
  }
  function paintPortfolio() {
    const card = document.getElementById("id-card");
    if (card) {
      const who = state.account ? state.account.slice(0, 6) + "…" + state.account.slice(-4) : (state.demo ? "demo archer" : "not connected");
      card.innerHTML = "<div><b>" + kindBadge(state.kind) + "</b><div class='meta'>" + (state.label || "no label") + (state.model ? " · " + state.model : "") + "</div><div class='meta'>" + who + "</div></div><span class='hit'>equal rules</span>";
    }
    const lab = document.getElementById("id-label");
    const mod = document.getElementById("id-model");
    if (lab && document.activeElement !== lab) lab.value = state.label || "";
    if (mod && document.activeElement !== mod) mod.value = state.model || "";
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
    if (note) note.textContent = "Unlabeled wallets can buy and sell. Nock records the kind declared at that moment. No CAPTCHA. Same draw meter, 17-name bank, 50/35/10/5 split, and cap. Empty hookData cannot nock.";
  }
  function setKind(k) {
    state.kind = k;
    toast(k === "agent" ? "Labeled AI agent" : "Labeled human");
    persist();
    paintPortfolio();
    paintForest();
  }
  function saveCard() {
    const labEl = document.getElementById("id-label");
    const modEl = document.getElementById("id-model");
    const lab = ((labEl && labEl.value) || "").trim().slice(0, 64);
    const mod = ((modEl && modEl.value) || "").trim().slice(0, 64);
    if (!lab) return toast("Add a label");
    if (state.kind !== "human" && state.kind !== "agent") return toast("Pick human or agent first");
    state.label = lab;
    state.model = state.kind === "agent" ? mod : "";
    state.log.unshift("Declared " + state.kind + " · " + lab);
    toast(kindBadge(state.kind) + " · " + lab);
    persist();
    paintPortfolio();
  }
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
      howAgentsNock: "Declare kind, buy until draw full, factory.nock separate from afterSwap, non-empty hookData required"
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "quiver-portfolio.json"; a.click();
    toast("Portfolio JSON exported");
  }

  window.QuiverApp = { state, connect, buy, sell, nock, claim, refresh, paintForest, paintWallet, paintPortfolio, drawForest, toast, setKind, saveCard, exportCard };
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
    if (act === "kind-human") setKind("human");
    if (act === "kind-agent") setKind("agent");
    if (act === "save-card") saveCard();
    if (act === "export-card") exportCard();
  });
  function paintLists() {
    const mine = Object.values(state.shafts).filter(x => x.archer === me() || (state.demo && x.archer === "demo"));
    const claimable = mine.reduce((s,x)=>s+(x.fees||0),0);
    const bagTotal = mine.reduce((s,x)=>s+(x.bag||0),0);
    const qvL = document.getElementById("qv-loosed"); if (qvL) qvL.textContent = String(mine.length);
    const qvC = document.getElementById("qv-claimable"); if (qvC) qvC.textContent = claimable.toFixed(3);
    const qvB = document.getElementById("qv-bag"); if (qvB) qvB.textContent = String(bagTotal);
    const hold = document.getElementById("hold-list") || document.getElementById("qv-hold");
    if (hold) hold.innerHTML = mine.map(x => "<li><span><a href='shaft.html?id="+x.symbol+"'>"+x.symbol+"</a>"+(x.hit?" · hit":"")+" <span class='meta'>gen "+x.generation+(x.stringOf?" · from "+x.stringOf:"")+"</span></span><span class='meta'>bag "+(x.bag||0)+" · fees "+(x.fees||0).toFixed(3)+"</span></li>").join("") || "<li><span class='meta'>Nock to fill this quiver</span></li>";
    const qeh = document.getElementById("quiver-empty-hint"); if (qeh) qeh.textContent = mine.length ? "" : "Buy on a string, fill the draw, then nock. Fees and bag appear here after you loose.";
    const log = document.getElementById("log-list");
    if (log) log.innerHTML = state.log.slice(0,10).map(m => "<li>"+m+"</li>").join("");
    const lar = document.getElementById("larder-line");
    if (lar) lar.textContent = state.larder.toFixed(3) + " quarry locked · claimed " + state.claimed.toFixed(3) + " · lineage larder is shared";
  }
  document.addEventListener("DOMContentLoaded", () => {
    paintWallet();
    paintLists();
    paintPortfolio();
    const canvas = document.getElementById("forest");
    if (canvas) {
      function pickNode(ev) {
        const nodes = layout(); const r = ev.currentTarget.getBoundingClientRect();
        const pt = (ev.changedTouches && ev.changedTouches[0]) || ev;
        const x = pt.clientX - r.left, y = pt.clientY - r.top;
        let best = null, d0 = Math.max(32, Math.min(r.width, r.height) * 0.08);
        Object.entries(nodes).forEach(([sym, n]) => { const d = Math.hypot(n.x - x, n.y - y); if (d < d0) { d0 = d; best = sym; } });
        if (best) { state.selected = best; persist(); paintForest(); }
      }
      canvas.addEventListener("click", pickNode);
      canvas.addEventListener("touchend", (ev) => { ev.preventDefault(); pickNode(ev); }, { passive: false });
      window.addEventListener("resize", drawForest);
      if (window.visualViewport) window.visualViewport.addEventListener("resize", drawForest);
      paintForest();
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
