// ============================================================
//  main.js — loader, split-text, scroll reveals, carousel
//  Accessibility: respects prefers-reduced-motion, keeps focus
//  order intact, never hides content from assistive tech.
// ============================================================
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(hover: none)").matches;

  // ---------- helpers ----------
  function wrapChar(ch) {
    if (ch === " ") return document.createTextNode(" ");
    var outer = document.createElement("span");
    outer.className = "cr";
    outer.setAttribute("aria-hidden", "false");
    var inner = document.createElement("span");
    inner.className = "cr__inner";
    inner.textContent = ch;
    outer.appendChild(inner);
    return outer;
  }

  // Split heading text into per-char wipe-up spans (decorative, text stays readable).
  function splitChars(el) {
    var lines = el.children.length ? Array.prototype.slice.call(el.children) : [el];
    lines.forEach(function (line) {
      var text = line.textContent;
      line.textContent = "";
      var idx = 0;
      // split into words + whitespace so lines only break between words
      var tokens = text.split(/(\s+)/);
      tokens.forEach(function (tok) {
        if (tok === "") return;
        if (/^\s+$/.test(tok)) { line.appendChild(document.createTextNode(tok)); return; }
        var word = document.createElement("span");
        word.className = "crword";
        for (var i = 0; i < tok.length; i++) {
          var outer = document.createElement("span");
          outer.className = "cr";
          var inner = document.createElement("span");
          inner.className = "cr__inner";
          inner.textContent = tok[i];
          inner.style.transitionDelay = (idx * 0.022) + "s";
          idx++;
          outer.appendChild(inner);
          word.appendChild(outer);
        }
        line.appendChild(word);
      });
    });
  }

  // Split [data-split-lines] child spans into rotate-in lines.
  function splitLines(el) {
    var spans = Array.prototype.slice.call(el.querySelectorAll("span"));
    if (!spans.length) spans = [el];
    spans.forEach(function (span, i) {
      var txt = span.textContent;
      var sl = document.createElement("span");
      sl.className = "sl";
      var inner = document.createElement("span");
      inner.className = "sl__inner";
      inner.textContent = txt;
      inner.style.transitionDelay = (i * 0.09) + "s";
      sl.appendChild(inner);
      span.textContent = "";
      span.appendChild(sl);
    });
  }

  // Build hover char-wipe for nav / footer links.
  function buildCharWipe(link) {
    var text = link.textContent.trim();
    var label = link.getAttribute("aria-label") || text;
    link.setAttribute("aria-label", label);
    link.textContent = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === " ") { link.appendChild(document.createTextNode(" ")); continue; }
      var cw = document.createElement("span");
      cw.className = "cw";
      cw.setAttribute("aria-hidden", "true");
      var inner = document.createElement("span");
      inner.className = "cw__inner";
      inner.style.transitionDelay = (i * 0.018) + "s";
      var a = document.createElement("span"); a.textContent = ch;
      var b = document.createElement("span"); b.textContent = ch;
      inner.appendChild(a); inner.appendChild(b);
      cw.appendChild(inner);
      link.appendChild(cw);
    }
  }

  // ---------- build all split text ----------
  function buildSplits() {
    document.querySelectorAll("[data-split-chars]").forEach(function (el) {
      if (el.tagName === "A") buildCharWipe(el);
      else splitChars(el);
    });
    document.querySelectorAll("[data-split-lines]").forEach(splitLines);
    // footer links also get the char-wipe treatment
    document.querySelectorAll(".footer__nav a:not([data-split-chars])").forEach(buildCharWipe);
  }

  // ---------- scroll reveal ----------
  function startReveals() {
    var targets = document.querySelectorAll("[data-reveal], [data-split-lines], [data-split-chars]:not(a)");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach(function (t) { t.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
    targets.forEach(function (t) { io.observe(t); });
  }

  // ---------- hero reveal (after loader lifts) ----------
  function revealHero() {
    document.querySelectorAll("#hero [data-split-chars], #hero [data-reveal]")
      .forEach(function (el) { el.classList.add("is-in"); });
  }

  // ---------- loader ----------
  function runLoader(done) {
    var loader = document.getElementById("loader");
    var count = document.getElementById("loaderCount");
    if (!loader) { done(); return; }

    requestAnimationFrame(function () { loader.classList.add("reveal"); });

    var duration = reduceMotion ? 400 : 1900;
    var start = performance.now();

    function tick(now) {
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      if (count) count.textContent = Math.round(eased * 100);
      if (p < 1) { requestAnimationFrame(tick); return; }
      loader.classList.add("complete");
      setTimeout(function () {
        loader.classList.add("loaded");
        document.body.classList.remove("is-loading");
        done();
        setTimeout(function () { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 900);
      }, reduceMotion ? 100 : 450);
    }
    requestAnimationFrame(tick);
  }

  // ---------- count-up helper ----------
  function animateCount(el, to) {
    if (reduceMotion) { el.textContent = to.toLocaleString(); return; }
    var start = performance.now(), dur = 1200;
    function step(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * to).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---------- GitHub contribution graph (placeholder) ----------
  function initContrib() {
    var graph = document.getElementById("contribGraph");
    var legend = document.getElementById("contribLegend");
    var countEl = document.getElementById("ghCount");
    if (!graph) return;

    var WEEKS = 52, total = 0;
    var frag = document.createDocumentFragment();
    for (var w = 0; w < WEEKS; w++) {
      for (var d = 0; d < 7; d++) {
        var r = Math.random();
        var level = r < 0.5 ? 0 : r < 0.72 ? 1 : r < 0.88 ? 2 : r < 0.96 ? 3 : 4;
        var cell = document.createElement("span");
        cell.className = "contrib__cell";
        cell.setAttribute("data-level", level);
        total += level * 3; // rough placeholder contribution tally
        frag.appendChild(cell);
      }
    }
    graph.appendChild(frag);

    if (legend) {
      for (var l = 0; l <= 4; l++) {
        var c = document.createElement("span");
        c.className = "contrib__cell";
        c.setAttribute("data-level", l);
        legend.appendChild(c);
      }
    }
    if (countEl) {
      if (reduceMotion || !("IntersectionObserver" in window)) {
        animateCount(countEl, total);
      } else {
        var io = new IntersectionObserver(function (e) {
          if (e[0].isIntersecting) { animateCount(countEl, total); io.disconnect(); }
        }, { threshold: 0.4 });
        io.observe(graph);
      }
    }
  }

  // ---------- Discord presence (placeholder; Lanyard-ready) ----------
  // To go live: 1) join the Lanyard Discord (https://discord.gg/lanyard)
  //             2) put your Discord user ID below. Nothing else to change.
  var DISCORD_USER_ID = ""; // e.g. "123456789012345678"

  function applyPresence(data) {
    if (!data || !data.success || !data.data) return;
    var d = data.data;
    var status = d.discord_status || "offline";
    var dot = document.getElementById("discordDot");
    var nameEl = document.getElementById("discordName");
    var stateEl = document.getElementById("discordState");
    if (dot) dot.className = "presence__dot presence__dot--" + status;
    if (nameEl && d.discord_user) nameEl.textContent = d.discord_user.global_name || d.discord_user.username;
    var label = { online: "Online", idle: "Idle", dnd: "Do Not Disturb", offline: "Offline" }[status] || "Offline";
    if (stateEl) stateEl.textContent = label;

    var act = (d.activities || []).filter(function (a) { return a.type !== 4; })[0]; // skip custom-status
    var block = document.getElementById("discordActivity");
    if (!act) { if (block) block.style.display = "none"; return; }
    if (block) block.style.display = "";
    var t = { 0: "Playing", 1: "Streaming", 2: "Listening to", 3: "Watching" }[act.type] || "Doing";
    set("discordActLabel", t);
    set("discordActTitle", act.name || "");
    set("discordActDetail", act.details || "");
    set("discordActState", act.state || "");
  }
  function set(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }

  function initPresence() {
    if (!DISCORD_USER_ID) return; // keep placeholder markup until an ID is set
    fetch("https://api.lanyard.rest/v1/users/" + DISCORD_USER_ID)
      .then(function (r) { return r.json(); })
      .then(applyPresence)
      .catch(function () { /* stay on placeholder */ });
  }

  // ---------- project thumb tilt ----------
  function initTilt() {
    if (reduceMotion || isTouch) return;
    document.querySelectorAll("[data-tilt]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -6;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 6;
        el.style.transform = "perspective(700px) rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  // ---------- boot ----------
  function init() {
    buildSplits();
    initContrib();
    initPresence();
    initTilt();
    runLoader(function () {
      revealHero();
      startReveals();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
