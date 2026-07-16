/* ═══════════════════════════════════════════════════════════════
   brainblast · interaction engine
   boot → particle brain → scroll choreography → live roadmap
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ── SCROLLING ──
     Native scroll only. Scroll-driven animation runs through ScrollTrigger
     with per-animation scrub easing; the page itself responds instantly.
     Anchor offsets are handled by scroll-margin-top in CSS. */

  /* ══════════ BOOT SEQUENCE ══════════ */

  const boot = $("[data-boot]");
  const bootDone = () => {
    boot?.classList.add("is-done");
    document.body.removeAttribute("data-loading");
    heroIntro();
  };

  if (boot && !reduced && !sessionStorage.getItem("bb-booted")) {
    sessionStorage.setItem("bb-booted", "1");
    const linesEl = $("[data-boot-lines]");
    const barEl = $("[data-boot-bar]");
    const seq = [
      ["brainblast v1.0.0 · guard layer online", 90],
      ["loading corpus … 4,183 proven VTIs", 340],
      ["arming checkers … 29/29 <span class='ok'>ok</span>", 640],
      ["hive sync … <span class='ok'>ok</span>", 900],
    ];
    seq.forEach(([html, at], i) => {
      setTimeout(() => {
        const div = document.createElement("div");
        div.innerHTML = html;
        if (html.includes("ok")) div.classList.add("ok");
        linesEl.appendChild(div);
        barEl.style.width = `${((i + 1) / seq.length) * 100}%`;
      }, at);
    });
    setTimeout(bootDone, 1350);
  } else {
    bootDone();
  }

  /* ══════════ HERO INTRO + SCRAMBLE ══════════ */

  function heroIntro() {
    scramble($("[data-scramble]"));
    if (!hasGsap || reduced) return;
    gsap.from(
      ["[data-hero-eyebrow]", ".hero-title .line", "[data-hero-sub]", "[data-hero-actions]", "[data-hero-stats]"],
      {
        y: 44,
        opacity: 0,
        duration: 1.1,
        stagger: 0.09,
        ease: "power3.out",
        clearProps: "all",
      }
    );
  }

  function scramble(el) {
    if (!el || reduced) return;
    const target = el.textContent;
    const glyphs = "01<>/{}$#&%▓░▒-+*";
    const dur = 1100;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const solid = Math.floor(p * target.length);
      let out = target.slice(0, solid);
      for (let i = solid; i < target.length; i++) {
        out += target[i] === " " ? " " : glyphs[(Math.random() * glyphs.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    };
    requestAnimationFrame(tick);
  }

  /* ══════════ PARTICLE BRAIN (hero canvas) ══════════ */

  (function particleBrain() {
    const canvas = $("[data-brain-canvas]");
    if (!canvas || reduced) return;

    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    let particles = [];
    let mouse = { x: -9999, y: -9999 };
    let disperse = 0;
    let raf;
    let inView = true;

    const PALETTE = ["#2ee6a8", "#29c9f0", "#3b82f6", "#8b5cf6"];

    function resize() {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function build(img) {
      resize();
      const off = document.createElement("canvas");
      const S = 140; // sample resolution
      off.width = S;
      off.height = S;
      const octx = off.getContext("2d", { willReadFrequently: true });
      octx.drawImage(img, 0, 0, S, S);
      const data = octx.getImageData(0, 0, S, S).data;

      const isWide = W > 900;
      const size = Math.min(isWide ? W * 0.42 : W * 0.85, H * 0.82);
      const cx = isWide ? W * 0.72 : W * 0.5;
      const cy = H * 0.46;

      const pts = [];
      const step = 2;
      for (let y = 0; y < S; y += step) {
        for (let x = 0; x < S; x += step) {
          const i = (y * S + x) * 4;
          const bright = data[i] + data[i + 1] + data[i + 2];
          const alpha = data[i + 3];
          if (alpha > 120 && bright > 190) {
            pts.push({
              tx: cx + ((x - S / 2) / S) * size,
              ty: cy + ((y - S / 2) / S) * size,
              bright: bright / 765,
            });
          }
        }
      }

      // cap particle count for perf
      const MAX = 2600;
      while (pts.length > MAX) pts.splice((Math.random() * pts.length) | 0, 1);

      particles = pts.map((p) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: 0,
        vy: 0,
        tx: p.tx,
        ty: p.ty,
        r: 0.6 + p.bright * 1.3,
        c: PALETTE[(Math.random() * PALETTE.length) | 0],
        drift: Math.random() * Math.PI * 2,
      }));

      cancelAnimationFrame(raf);
      draw();
    }

    function draw() {
      if (!inView) return; // don't schedule frames while the hero is off-screen
      ctx.clearRect(0, 0, W, H);
      const globalAlpha = 1 - disperse * 0.9;
      for (const p of particles) {
        p.drift += 0.012;
        const jx = Math.cos(p.drift) * 1.4;
        const jy = Math.sin(p.drift * 0.8) * 1.4;

        // spring to target (+ outward dispersal on scroll)
        const ocx = W * 0.72;
        const ocy = H * 0.46;
        const tx = p.tx + (p.tx - ocx) * disperse * 2.4 + jx;
        const ty = p.ty + (p.ty - ocy) * disperse * 2.4 + jy;

        p.vx += (tx - p.x) * 0.045;
        p.vy += (ty - p.y) * 0.045;

        // mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 12100) {
          const d = Math.sqrt(d2) || 1;
          const f = ((110 - d) / 110) * 3.4;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }

        p.vx *= 0.86;
        p.vy *= 0.86;
        p.x += p.vx;
        p.y += p.vy;

        // fillRect is ~5x cheaper than arc() at this size and reads as a dot
        ctx.globalAlpha = globalAlpha;
        ctx.fillStyle = p.c;
        const s = p.r * 2;
        ctx.fillRect(p.x - p.r, p.y - p.r, s, s);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    const img = new Image();
    img.src = "assets/brainblast_icon.png";
    img.onload = () => build(img);

    const hero = $("#hero");
    hero.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    hero.addEventListener("pointerleave", () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });

    // scroll dispersal
    const onScroll = () => {
      const h = window.innerHeight;
      disperse = Math.min(1, Math.max(0, window.scrollY / (h * 0.9)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // hard-stop the render loop once the hero leaves the viewport
    new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        cancelAnimationFrame(raf);
        if (inView && particles.length && !document.hidden) draw();
      },
      { rootMargin: "80px" }
    ).observe(canvas);

    let rt;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => build(img), 180);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else draw();
    });
  })();

  /* ══════════ CURSOR ══════════ */

  (function cursor() {
    const dot = $("[data-cursor]");
    if (!dot || reduced || window.matchMedia("(hover: none)").matches) return;
    let x = 0,
      y = 0,
      cx = 0,
      cy = 0;
    window.addEventListener("pointermove", (e) => {
      x = e.clientX;
      y = e.clientY;
      dot.classList.add("is-on");
    });
    const loop = () => {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      dot.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    $$("a, button, [data-tilt]").forEach((el) => {
      el.addEventListener("pointerenter", () => dot.classList.add("is-hover"));
      el.addEventListener("pointerleave", () => dot.classList.remove("is-hover"));
    });
  })();

  /* ══════════ SCROLL PROGRESS + HEADER ══════════ */

  const progress = $("[data-progress]");
  const header = $("[data-header]");
  const syncScrollUi = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    header?.classList.toggle("is-scrolled", window.scrollY > 16);
  };
  window.addEventListener("scroll", syncScrollUi, { passive: true });
  syncScrollUi();

  /* ══════════ MOBILE NAV ══════════ */

  const menuButton = $("[data-menu-button]");
  const mobileNav = $("[data-mobile-nav]");
  menuButton?.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("is-open");
    document.body.classList.toggle("nav-open", open);
    menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  mobileNav?.addEventListener("click", (e) => {
    if (e.target.matches("a")) {
      mobileNav.classList.remove("is-open");
      document.body.classList.remove("nav-open");
    }
  });

  /* ══════════ COPY + TOAST ══════════ */

  const toast = $("[data-toast]");
  const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("is-visible"), 1500);
  };

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    try {
      await navigator.clipboard.writeText(btn.getAttribute("data-copy"));
      showToast("Copied to clipboard");
    } catch {
      showToast("Copy failed. Select manually");
    }
  });

  /* ══════════ MAGNETIC BUTTONS ══════════ */

  if (!reduced && !window.matchMedia("(hover: none)").matches) {
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${mx * 0.18}px, ${my * 0.3}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform = "";
        setTimeout(() => (el.style.transition = ""), 500);
      });
    });
  }

  /* ══════════ TILT CARDS ══════════ */

  if (!reduced && !window.matchMedia("(hover: none)").matches) {
    $$("[data-tilt]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${px * 6}deg) rotateX(${py * -6}deg) translateY(-2px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform = "";
        setTimeout(() => (el.style.transition = ""), 600);
      });
    });
  }

  /* ══════════ SECTION REVEALS (word-split titles + blocks) ══════════ */

  if (hasGsap && window.ScrollTrigger && !reduced) {
    $$("[data-split]").forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words
        .map((w) => `<span style="display:inline-block;overflow:hidden;vertical-align:top"><span style="display:inline-block">${w}&nbsp;</span></span>`)
        .join("");
      gsap.from($$("span > span", el), {
        yPercent: 115,
        duration: 0.9,
        stagger: 0.045,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 86%" },
      });
    });

    $$(
      ".section-sub, .corpus-stat, .corpus-card, .partner-card, .command-block, .install-tabs, .northstar, .lane, .terminal, .token-orbit, .token-actions, .flywheel-head, .fw-step"
    ).forEach((el) => {
      gsap.from(el, {
        y: 42,
        opacity: 0,
        duration: 0.95,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 90%" },
      });
    });
  }

  /* ══════════ COUNTERS ══════════ */

  const fmt = new Intl.NumberFormat("en-US");
  $$("[data-count]").forEach((el) => {
    const end = parseInt(el.getAttribute("data-count"), 10);
    if (reduced || !hasGsap || !window.ScrollTrigger) {
      el.textContent = fmt.format(end);
      return;
    }
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end,
      duration: 1.8,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 92%" },
      onUpdate: () => (el.textContent = fmt.format(Math.round(obj.v))),
    });
  });

  /* ══════════ THE LOOP / PINNED DECK ══════════ */

  (function loopDeck() {
    const cards = $$("[data-loop-card]");
    const copies = $$("[data-loop-copy]");
    const dots = $$("[data-loop-dot]");
    if (!cards.length) return;

    let active = -1;
    const setActive = (i) => {
      if (i === active) return;
      active = i;
      copies.forEach((c, k) => c.classList.toggle("is-active", k === i));
      dots.forEach((d, k) => d.classList.toggle("is-active", k === i));
    };

    // static stacking: earlier cards sit above and fade out as they fly off.
    // (mutating z-index per frame forces constant re-layering, i.e. jank)
    cards.forEach((card, i) => (card.style.zIndex = String(40 - i * 10)));

    const layout = (pr) => {
      // pr ∈ [0, 3]
      cards.forEach((card, i) => {
        const d = i - pr;
        let x, z, ry, o, s;
        if (d >= 0) {
          x = d * 54;
          z = -d * 130;
          ry = -d * 4;
          o = 1 - d * 0.22;
          s = 1;
        } else {
          x = d * 170;
          z = 40;
          ry = d * 8;
          o = Math.max(0, 1 + d * 1.15);
          s = 1 + d * 0.04;
        }
        // fully faded cards drop out of compositing entirely
        if (o <= 0.03) {
          card.style.visibility = "hidden";
          return;
        }
        card.style.visibility = "visible";
        card.style.transform = `translate3d(${x.toFixed(1)}px, ${(Math.abs(d) * 6).toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) scale(${s.toFixed(3)})`;
        card.style.opacity = o.toFixed(3);
      });
    };

    if (hasGsap && window.ScrollTrigger && !reduced) {
      ScrollTrigger.create({
        trigger: ".loop-section",
        start: "top top",
        end: "+=320%",
        pin: ".loop-sticky",
        scrub: 0.6, // native scroll is instant; this eases just the card motion
        anticipatePin: 1,
        onUpdate: (self) => {
          const pr = self.progress * 3;
          layout(pr);
          setActive(Math.min(3, Math.round(pr)));
        },
      });
      layout(0);
      setActive(0);
    } else {
      // static fallback: show first card + copy
      layout(0);
      setActive(0);
    }

    // compound mini-grid: light random cells
    const grid = $("[data-compound-grid]");
    if (grid) {
      const CELLS = 18 * 7;
      for (let i = 0; i < CELLS; i++) grid.appendChild(document.createElement("i"));
      const cells = $$("i", grid);
      if (!reduced) {
        let timer = null;
        const tick = () => {
          const c = cells[(Math.random() * cells.length) | 0];
          c.classList.add("lit");
          if (Math.random() < 0.3) c.classList.add(Math.random() < 0.5 ? "violet" : "cyan");
          setTimeout(() => c.classList.remove("lit", "violet", "cyan"), 1600);
        };
        // only burn cycles while the grid is actually on screen
        new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting && !timer) timer = setInterval(tick, 110);
          else if (!entry.isIntersecting && timer) {
            clearInterval(timer);
            timer = null;
          }
        }).observe(grid);
      } else {
        cells.forEach((c, i) => i % 6 === 0 && c.classList.add("lit"));
      }
    }
  })();

  /* ══════════ TERMINAL DEMO ══════════ */

  (function terminal() {
    const body = $("[data-terminal-body]");
    if (!body) return;

    const SCRIPT = [
      { h: `<span class="t-prompt">$</span> /brainblast requirements.md`, d: 0, type: true },
      { h: `<span class="t-dim">▸ reading requirements.md … <span class="t-info">14 external components detected</span></span>`, d: 700 },
      { h: `<span class="t-dim">▸ planning live sources … official docs · changelogs · rate limits</span>`, d: 1150 },
      { h: `<span class="t-dim">▸ browsing … bags.fm launch SDK <span class="t-ok">fetched 0.8s</span></span>`, d: 1600 },
      { h: `<span class="t-dim">▸ browsing … stripe webhook reference <span class="t-ok">fetched 0.6s</span></span>`, d: 1900 },
      { h: `<span class="t-dim">▸ browsing … privy auth docs <span class="t-ok">fetched 0.7s</span></span>`, d: 2200 },
      { h: `&nbsp;`, d: 2600 },
      { h: `<span class="t-badge crit">CRITICAL</span> <span class="t-crit">launch-flow · creator fee wallet missing from requirements</span>`, d: 2800 },
      { h: `<span class="t-dim">         trading fees route to the wrong destination: silent zero-revenue launch</span>`, d: 3050 },
      { h: `<span class="t-dim">         fix: require fee wallet address before implementation</span>`, d: 3250 },
      { h: `&nbsp;`, d: 3500 },
      { h: `<span class="t-badge high">HIGH</span> <span class="t-warn">payments · webhook handler must verify the raw body signature</span>`, d: 3650 },
      { h: `<span class="t-dim">         parsed-body verification accepts forged paid events</span>`, d: 3900 },
      { h: `&nbsp;`, d: 4150 },
      { h: `<span class="t-badge ok">PASS</span> <span class="t-ok">23 checks passed across 14 components</span>`, d: 4300 },
      { h: `&nbsp;`, d: 4600 },
      { h: `<span class="t-dim">▸ writing .agent-research/final-report.md + report.json <span class="t-info">(schema 1.0)</span></span>`, d: 4750 },
      { h: `<span class="t-dim">▸ injecting report pointer into CLAUDE.md</span>`, d: 5050 },
      { h: `&nbsp;`, d: 5350 },
      { h: `<span class="t-crit">verdict: BLOCKED</span> · 1 CRITICAL · 1 HIGH must be resolved before implementation`, d: 5500 },
      { h: `<span class="t-dim">exit code</span> <span class="t-crit">1</span> <span class="t-caret"></span>`, d: 5800 },
    ];

    let timers = [];
    let played = false;

    const clear = () => {
      timers.forEach(clearTimeout);
      timers = [];
      body.innerHTML = "";
    };

    const typeLine = (line, el) => {
      const full = `/brainblast requirements.md`;
      const prefix = `<span class="t-prompt">$</span> `;
      let i = 0;
      const step = () => {
        i++;
        el.innerHTML = prefix + full.slice(0, i) + `<span class="t-caret"></span>`;
        if (i < full.length) timers.push(setTimeout(step, 34));
        else el.innerHTML = prefix + full;
      };
      step();
    };

    const play = () => {
      clear();
      SCRIPT.forEach((line) => {
        timers.push(
          setTimeout(() => {
            const el = document.createElement("span");
            el.className = "t-line";
            if (line.type && !reduced) typeLine(line, el);
            else el.innerHTML = line.h;
            body.appendChild(el);
          }, reduced ? 0 : line.d)
        );
      });
    };

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !played) {
            played = true;
            play();
            obs.disconnect();
          }
        });
      },
      { threshold: 0.35 }
    );
    obs.observe(body);

    $("[data-replay]")?.addEventListener("click", play);
  })();

  /* ══════════ CORPUS VIZ GRID ══════════ */

  (function corpusViz() {
    const viz = $("[data-corpus-viz]");
    if (!viz) return;
    const cols = 60;
    const rows = 5;
    const colors = ["rgba(46,230,168,0.9)", "rgba(41,201,240,0.9)", "rgba(139,92,246,0.9)"];
    for (let i = 0; i < cols * rows; i++) {
      const cell = document.createElement("i");
      if (Math.random() < 0.16) {
        cell.classList.add("on");
        cell.style.setProperty("--viz-c", colors[(Math.random() * colors.length) | 0]);
        cell.style.setProperty("--d", `${(Math.random() * 3.4).toFixed(2)}s`);
      }
      viz.appendChild(cell);
    }
    // animations only run while the grid is on screen (CSS gates on .in-view)
    new IntersectionObserver(([entry]) => {
      viz.classList.toggle("in-view", entry.isIntersecting);
    }).observe(viz);
  })();

  /* ══════════ SCROLLTRIGGER RE-MEASURE ══════════ */
  // fonts/images landing after setup shift layout → stale pin positions
  if (hasGsap && window.ScrollTrigger) {
    window.addEventListener("load", () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
  }

  /* ══════════ INSTALL TABS ══════════ */

  $$("[data-install-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const key = tab.getAttribute("data-install-tab");
      $$("[data-install-tab]").forEach((t) => {
        const on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", String(on));
      });
      $$("[data-install-panel]").forEach((p) =>
        p.classList.toggle("is-active", p.getAttribute("data-install-panel") === key)
      );
    });
  });

  /* ══════════ FLYWHEEL CYCLER ══════════ */

  (function flywheel() {
    const wrap = $("[data-flywheel]");
    if (!wrap) return;
    const steps = $$("[data-fw-step]", wrap);
    const arrows = $$("[data-fw-arrow]", wrap);
    const ret = $("[data-fw-return]");
    if (!steps.length) return;

    if (reduced) {
      steps[0].classList.add("is-active");
      return;
    }

    let i = -1;
    let timer = null;
    const tick = () => {
      i = (i + 1) % steps.length;
      steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
      // arrow k sits between step k and k+1; light it as the pulse leaves step k
      arrows.forEach((a, k) => a.classList.toggle("is-active", k === i));
      ret?.classList.toggle("is-active", i === steps.length - 1);
    };

    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !timer) {
        tick();
        timer = setInterval(tick, 1700);
      } else if (!entry.isIntersecting && timer) {
        clearInterval(timer);
        timer = null;
      }
    }, { threshold: 0.25 }).observe(wrap);
  })();

  /* ══════════ TOKEN COIN FLOAT ══════════ */

  if (hasGsap && !reduced) {
    gsap.to("[data-token-coin]", {
      y: -16,
      rotate: 3,
      duration: 2.6,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
  }

  /* ══════════ LIVE ROADMAP (fetched from GitHub main) ══════════ */

  const ROADMAP_URL = "https://raw.githubusercontent.com/DSB-117/brainblast/main/ROADMAP.md";
  const ROADMAP_GH = "https://github.com/DSB-117/brainblast/blob/main/ROADMAP.md";

  // Snapshot fallback (rendered with an "offline snapshot" badge if the live fetch fails)
  const ROADMAP_FALLBACK = `# Brainblast — The Roadmap

**Last updated:** 2026-07-15 · anchored at **v1.0.0** · single source of truth

**North star:** Make AI-written code **correct-by-default** — and turn the proof of
every catch into the only **verifiable** code-security data asset in the world.

## Lane 1 — Engine & Tool  *(what developers touch)*
**Goal:** the default correctness layer for AI-written code — predict the silent failure,
prove it's gone, keep watching.

- **State:** Predict→Enforce shipped — 7-step research report, \`report.json\` (+ JSON
  Schema), \`--ci\` gate, \`/brainblast-verify\`, deterministic auditor, 29 checkers
  (multi-language, self-extending oracle gate). Watch/Compound partial.
- **Bet:** reposition from "pre-flight research" to **the guard layer for coding agents.**
- **Now:** an **MCP / retrieval hook** so Cursor / Claude Code / Devin pull the relevant
  proven footgun *before* writing; package the eval harness as a repeatable
  **"score your model."**
- **Next:** **Watch** — re-research pinned dependencies on advisory/version change and
  reopen the gate; deepen checker coverage of the scarce classes.
- **Later:** **Compound** — every run auto-contributes its catches to the hive + corpus.
- **Working when:** wired into ≥1 agent IDE as a guard, and a third party reproduces the
  eval on their own model.

## Lane 2 — Corpus & Fleet  *(the data moat / supply)*
**Goal:** the deepest, best-balanced set of *proven* code footguns in existence.

- **State:** 4,183 proven VTIs / 154 SDKs / 9 classes, all RED→GREEN; turnkey fleet.
- **Bet:** value = proven-pairs × **class balance** × modality breadth.
- **Now:** provision the **operator token**; add a **class-budget gate** to the scout
  contract; run the new **staleness modality** wide.
- **Next:** new checker *shapes* via the oracle gate; more languages — **Python, Rust, Move**.
- **Later:** **10,000+ balanced** VTIs; corpus versioning + dated snapshots for buyers.
- **Working when:** no single class > 25% of the corpus, every bottom-5 class > 5%, and
  weekly net-new VTIs are climbing.

## Lane 3 — HiveMind  *(federation & community supply)*
**Goal:** make supply superlinear — every operator, agent, and team that runs Brainblast
feeds the corpus.

- **State:** shipped — shared second brain (sync, brief, enforce, experience, federation,
  **\`outbreak\`** propagation, team + multi-machine hives).
- **Bet:** the hive is a **supply network**, not just a cache.
- **Now:** open **community submission**; fire **\`outbreak\` alerts** when a new footgun
  is proven.
- **Next:** **team / enterprise hives** as a paid collaboration tier.
- **Later:** hive ⇄ Bittensor subnet = a permissionless global VTI supply.
- **Working when:** external contributors submit proven VTIs weekly and outbreak alerts
  fire across nodes.

## Lane 4 — Marketplace & GTM  *(demand / revenue)*
**Goal:** convert the moat into recurring revenue across channels.

- **State:** registry live; free sample live on Hugging Face; 4-model proof demo built.
- **Bet:** marketplaces = **funnel + credibility**; money is captured at the
  **license point**.
- **Now:** publish the **gated full-corpus** HF repo; run the **first outreach wave**;
  stand up **eval-as-a-service**.
- **Next:** list the owned tier on **Opendatabay**; ship the **metered API**; open
  **enterprise pilots**.
- **Later:** **Ocean compute-to-data** for the wild tier; multi-marketplace.
- **Working when:** first paid license closes and HF produces a steady flow of qualified
  leads.

## Lane 5 — $BRAIN & On-chain  *(economy / incentives)*
**Goal:** a consumptive/work token economy that funds supply and access.

- **State:** $BRAIN live (access + rewards); Agent Wallet planned; Bittensor subnet
  designed.
- **Bet:** **spend to use, earn for verifiable work.** No holder yield.
- **Now:** ship **contributor-reward payouts** on first-proof; keep the **sales and
  reward ledgers visibly separate**.
- **Next:** **curation bonds** — stake $BRAIN on a VTI's continued validity.
- **Later:** **Bittensor Path A** → own subnet on a modeled payback.
- **Working when:** contributors are paid for proven work and the spend↔earn loop runs
  without a human in the critical path.

## If we only do four things (cross-lane priorities, this month)

1. **Close first revenue** (Lane 4) — gated HF corpus + outreach + eval-as-a-service.
2. **Ship the agent-guard framing** (Lane 1) — the retrieval hook + public eval.
3. **Rebalance the corpus** (Lane 2) — operator token + class-budget; quality over count.
4. **Open community/hive supply** (Lane 3) — turn users into scouts.

**Next quarter:** Watch (Lane 1), metered API + Opendatabay (Lane 4), team/enterprise
tier (Lane 3), new checker modalities + languages (Lane 2), curation bonds (Lane 5).
**Later bets:** 10k balanced VTIs, Bittensor subnet, Ocean compute-to-data, multi-language.`;

  const escapeHtml = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const inlineMd = (s) =>
    escapeHtml(s)
      // house style: no em dashes anywhere on the site, including fetched content
      .replace(/\s*—\s*/g, " · ")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");

  function mdBlocks(md) {
    const blocks = [];
    let cur = null;
    const push = () => {
      if (cur && cur.text.trim()) blocks.push(cur);
      cur = null;
    };
    for (const raw of md.split(/\r?\n/)) {
      const line = raw.trimEnd();
      if (!line.trim()) {
        push();
        continue;
      }
      if (/^#{1,3}\s/.test(line)) {
        push();
        blocks.push({ type: line.startsWith("##") ? "h2" : "h1", text: line.replace(/^#+\s*/, "") });
        continue;
      }
      if (/^>\s?/.test(line)) {
        push();
        continue; // skip blockquote asides
      }
      if (/^---+$/.test(line.trim())) {
        push();
        continue;
      }
      if (/^-\s+/.test(line)) {
        push();
        cur = { type: "li", text: line.replace(/^-\s+/, "") };
        continue;
      }
      if (/^\d+\.\s+/.test(line)) {
        push();
        cur = { type: "ol", text: line.replace(/^\d+\.\s+/, "") };
        continue;
      }
      if (cur) cur.text += " " + line.trim();
      else cur = { type: "p", text: line.trim() };
    }
    push();
    return blocks;
  }

  function parseRoadmap(md) {
    const blocks = mdBlocks(md);
    const data = { meta: "", northstar: "", lanes: [] };
    let mode = "head";
    let lane = null;

    for (const b of blocks) {
      if (b.type === "h2") {
        const laneMatch = b.text.match(/^Lane\s+(\d+)\s+—\s+(.*)$/);
        if (laneMatch) {
          const rest = laneMatch[2];
          const subMatch = rest.match(/\*\((.*?)\)\*/);
          lane = {
            num: laneMatch[1],
            title: rest.replace(/\s*\*\(.*?\)\*\s*/, "").trim(),
            subtitle: subMatch ? subMatch[1] : "",
            goal: "",
            fields: {},
          };
          data.lanes.push(lane);
          mode = "lane";
          continue;
        }
        mode = "other";
        lane = null;
        continue;
      }

      if (mode === "head" && b.type === "p") {
        if (/^\*\*Last updated:\*\*/i.test(b.text)) {
          data.meta = b.text
            .replace(/^\*\*Last updated:\*\*\s*/i, "")
            .replace(/\(supersedes[^)]*\)\.?/i, "")
            .trim();
        } else if (/^\*\*North star:\*\*/i.test(b.text)) {
          data.northstar = b.text.replace(/^\*\*North star:\*\*\s*/i, "").trim();
        }
      }

      if (mode === "lane" && lane) {
        if (b.type === "p" && /^\*\*Goal:\*\*/i.test(b.text)) {
          lane.goal = b.text.replace(/^\*\*Goal:\*\*\s*/i, "").trim();
        } else if (b.type === "li") {
          const m = b.text.match(/^\*\*(.+?):\*\*\s*(.*)$/);
          if (m) lane.fields[m[1].toLowerCase().trim()] = m[2].trim();
        }
      }

    }
    return data;
  }

  function renderRoadmap(data, { live }) {
    const lanesEl = $("[data-roadmap-lanes]");
    const metaEl = $("[data-roadmap-meta]");
    const northEl = $("[data-roadmap-northstar]");
    const statusEl = $("[data-roadmap-status]");

    if (statusEl && !live) {
      statusEl.classList.add("is-fallback");
      statusEl.innerHTML = `<span class="pulse-dot"></span> SNAPSHOT · live fetch unavailable`;
    }

    if (metaEl && data.meta) {
      metaEl.innerHTML = `<b>${inlineMd(data.meta)}</b><br /><a href="${ROADMAP_GH}" target="_blank" rel="noreferrer">view raw on GitHub ↗</a>`;
    }

    if (northEl && data.northstar) {
      northEl.innerHTML = `<span style="font-family:var(--font-mono);font-size:12px;letter-spacing:0.2em;color:var(--ink-dim);display:block;margin-bottom:10px">NORTH STAR</span>${inlineMd(data.northstar)}`;
    }

    if (lanesEl) {
      lanesEl.innerHTML = data.lanes
        .map((lane, i) => {
          const f = lane.fields;
          const horizons = ["now", "next", "later"]
            .filter((k) => f[k])
            .map(
              (k) =>
                `<div class="horizon h-${k}"><h5>${k}</h5><p>${inlineMd(f[k])}</p></div>`
            )
            .join("");
          const extras = [
            ["state", "State"],
            ["bet", "The bet"],
            ["working when", "Working when"],
          ]
            .filter(([k]) => f[k])
            .map(([k, label]) => `<div class="lx"><span>${label}</span><p>${inlineMd(f[k])}</p></div>`)
            .join("");
          return `
            <article class="lane${i === 0 ? " is-open" : ""}">
              <button class="lane-head" type="button" aria-expanded="${i === 0}">
                <span class="lane-num">LANE ${lane.num}</span>
                <span class="lane-titles">
                  <h3>${inlineMd(lane.title)}</h3>
                  ${lane.subtitle ? `<p>${inlineMd(lane.subtitle)}</p>` : ""}
                </span>
                <span class="lane-chevron" aria-hidden="true">+</span>
              </button>
              <div class="lane-body">
                <div class="lane-body-inner">
                  ${lane.goal ? `<p class="lane-goal-line"><b>Goal:</b> ${inlineMd(lane.goal)}</p>` : ""}
                  <div class="lane-horizons">${horizons}</div>
                  ${extras ? `<div class="lane-extra">${extras}</div>` : ""}
                </div>
              </div>
            </article>`;
        })
        .join("");

      $$(".lane-head", lanesEl).forEach((head) => {
        head.addEventListener("click", () => {
          const lane = head.closest(".lane");
          const open = lane.classList.toggle("is-open");
          head.setAttribute("aria-expanded", String(open));
        });
      });
    }

  }

  (async function loadRoadmap() {
    const lanesEl = $("[data-roadmap-lanes]");
    if (!lanesEl) return;
    let md = null;
    let live = false;
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(ROADMAP_URL, { signal: ctrl.signal, cache: "no-store" });
      clearTimeout(timeout);
      if (res.ok) {
        md = await res.text();
        live = true;
      }
    } catch {
      /* fall through to snapshot */
    }
    if (!md) md = ROADMAP_FALLBACK;
    try {
      const data = parseRoadmap(md);
      if (!data.lanes.length) throw new Error("no lanes parsed");
      renderRoadmap(data, { live });
    } catch {
      renderRoadmap(parseRoadmap(ROADMAP_FALLBACK), { live: false });
    }
  })();
})();
