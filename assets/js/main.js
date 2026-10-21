/* 當沖撐壓孔明錦囊 — 共用腳本 */
(function () {
  "use strict";
  const KM = (window.KM = window.KM || {});
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  KM.reduceMotion = reduce;

  /* ---------- 工具 ---------- */
  KM.data = function (sym) {
    return window.LADDERS && window.LADDERS.symbols ? window.LADDERS.symbols[sym] : null;
  };
  KM.tick = function (price, market) {
    if (market === "FUTURES") return 1;
    if (price < 10) return 0.01;
    if (price < 50) return 0.05;
    if (price < 100) return 0.1;
    if (price < 500) return 0.5;
    if (price < 1000) return 1;
    return 5;
  };
  KM.fmt = function (p, market) {
    if (p == null || isNaN(p)) return "—";
    if (market === "FUTURES") return Math.round(p).toLocaleString("en-US");
    if (Math.abs(p - Math.round(p)) < 1e-9) return String(Math.round(p));
    return (Math.round(p * 100) / 100).toFixed(2).replace(/0$/, "");
  };
  KM.pct = function (v) {
    const s = (v > 0 ? "+" : "") + v.toFixed(2) + "%";
    return s === "+0.00%" ? "0.00%" : s;
  };
  const TYPE_LABEL = {
    limit_up: "漲停", limit_down: "跌停", resistance: "壓力", support: "支撐", pivot: "樞紐", neutral: "中性"
  };
  const TYPE_LABEL_FUT = { limit_up: "天梯頂", limit_down: "天梯底" };
  function cleanTags(tags) {
    return (tags || [])
      .filter((t) => !/伏擊Top/.test(t))
      .map((t) => t.replace(/^[^一-龥A-Za-z0-9(（]+/, "").trim())
      .filter(Boolean);
  }
  KM.cleanTags = cleanTags;

  /* ---------- 天梯 ---------- */
  KM.renderLadder = function (el, sym, opts) {
    opts = opts || {};
    const d = typeof sym === "string" ? KM.data(sym) : sym;
    if (!el || !d) return;
    const amb = {};
    (d.top3_ambush || []).forEach((a) => { amb[String(a.price)] = a.rank; });
    el.classList.remove("is-built");
    el.classList.toggle("ladder--paper", !!opts.paper);
    let html = '<div class="ladder__head"><span>價位</span><span>漲跌</span><span>關鍵匯流</span></div>';
    const levels = opts.limit ? d.levels.slice(0, opts.limit) : d.levels;
    levels.forEach((l, i) => {
      const rank = amb[String(l.price)];
      const labels = d.market_type === "FUTURES" ? Object.assign({}, TYPE_LABEL, TYPE_LABEL_FUT) : TYPE_LABEL;
      const type = rank ? "伏擊 Top" + rank : labels[l.level_type] || l.level_type;
      const tags = cleanTags(l.tags).slice(0, opts.maxTags || 4).join(" ・ ");
      html +=
        '<div class="rung rung--' + l.level_type + (rank ? " rung--ambush" : "") + '" style="--i:' + i + '" data-price="' + l.price + '" title="' + cleanTags(l.tags).join("、") + '">' +
        '<span class="rung__price">' + KM.fmt(l.price, d.market_type) + "</span>" +
        '<span class="rung__pct">' + KM.pct(l.pct_from_close) + "</span>" +
        '<span class="rung__meta"><span class="rung__type">' + type + '</span><span class="rung__tags">' + tags + "</span></span>" +
        "</div>";
    });
    el.innerHTML = html;
    const build = () => el.classList.add("is-built");
    if (reduce || opts.animate === false) { build(); return; }
    if (opts.onView !== false && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) { build(); io.disconnect(); } });
      }, { threshold: 0.2 });
      io.observe(el);
    } else {
      setTimeout(build, opts.delay || 0);
    }
  };
  KM.markCurrent = function (el, price) {
    if (!el) return;
    let best = null, bestD = Infinity;
    el.querySelectorAll(".rung").forEach((r) => {
      r.classList.remove("rung--current");
      const dlt = Math.abs(parseFloat(r.dataset.price) - price);
      if (dlt < bestD) { bestD = dlt; best = r; }
    });
    if (best) best.classList.add("rung--current");
    return best;
  };

  /* ---------- 捲動顯現 ---------- */
  function initReveal() {
    const els = document.querySelectorAll(".reveal, .seal[data-stamp]");
    if (!("IntersectionObserver" in window) || reduce) { els.forEach((e) => e.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    els.forEach((e) => io.observe(e));
    // 安全網：若觀察器延遲，2.5 秒後把已在視窗內的元素直接顯示
    const safety = () => {
      document.querySelectorAll(".reveal:not(.is-in)").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 1.15 && r.bottom > 0) el.classList.add("is-in");
      });
    };
    setTimeout(safety, 2500);
    window.addEventListener("load", () => setTimeout(safety, 800));
  }

  /* ---------- 數字跳動 ---------- */
  function initCount() {
    const els = document.querySelectorAll("[data-count]");
    if (!els.length) return;
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || "0", 10);
      const suffix = el.dataset.suffix || "";
      if (reduce) { el.textContent = target.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix; return; }
      const t0 = performance.now(), dur = 1400;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = (target * e).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }); }, { threshold: 0.4 });
    els.forEach((e) => io.observe(e));
  }

  /* ---------- 打字機 ---------- */
  KM.typewrite = function (el, text, opts) {
    opts = opts || {};
    const cps = opts.cps || 900;
    if (reduce) { el.textContent = text; return; }
    el.textContent = "";
    el.classList.add("type-cursor");
    let i = 0, last = performance.now(), done = false;
    const finish = () => { done = true; el.textContent = text; el.classList.remove("type-cursor"); };
    const tickFn = (t) => {
      if (done) return;
      const n = Math.max(1, Math.round(((t - last) / 1000) * cps));
      last = t;
      i = Math.min(text.length, i + n);
      el.textContent = text.slice(0, i);
      if (i < text.length) requestAnimationFrame(tickFn); else el.classList.remove("type-cursor");
    };
    el.addEventListener("click", finish, { once: true });
    requestAnimationFrame(tickFn);
  };
  function initTypewriters() {
    const els = document.querySelectorAll("[data-type-src]");
    if (!els.length) return;
    const start = (el) => {
      const d = KM.data(el.dataset.typeSrc);
      let text = d ? d.summary_text || "" : "";
      if (el.dataset.typeMode === "narrative") {
        // 只保留敘事段落，略過等寬字元排版的雙欄表格（網頁字體無法對齊）
        text = text.split("\n").filter((ln) => !/^\s*[+|]/.test(ln)).join("\n").replace(/\n{3,}/g, "\n\n").trim();
      }
      KM.typewrite(el, text, { cps: parseInt(el.dataset.cps || "1200", 10) });
    };
    const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) { start(e.target); io.unobserve(e.target); } }); }, { threshold: 0.2 });
    els.forEach((e) => io.observe(e));
  }

  /* ---------- 截圖導覽 ---------- */
  function initTours() {
    document.querySelectorAll("[data-tour]").forEach((root) => {
      const imgs = Array.from(root.querySelectorAll(".tour__stage img"));
      const steps = Array.from(root.querySelectorAll(".tour__step"));
      const spot = root.querySelector(".tour__spot");
      const spotSeal = spot ? spot.querySelector(".seal") : null;
      const dur = parseInt(root.dataset.dur || "5000", 10);
      root.style.setProperty("--tour-dur", dur + "ms");
      let cur = 0, timer = null, paused = false, visible = true;

      const show = (i) => {
        cur = (i + steps.length) % steps.length;
        const st = steps[cur];
        imgs.forEach((im) => im.classList.toggle("is-on", im.dataset.step === st.dataset.img));
        steps.forEach((s, j) => { s.classList.toggle("is-on", j === cur); s.setAttribute("aria-selected", j === cur); });
        const bar = st.querySelector(".tour__bar i");
        if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; }
        if (spot) {
          const sp = (st.dataset.spot || "").split(",").map(Number);
          if (sp.length === 4) {
            spot.style.left = sp[0] + "%"; spot.style.top = sp[1] + "%"; spot.style.width = sp[2] + "%"; spot.style.height = sp[3] + "%";
            spot.classList.add("is-on");
            if (spotSeal) spotSeal.textContent = st.dataset.seal || "";
          } else { spot.classList.remove("is-on"); }
        }
        schedule();
      };
      const schedule = () => {
        clearTimeout(timer);
        if (reduce || paused || !visible) return;
        timer = setTimeout(() => show(cur + 1), dur);
      };
      steps.forEach((s, i) => s.addEventListener("click", () => show(i)));
      root.querySelectorAll("[data-dir]").forEach((b) => b.addEventListener("click", () => show(cur + parseInt(b.dataset.dir, 10))));
      root.addEventListener("mouseenter", () => { paused = true; clearTimeout(timer); });
      root.addEventListener("mouseleave", () => { paused = false; schedule(); });
      root.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); show(cur + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); show(cur - 1); }
      });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver((es) => { es.forEach((e) => { visible = e.isIntersecting; if (visible) schedule(); else clearTimeout(timer); }); }, { threshold: 0.3 }).observe(root);
      }
      show(0);
    });
  }

  /* ---------- 錦囊翻面 ---------- */
  function initPouches() {
    document.addEventListener("click", (e) => {
      const open = e.target.closest("[data-pouch-open]");
      const close = e.target.closest("[data-pouch-close]");
      if (open) { open.closest(".pouch-card").classList.add("open"); }
      if (close) { close.closest(".pouch-card").classList.remove("open"); }
    });
    document.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-pouch-open]")) { e.preventDefault(); e.target.closest(".pouch-card").classList.add("open"); }
    });
  }

  /* ---------- 導覽 ---------- */
  function initNav() {
    const page = document.body.dataset.page;
    document.querySelectorAll("[data-nav]").forEach((a) => { if (a.dataset.nav === page) a.setAttribute("aria-current", "page"); });
    const burger = document.getElementById("navBurger");
    if (burger) {
      burger.addEventListener("click", () => {
        const open = document.body.classList.toggle("nav-open");
        burger.setAttribute("aria-expanded", String(open));
      });
      document.querySelectorAll(".nav__links a").forEach((a) => a.addEventListener("click", () => document.body.classList.remove("nav-open")));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNav(); initReveal(); initCount(); initTypewriters(); initTours(); initPouches();
    document.querySelectorAll("[data-ladder]").forEach((el) => {
      KM.renderLadder(el, el.dataset.ladder, {
        paper: el.hasAttribute("data-paper"),
        limit: el.dataset.limit ? parseInt(el.dataset.limit, 10) : 0,
        maxTags: el.dataset.maxTags ? parseInt(el.dataset.maxTags, 10) : 4,
        onView: !el.hasAttribute("data-now"),
        delay: parseInt(el.dataset.delay || "0", 10)
      });
    });
    document.querySelectorAll("[data-fill]").forEach((el) => {
      // data-fill="2330:ref_close" 之類的簡單欄位填入
      const [sym, key] = el.dataset.fill.split(":");
      const d = KM.data(sym);
      if (!d) return;
      const v = key.split(".").reduce((o, k) => (o ? o[k] : undefined), d);
      if (v === undefined) return;
      el.textContent = typeof v === "number" ? KM.fmt(v, d.market_type) : v;
    });
  });
})();
