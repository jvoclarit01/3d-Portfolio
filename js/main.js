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
      for (var i = 0; i < text.length; i++) {
        var node = wrapChar(text[i]);
        if (node.nodeType === 1) {
          node.firstChild.style.transitionDelay = (idx * 0.022) + "s";
          idx++;
        }
        line.appendChild(node);
      }
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

  // ---------- experience carousel ----------
  function initCarousel() {
    var track = document.getElementById("teamTrack");
    var prev = document.getElementById("prevSlide");
    var next = document.getElementById("nextSlide");
    if (!track || !prev || !next) return;
    var index = 0;

    function maxIndex() {
      var cards = track.children;
      if (!cards.length) return 0;
      var cardW = cards[0].getBoundingClientRect().width + 24; // gap
      var visible = Math.max(1, Math.floor(track.parentNode.getBoundingClientRect().width / cardW));
      return Math.max(0, cards.length - visible);
    }
    function update() {
      var cardW = track.children[0].getBoundingClientRect().width + 24;
      track.style.transform = "translateX(" + (-index * cardW) + "px)";
      prev.disabled = index <= 0;
      next.disabled = index >= maxIndex();
      prev.style.opacity = prev.disabled ? 0.4 : 1;
      next.style.opacity = next.disabled ? 0.4 : 1;
    }
    prev.addEventListener("click", function () { index = Math.max(0, index - 1); update(); });
    next.addEventListener("click", function () { index = Math.min(maxIndex(), index + 1); update(); });
    window.addEventListener("resize", function () { index = Math.min(index, maxIndex()); update(); });
    update();
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
    initCarousel();
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
