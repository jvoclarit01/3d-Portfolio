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

  // ---------- GitHub Activity: live signals ----------
  function initGitHubSignals() {
    var graph = document.getElementById("contribGraph");
    if (!graph) return;

    var GH_USER = "jvoclarit01";
    var LEVEL_MAP = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
    var SYNC_INTERVAL = 90000; // re-sync every 90s

    var el = {
      cur: document.getElementById("statCurStreak"),
      longest: document.getElementById("statLongStreak"),
      total: document.getElementById("statTotal"),
      active: document.getElementById("statActive"),
      best: document.getElementById("statBest"),
      repos: document.getElementById("statRepos"),
      sync: document.getElementById("ghSync"),
      syncWrap: document.getElementById("ghSyncWrap")
    };
    var hasAnimated = false; // count-up only on first reveal; later syncs snap

    // placeholder heatmap so the panel never looks empty while loading
    var frag = document.createDocumentFragment();
    for (var w = 0; w < 53; w++) {
      for (var d = 0; d < 7; d++) {
        var ph = document.createElement("span");
        ph.className = "contrib__cell";
        ph.setAttribute("data-level", 0);
        frag.appendChild(ph);
      }
    }
    graph.appendChild(frag);

    function fmtTime(date) {
      var h = date.getHours(), m = date.getMinutes();
      var ap = h >= 12 ? "PM" : "AM";
      h = h % 12; if (h === 0) h = 12;
      return h + ":" + (m < 10 ? "0" + m : m) + " " + ap;
    }

    function putStat(node, val) {
      if (!node) return;
      if (hasAnimated || reduceMotion) { node.textContent = val.toLocaleString(); }
      else { animateCount(node, val); }
    }

    // Flatten weeks -> days (chronological) and derive streaks/totals.
    function computeStats(data) {
      var days = [];
      data.contributions.forEach(function (week) {
        week.forEach(function (day) { days.push(day.contributionCount || 0); });
      });
      var total = 0, active = 0, best = 0, longest = 0, run = 0;
      days.forEach(function (n) {
        total += n;
        if (n > 0) { active++; if (n > best) best = n; run++; if (run > longest) longest = run; }
        else run = 0;
      });
      // current streak: count back from the end; allow today (last cell) to be 0
      var cur = 0;
      for (var i = days.length - 1; i >= 0; i--) {
        if (days[i] > 0) cur++;
        else if (i === days.length - 1) continue;
        else break;
      }
      var totalC = (typeof data.totalContributions === "number") ? data.totalContributions : total;
      return { total: totalC, active: active, best: best, longest: longest, cur: cur };
    }

    function renderHeatmap(data) {
      var cells = document.createDocumentFragment();
      data.contributions.forEach(function (week) {
        week.forEach(function (day) {
          var lvl = LEVEL_MAP[day.contributionLevel] !== undefined ? LEVEL_MAP[day.contributionLevel] : 0;
          var cell = document.createElement("span");
          cell.className = "contrib__cell";
          cell.setAttribute("data-level", lvl);
          cell.setAttribute("title", (day.contributionCount || 0) + " contributions on " + day.date);
          cells.appendChild(cell);
        });
      });
      graph.innerHTML = "";
      graph.appendChild(cells);
    }

    function sync(initial) {
      if (el.syncWrap) el.syncWrap.classList.add("is-syncing");

      fetch("https://github-contributions-api.deno.dev/" + GH_USER + ".json")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data || !data.contributions) return;
          renderHeatmap(data);
          var s = computeStats(data);
          putStat(el.cur, s.cur);
          putStat(el.longest, s.longest);
          putStat(el.total, s.total);
          putStat(el.active, s.active);
          putStat(el.best, s.best);
          hasAnimated = true;
          if (el.sync) el.sync.textContent = fmtTime(new Date());
        })
        .catch(function (err) { console.error("GitHub signals sync failed:", err); })
        .then(function () {
          setTimeout(function () { if (el.syncWrap) el.syncWrap.classList.remove("is-syncing"); }, 600);
        });

      // Public repo count rarely changes — fetch once to conserve API limits.
      if (initial) {
        fetch("https://api.github.com/users/" + GH_USER)
          .then(function (r) { return r.json(); })
          .then(function (u) { if (u && typeof u.public_repos === "number") putStat(el.repos, u.public_repos); })
          .catch(function () { /* leave repos at 0 */ });
      }
    }

    // First sync when the panel scrolls into view (so counts animate up),
    // then keep it live on an interval.
    if (reduceMotion || !("IntersectionObserver" in window)) {
      sync(true);
    } else {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { sync(true); io.disconnect(); }
      }, { threshold: 0.25 });
      io.observe(graph);
    }
    setInterval(function () { sync(false); }, SYNC_INTERVAL);
  }

  // ---------- Discord presence (placeholder; Lanyard-ready) ----------
  // To go live: 1) join the Lanyard Discord (https://discord.gg/lanyard)
  //             2) put your Discord user ID below. Nothing else to change.
  var DISCORD_USER_ID = "615484398392967168"; // e.g. "123456789012345678"

  var elapsedTimer = null;

  function applyPresence(data) {
    if (!data || !data.success || !data.data) return;
    var d = data.data;
    var status = d.discord_status || "offline";
    var dot = document.getElementById("discordDot");
    var nameEl = document.getElementById("discordName");
    var stateEl = document.getElementById("discordState");
    var handleEl = document.getElementById("discordHandle");

    if (dot) dot.className = "presence__dot presence__dot--" + status;
    if (nameEl && d.discord_user) nameEl.textContent = d.discord_user.global_name || d.discord_user.username;
    if (handleEl && d.discord_user && d.discord_user.username) handleEl.textContent = "@" + d.discord_user.username;

    // Swap in the real Discord avatar when Lanyard provides one
    var avatarEl = document.getElementById("discordAvatar");
    if (avatarEl && d.discord_user && d.discord_user.avatar) {
      var ext = d.discord_user.avatar.indexOf("a_") === 0 ? ".gif" : ".png";
      avatarEl.src = "https://cdn.discordapp.com/avatars/" + d.discord_user.id + "/" + d.discord_user.avatar + ext + "?size=128";
    }
    var label = { online: "Online", idle: "Idle", dnd: "Do Not Disturb", offline: "Offline" }[status] || "Offline";
    if (stateEl) stateEl.textContent = label;

    // Custom status (activity type 4): emoji + text
    var custom = (d.activities || []).filter(function (a) { return a.type === 4; })[0];
    var customWrap = document.getElementById("discordCustom");
    if (customWrap) {
      var hasCustom = custom && (custom.state || (custom.emoji && custom.emoji.name));
      customWrap.hidden = !hasCustom;
      if (hasCustom) {
        var emojiEl = document.getElementById("discordCustomEmoji");
        if (emojiEl) {
          if (custom.emoji && custom.emoji.id) {
            var ce = custom.emoji.animated ? ".gif" : ".png";
            emojiEl.innerHTML = '<img class="presence__custom-emoji-img" alt="" src="https://cdn.discordapp.com/emojis/' + custom.emoji.id + ce + '?size=24">';
          } else {
            emojiEl.textContent = (custom.emoji && custom.emoji.name) ? custom.emoji.name : "";
          }
        }
        set("discordCustomText", custom.state || "");
      }
    }

    // Platform footer
    var platforms = [];
    if (d.active_on_discord_desktop) platforms.push("Desktop");
    if (d.active_on_discord_mobile) platforms.push("Mobile");
    if (d.active_on_discord_web) platforms.push("Web");
    var footEl = document.getElementById("discordFoot");
    if (footEl) {
      if (status === "offline") { set("discordPlatform", "Currently offline"); footEl.hidden = false; }
      else if (platforms.length) { set("discordPlatform", "Active on " + platforms.join(" + ")); footEl.hidden = false; }
      else { footEl.hidden = true; }
    }

    // Spotify is shown in its own "Now Playing" card below
    applySpotify(d);

    // Primary Discord activity — first real activity (skip custom status + Spotify)
    if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
    var block = document.getElementById("discordActivity");
    var imgEl = document.getElementById("discordActImg");
    var glyphEl = document.getElementById("discordActGlyph");
    if (block) block.style.display = "";
    if (imgEl) imgEl.hidden = true;
    if (glyphEl) glyphEl.style.display = "";

    var act = (d.activities || []).filter(function (a) {
      return a.type !== 4 && !(a.type === 2 && (a.name === "Spotify" || a.id === "spotify:1"));
    })[0];
    if (!act) {
      set("discordActLabel", "Status");
      set("discordActTitle", status === "offline" ? "Offline" : "No activity right now");
      set("discordActDetail", status === "offline" ? "Catch me another time" : "Probably building something ✨");
      set("discordActState", "");
      set("discordActElapsed", "");
      return;
    }
    var t = { 0: "Playing", 1: "Streaming", 2: "Listening to", 3: "Watching" }[act.type] || "Doing";
    set("discordActLabel", t);
    set("discordActTitle", act.name || "");
    set("discordActDetail", act.details || "");
    set("discordActState", act.state || "");
    if (act.timestamps && act.timestamps.start) startElapsed(act.timestamps.start, act.timestamps.end);
    else set("discordActElapsed", "");
  }
  function set(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }

  // Live-ticking elapsed clock for the current activity / Spotify track
  function startElapsed(start, end) {
    var el = document.getElementById("discordActElapsed");
    if (!el) return;
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    function fmt(ms) {
      if (ms < 0) ms = 0;
      var s = Math.floor(ms / 1000), h = Math.floor(s / 3600); s -= h * 3600;
      var m = Math.floor(s / 60); s -= m * 60;
      return (h > 0 ? h + ":" + pad(m) : "" + m) + ":" + pad(s);
    }
    function tick() {
      var now = Date.now();
      el.textContent = end ? (fmt(now - start) + " / " + fmt(end - start)) : (fmt(now - start) + " elapsed");
    }
    tick();
    elapsedTimer = setInterval(tick, 1000);
  }

  // ---------- Spotify "Now Playing" (from the same Lanyard payload) ----------
  var spotifyTimer = null;
  function applySpotify(d) {
    var card = document.getElementById("spotifyCard");
    if (!card) return;
    var body = document.getElementById("spotifyBody");
    var prog = document.getElementById("spotifyProgress");
    var idle = document.getElementById("spotifyIdle");
    if (spotifyTimer) { clearInterval(spotifyTimer); spotifyTimer = null; }

    if (!(d.listening_to_spotify && d.spotify)) {
      card.classList.remove("is-playing");
      if (body) body.hidden = true;
      if (prog) prog.hidden = true;
      if (idle) idle.hidden = false;
      return;
    }

    var sp = d.spotify;
    card.classList.add("is-playing");
    if (idle) idle.hidden = true;
    if (body) {
      body.hidden = false;
      if (sp.track_id) body.href = "https://open.spotify.com/track/" + sp.track_id;
    }
    var art = document.getElementById("spotifyArt");
    if (art && sp.album_art_url) art.src = sp.album_art_url;
    set("spotifySong", sp.song || "");
    set("spotifyArtist", sp.artist || "");
    set("spotifyAlbum", sp.album || "");

    var ts = sp.timestamps || {};
    if (prog && ts.start && ts.end) {
      prog.hidden = false;
      var fill = document.getElementById("spotifyBarFill");
      var curEl = document.getElementById("spotifyCur");
      var durEl = document.getElementById("spotifyDur");
      function mmss(ms) { if (ms < 0) ms = 0; var s = Math.floor(ms / 1000), m = Math.floor(s / 60); s -= m * 60; return m + ":" + (s < 10 ? "0" + s : s); }
      function step() {
        var dur = ts.end - ts.start;
        var pos = Math.min(Math.max(Date.now() - ts.start, 0), dur);
        if (fill) fill.style.width = (dur > 0 ? (pos / dur * 100) : 0) + "%";
        if (curEl) curEl.textContent = mmss(pos);
        if (durEl) durEl.textContent = mmss(dur);
      }
      step();
      spotifyTimer = setInterval(step, 1000);
    } else if (prog) {
      prog.hidden = true;
    }
  }

  function initPresence() {
    if (!DISCORD_USER_ID) return; // keep placeholder markup until an ID is set
    function poll() {
      fetch("https://api.lanyard.rest/v1/users/" + DISCORD_USER_ID)
        .then(function (r) { return r.json(); })
        .then(applyPresence)
        .catch(function () { /* keep last good state */ });
    }
    poll();
    setInterval(poll, 30000); // keep presence live
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
      
      var formData = new FormData(form);
      
      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (data.success) {
          btnText.textContent = "Message Sent!";
          btn.style.setProperty("background", "#10b981", "important");
          form.reset();
        } else {
          btnText.textContent = "Error!";
          btn.style.setProperty("background", "#ef4444", "important");
          alert(data.message || "Something went wrong. Please try again.");
        }
      })
      .catch(function (error) {
        btnText.textContent = "Error!";
        btn.style.setProperty("background", "#ef4444", "important");
        alert("Failed to send message. Please check your network connection.");
      })
      .finally(function () {
        setTimeout(function () {
          btnText.textContent = originalText;
          btn.style.pointerEvents = "";
          btn.style.opacity = "";
          btn.style.removeProperty("background");
        }, 3000);
      });
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

  // ---------- header background scroll effect ----------
  function initHeaderScroll() {
    var header = document.querySelector(".header");
    if (!header) return;
    var ticking = false;
    function update() {
      if (window.scrollY > 50) {
        header.classList.add("is-scrolled");
      } else {
        header.classList.remove("is-scrolled");
      }
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // ---------- boot ----------
  function init() {
    buildSplits();
    initGitHubSignals();
    initPresence();
    initTilt();
    initShots();
    initProjectsScroll();
    initProfileFade();
    initContactForm();
    initScrollProgress();
    initScrollSpy();
    initRoleRotate();
    initHeaderScroll();
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
