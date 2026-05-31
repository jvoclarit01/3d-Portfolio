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
    }, { threshold: 0.04, rootMargin: "0px 0px 50px 0px" });
    targets.forEach(function (t) { io.observe(t); });

    // Anchor-click instant reveal fallback (fixes scroll limits at bottom/footer sections)
    function forceReveal(hash) {
      if (!hash) return;
      try {
        var sec = document.querySelector(hash);
        if (sec) {
          sec.querySelectorAll("[data-reveal], [data-split-lines], [data-split-chars]:not(a)").forEach(function (el) {
            el.classList.add("is-in");
          });
        }
      } catch (err) { /* ignore invalid selector hashes */ }
    }
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function () {
        forceReveal(a.getAttribute("href"));
      });
    });
    if (window.location.hash) {
      forceReveal(window.location.hash);
    }
  }

  // ---------- hero reveal (after loader lifts) ----------
  function revealHero() {
    document.querySelectorAll("#home [data-split-chars], #home [data-reveal]")
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

  // ---------- GitHub contribution graph ----------
  function initContrib() {
    var graph = document.getElementById("contribGraph");
    var legend = document.getElementById("contribLegend");
    var countEl = document.getElementById("ghCount");
    if (!graph) return;

    // Generate placeholder grid immediately for loading state
    var WEEKS = 52;
    var frag = document.createDocumentFragment();
    for (var w = 0; w < WEEKS; w++) {
      for (var d = 0; d < 7; d++) {
        var cell = document.createElement("span");
        cell.className = "contrib__cell";
        cell.setAttribute("data-level", 0);
        frag.appendChild(cell);
      }
    }
    graph.appendChild(frag);

    if (legend && legend.children.length === 0) {
      for (var l = 0; l <= 4; l++) {
        var c = document.createElement("span");
        c.className = "contrib__cell";
        c.setAttribute("data-level", l);
        legend.appendChild(c);
      }
    }

    // Fetch real GitHub contribution data
    var username = "jvoclarit01";
    fetch("https://github-contributions-api.deno.dev/" + username + ".json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.contributions) return;
        
        // Clear placeholder cells
        graph.innerHTML = "";

        // Authoritative total from GitHub; fall back to summing the
        // daily counts so the number always reflects real activity.
        var total = data.totalContributions;
        if (typeof total !== "number") {
          total = 0;
          data.contributions.forEach(function (week) {
            week.forEach(function (day) { total += (day.contributionCount || 0); });
          });
        }
        var levelMap = {
          'NONE': 0,
          'FIRST_QUARTILE': 1,
          'SECOND_QUARTILE': 2,
          'THIRD_QUARTILE': 3,
          'FOURTH_QUARTILE': 4
        };

        var cellFrag = document.createDocumentFragment();
        data.contributions.forEach(function (week) {
          week.forEach(function (day) {
            var level = levelMap[day.contributionLevel] !== undefined ? levelMap[day.contributionLevel] : 0;
            var cell = document.createElement("span");
            cell.className = "contrib__cell";
            cell.setAttribute("data-level", level);
            cell.setAttribute("title", (day.contributionCount || 0) + " contributions on " + day.date);
            cellFrag.appendChild(cell);
          });
        });
        graph.appendChild(cellFrag);

        // Update count with animation
        if (countEl) {
          countEl.textContent = "0";
          if (reduceMotion || !("IntersectionObserver" in window)) {
            animateCount(countEl, total);
          } else {
            var io = new IntersectionObserver(function (e) {
              if (e[0].isIntersecting) { animateCount(countEl, total); io.disconnect(); }
            }, { threshold: 0.4 });
            io.observe(graph);
          }
        }
      })
      .catch(function (err) {
        console.error("Failed to fetch GitHub contributions:", err);
        // Honest fallback: keep the empty placeholder grid rather than
        // fabricating activity. Count stays at 0 and we link out to GitHub.
        if (countEl) countEl.textContent = "0";
      });
  }

  // ---------- Discord presence (placeholder; Lanyard-ready) ----------
  // To go live: 1) join the Lanyard Discord (https://discord.gg/lanyard)
  //             2) put your Discord user ID below. Nothing else to change.
  var DISCORD_USER_ID = "615484398392967168"; // e.g. "123456789012345678"

  function applyPresence(data) {
    if (!data || !data.success || !data.data) return;
    var d = data.data;
    var status = d.discord_status || "offline";
    var dot = document.getElementById("discordDot");
    var nameEl = document.getElementById("discordName");
    var stateEl = document.getElementById("discordState");
    if (dot) dot.className = "presence__dot presence__dot--" + status;
    if (nameEl && d.discord_user) nameEl.textContent = d.discord_user.global_name || d.discord_user.username;

    // Swap in the real Discord avatar when Lanyard provides one
    var avatarEl = document.getElementById("discordAvatar");
    if (avatarEl && d.discord_user && d.discord_user.avatar) {
      var ext = d.discord_user.avatar.indexOf("a_") === 0 ? ".gif" : ".png";
      avatarEl.src = "https://cdn.discordapp.com/avatars/" + d.discord_user.id + "/" + d.discord_user.avatar + ext + "?size=128";
    }
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

  // ---------- screenshot hover-scrub ----------
  // Move the cursor up/down a project screenshot to scrub through the
  // full page; leaving resumes the slow auto-pan.
  function initShots() {
    if (isTouch) return; // pointer devices only; touch keeps the auto-pan
    document.querySelectorAll("[data-shot]").forEach(function (frame) {
      var img = frame.querySelector(".browser-frame__shot");
      var screen = frame.querySelector(".browser-frame__screen");
      if (!img || !screen) return;
      frame.addEventListener("pointermove", function (e) {
        var r = screen.getBoundingClientRect();
        var p = (e.clientY - r.top) / r.height;
        p = Math.max(0, Math.min(1, p));
        frame.classList.add("is-scrubbing");
        img.style.objectPosition = "center " + (p * 100) + "%";
      });
      frame.addEventListener("pointerleave", function () {
        frame.classList.remove("is-scrubbing");
        img.style.objectPosition = "";
      });
    });
  }

  // ---------- scroll jacking projects showcase ----------
  function initProjectsScroll() {
    var container = document.getElementById("projects");
    if (!container) return;
    
    var cards = container.querySelectorAll(".project-card");
    var visuals = container.querySelectorAll(".project-visual");
    
    function handleScroll() {
      var rect = container.getBoundingClientRect();
      var totalHeight = rect.height - window.innerHeight;
      if (totalHeight <= 0) return;
      
      var progress = -rect.top / totalHeight;
      progress = Math.max(0, Math.min(1, progress));
      
      if (window.waveScrollOffset !== undefined) {
        window.waveScrollOffset = progress * Math.PI * 4;
        
        var currentTop = rect.top;
        var lastTop = handleScroll.lastTop !== undefined ? handleScroll.lastTop : currentTop;
        var scrollSpeed = Math.abs(currentTop - lastTop);
        window.waveIntensity = 1.0 + Math.min(scrollSpeed * 0.05, 0.8);
      }
      handleScroll.lastTop = rect.top;
      
      var count = cards.length;
      var activeIdx = Math.floor(progress * count);
      if (activeIdx >= count) activeIdx = count - 1;
      
      cards.forEach(function (card, idx) {
        if (idx === activeIdx) card.classList.add("active");
        else card.classList.remove("active");
      });
      
      visuals.forEach(function (visual, idx) {
        if (idx === activeIdx) visual.classList.add("active");
        else visual.classList.remove("active");
      });
    }
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
  }

  // ---------- Hero Profile Picture Fade ----------
  function initProfileFade() {
    var heroPic = document.querySelector(".hero-profile-pic");
    if (!heroPic) return;
    
    function handleScroll() {
      var scrollY = window.scrollY;
      var fadeHeight = window.innerHeight * 0.72;
      var opacity = 1 - Math.min(1, scrollY / fadeHeight);
      heroPic.style.opacity = opacity;
      
      var scale = 1 - (scrollY / fadeHeight) * 0.18;
      var scaleClamp = Math.max(0.7, scale);
      heroPic.style.setProperty('--profile-scale', scaleClamp);
      
      if (opacity <= 0.01) {
        heroPic.style.visibility = "hidden";
        heroPic.style.pointerEvents = "none";
      } else {
        heroPic.style.visibility = "visible";
        heroPic.style.pointerEvents = "auto";
      }
    }
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
  }

  // ---------- contact form ----------
  function initContactForm() {
    var form = document.getElementById("contactForm");
    if (!form) return;
    
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      
      var nameVal = (document.getElementById("formName") ? document.getElementById("formName").value.trim() : "");
      var emailVal = (document.getElementById("formEmail") ? document.getElementById("formEmail").value.trim() : "");
      var messageVal = (document.getElementById("formMessage") ? document.getElementById("formMessage").value.trim() : "");
      
      if (!nameVal || !emailVal || !messageVal) {
        alert("Please fill in all fields.");
        return;
      }
      
      var btn = form.querySelector(".btn-submit");
      var btnText = btn ? btn.querySelector(".btn__text") : null;
      if (!btn || !btnText) return;
      
      var originalText = btnText.textContent;
      btnText.textContent = "Sending...";
      btn.style.pointerEvents = "none";
      btn.style.opacity = "0.8";
      
      setTimeout(function () {
        btnText.textContent = "Message Sent!";
        btn.style.background = "#10b981";
        form.reset();
        
        setTimeout(function () {
          btnText.textContent = originalText;
          btn.style.pointerEvents = "";
          btn.style.opacity = "";
          btn.style.background = "";
        }, 3000);
      }, 1500);
    });
  }

  // ---------- scroll progress bar ----------
  function initScrollProgress() {
    var bar = document.querySelector(".scroll-progress");
    if (!bar) return;
    var ticking = false;
    function update() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? h.scrollTop / max : 0) + ")";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // ---------- scroll-spy: highlight active section link ----------
  function initScrollSpy() {
    if (!("IntersectionObserver" in window)) return;
    var links = {};
    document.querySelectorAll(".nav__list a").forEach(function (a) {
      var id = (a.getAttribute("href") || "").slice(1);
      if (id) links[id] = a;
    });
    var sections = Object.keys(links)
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    if (!sections.length) return;
    function setCurrent(linkId) {
      Object.keys(links).forEach(function (k) { 
        links[k].classList.toggle("is-current", k === linkId); 
      });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setCurrent(e.target.id);
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    sections.forEach(function (s) { io.observe(s); });
  }

  // ---------- hero role rotator ----------
  function initRoleRotate() {
    var el = document.getElementById("roleRotate");
    if (!el) return;
    var roles = (el.getAttribute("data-roles") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    if (roles.length < 2 || reduceMotion) return;
    el.style.transition = "opacity .26s ease, transform .26s ease";
    var i = 0;
    setInterval(function () {
      i = (i + 1) % roles.length;
      el.style.opacity = "0"; el.style.transform = "translateY(6px)";
      setTimeout(function () { el.textContent = roles[i]; el.style.opacity = "1"; el.style.transform = "none"; }, 260);
    }, 2200);
  }

  // ---------- boot ----------
  function init() {
    buildSplits();
    initContrib();
    initPresence();
    initTilt();
    initShots();
    initProjectsScroll();
    initProfileFade();
    initContactForm();
    initScrollProgress();
    initScrollSpy();
    initRoleRotate();
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
