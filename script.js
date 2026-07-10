/* ── HEADER SCROLL ── */
const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const toast = document.querySelector("[data-toast]");
const copyButtons = document.querySelectorAll("[data-copy]");

const syncHeader = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 16);
};

window.addEventListener("scroll", syncHeader, { passive: true });
syncHeader();

menuButton.addEventListener("click", () => {
  const isOpen = mobileNav.classList.toggle("is-open");
  menuButton.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

mobileNav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    mobileNav.classList.remove("is-open");
    menuButton.setAttribute("aria-label", "Open menu");
  }
});

/* ── COPY BUTTONS ── */
const fallbackCopy = (value) => {
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.cssText = "position:fixed;left:-9999px";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  return copied;
};

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 1400);
};

copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const value = button.getAttribute("data-copy");
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      } else if (!fallbackCopy(value)) {
        throw new Error("copy failed");
      }
      showToast("Copied");
    } catch {
      const copied = fallbackCopy(value);
      showToast(copied ? "Copied" : "Select the command");
    }
  });
});

/* ── SCROLL REVEAL ── */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* ── SCAN ANIMATION (example card) ── */
const scanCard = document.querySelector("[data-scan-card]");
if (scanCard) {
  const scanObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          scanCard.classList.add("scan-running");
          setTimeout(() => scanCard.classList.add("scan-done"), 1800);
          scanObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  scanObserver.observe(scanCard);
}

/* ── LIVE ROADMAP (synced from GitHub) ── */
(function initRoadmap() {
  const root = document.querySelector("[data-roadmap]");
  if (!root) return;

  const ladder = root.querySelector("[data-roadmap-ladder]");
  const meta = root.querySelector("[data-roadmap-meta]");
  const RAW_URL =
    "https://raw.githubusercontent.com/DSB-117/brainblast/main/ROADMAP-TRAINING-DATA.md";

  // Maps the markdown status glyphs to our CSS state + label.
  const STATUS = {
    "✅": { cls: "is-shipped", label: "Shipped" },
    "◐": { cls: "is-progress", label: "In progress" },
    "☐": { cls: "is-todo", label: "Not started" },
  };

  // Strip the inline markdown the table cells carry (**bold**, `code`, _em_, links).
  const clean = (s) =>
    s
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
      .replace(/[*_`]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const esc = (s) =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  function parseStages(md) {
    const stages = [];
    const roadmapSection = md.split(/^## Roadmap at a glance\s*$/m)[1]?.split(/^---\s*$/m)[0] || "";
    const rows = roadmapSection.split("\n").filter((line) => /^\|\s*\*\*\d+/.test(line));
    rows.forEach((row) => {
      const cells = row
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());
      if (cells.length < 3) return;

      // Current table: Stage | Theme | Engineering | What's left | Exit milestone.
      // The older table stored the status glyph inside the Stage cell, so retain
      // compatibility in case the roadmap format is rolled back.
      const isCurrentFormat = cells.length >= 5;
      const stageCell = cells[0];
      const statusCell = isCurrentFormat ? cells[2] : cells[0];
      const numMatch = stageCell.match(/(\d+)/);
      const glyph = Object.keys(STATUS).find((g) => statusCell.includes(g));
      if (!numMatch || !glyph) return;

      const statusText = clean(statusCell.replace(glyph, ""));
      const statusLabel = statusText
        ? statusText.charAt(0).toUpperCase() + statusText.slice(1)
        : STATUS[glyph].label;

      stages.push({
        num: numMatch[1],
        status: { ...STATUS[glyph], label: statusLabel },
        theme: clean(cells[1]),
        remaining: isCurrentFormat ? clean(cells[3]) : "",
        milestone: clean(isCurrentFormat ? cells[4] : cells[2]),
      });
    });
    return stages;
  }

  function parseMeta(md) {
    const updated = md.match(/\*\*Last updated:\*\*\s*([0-9-]+)/);
    const anchor = md.match(/anchored at\s*\*\*([^*]+)\*\*/);
    return {
      updated: updated ? updated[1] : null,
      anchor: anchor ? anchor[1].trim() : null,
    };
  }

  function render(stages) {
    ladder.innerHTML = stages
      .map(
        (s) => `
      <li class="roadmap-stage ${s.status.cls}">
        <div class="roadmap-node" aria-hidden="true"></div>
        <div class="roadmap-body">
          <div class="roadmap-stageline">
            <span class="roadmap-num">Stage ${esc(s.num)}</span>
            <span class="roadmap-status">${esc(s.status.label)}</span>
          </div>
          <h4>${esc(s.theme)}</h4>
          ${s.remaining && s.remaining !== "—" ? `<p class="roadmap-remaining"><strong>What's left:</strong> ${esc(s.remaining)}</p>` : ""}
          <p>${esc(s.milestone)}</p>
        </div>
      </li>`
      )
      .join("");
  }

  let syncInFlight = false;
  let hasSynced = false;

  function syncRoadmap() {
    if (syncInFlight) return;
    syncInFlight = true;

    fetch(`${RAW_URL}?refresh=${Date.now()}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((md) => {
        const stages = parseStages(md);
        if (stages.length < 6) throw new Error("roadmap table could not be parsed");
        render(stages);

        const { updated, anchor } = parseMeta(md);
        if (meta && (updated || anchor)) {
          const bits = [];
          if (updated) bits.push(`Updated ${updated}`);
          if (anchor) bits.push(`anchored at <code>${esc(anchor)}</code>`);
          meta.innerHTML = `${bits.join(" · ")} · synced live from <code>main</code>`;
        }
        hasSynced = true;
      })
      .catch(() => {
        // Keep the last good live result during a transient failure. On first-load
        // failure, the static fallback remains visible and clearly identified.
        if (!hasSynced && meta) {
          meta.innerHTML = "Showing last known roadmap · live source: <code>GitHub main</code>";
        }
      })
      .finally(() => {
        syncInFlight = false;
      });
  }

  syncRoadmap();
  window.setInterval(() => {
    if (!document.hidden) syncRoadmap();
  }, 5 * 60 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncRoadmap();
  });
})();

