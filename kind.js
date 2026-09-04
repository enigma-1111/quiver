(function () {
  function handshake() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.get("kind") === "agent" || q.get("agent") === "1") {
        var card = {
          kind: "agent",
          label: String(q.get("label") || "cli archer").slice(0, 64),
          model: String(q.get("model") || "").slice(0, 64),
          via: "cli"
        };
        sessionStorage.setItem("quiver.agent.handshake", JSON.stringify(card));
        return card;
      }
      var raw = sessionStorage.getItem("quiver.agent.handshake");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    if (window.QUIVER_AGENT) {
      var a = window.QUIVER_AGENT;
      return { kind: "agent", label: String(a.label || "embedded agent").slice(0, 64), model: String(a.model || "").slice(0, 64), via: "embed" };
    }
    return { kind: "human", label: "browser archer", model: "", via: "browser" };
  }
  function apply() {
    var inferred = handshake();
    var app = window.QuiverApp;
    if (app && app.state) {
      app.state.kind = inferred.kind;
      app.state.via = inferred.via;
      app.state.label = inferred.kind === "agent" ? inferred.label : (app.state.account ? app.state.account.slice(0, 6) + "\u2026" + app.state.account.slice(-4) : "browser archer");
      app.state.model = inferred.kind === "agent" ? inferred.model : "";
    }
    document.querySelectorAll("[data-act='kind-human'],[data-act='kind-agent'],[data-act='save-card']").forEach(function (el) { el.remove(); });
    ["id-label", "id-model"].forEach(function (id) {
      var n = document.getElementById(id);
      if (n && n.parentElement) n.parentElement.remove();
    });
    var card = document.getElementById("id-card");
    if (card) {
      var who = (app && app.state && app.state.account) ? app.state.account.slice(0, 6) + "\u2026" + app.state.account.slice(-4) : "demo archer";
      var how = inferred.kind === "agent" ? ("Inferred agent \u00b7 " + inferred.via) : "Inferred human \u00b7 browser";
      card.innerHTML = "<div><b>" + (inferred.kind === "agent" ? "AI agent" : "Human") + "</b><div class='meta'>" + how + "</div><div class='meta'>" + inferred.label + (inferred.model ? " \u00b7 " + inferred.model : "") + "</div><div class='meta'>" + who + "</div></div><span class='hit'>equal rules</span>";
    }
    var note = document.getElementById("equal-note");
    if (note) note.textContent = "Kind is inferred. A browser session is human. An agent arrives through the CLI or agent.json handshake \u2014 no form, no CAPTCHA.";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();
})();