/* ── HERO CANVAS — NEURAL NETWORK ── */
(function initCanvas() {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const COLORS = ["#2fc8ee", "#2fc8ee", "#1454d8", "#6d3ccf", "#2fc8ee"];
  const NODE_COUNT = 72;
  const MAX_DIST = 180;
  const SPEED = 0.35;

  let nodes = [];
  let W = 0;
  let H = 0;
  let raf;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function makeNode() {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const isHub = Math.random() < 0.15;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      r: isHub ? Math.random() * 2.5 + 2.5 : Math.random() * 1.8 + 0.8,
      color,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 0.018 + Math.random() * 0.022,
      isHub,
    };
  }

  function init() {
    resize();
    nodes = Array.from({ length: NODE_COUNT }, makeNode);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Edges
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * 0.28;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(47,200,238,${alpha})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }

    // Nodes
    nodes.forEach((n) => {
      n.phase += n.phaseSpeed;
      const pulse = (Math.sin(n.phase) + 1) * 0.5;
      const r = n.r + pulse * (n.isHub ? 2.5 : 1.2);

      // Glow halo
      const haloR = r * (n.isHub ? 8 : 5);
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, haloR);
      const alpha = (0.12 + pulse * 0.18).toFixed(2);
      grad.addColorStop(0, n.color + Math.round(alpha * 255).toString(16).padStart(2, "0"));
      grad.addColorStop(1, n.color + "00");
      ctx.beginPath();
      ctx.arc(n.x, n.y, haloR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.fill();

      // Drift and wrap
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < -20) n.x = W + 20;
      else if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20;
      else if (n.y > H + 20) n.y = -20;
    });

    raf = requestAnimationFrame(draw);
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); }, 120);
  });

  // Pause when tab hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else draw();
  });

  init();
  draw();
})();
