/* 當沖撐壓孔明錦囊 — 共用腳本 */
(function () {
  "use strict";
  const KM = (window.KM = window.KM || {});
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia && window.matchMedia("(hover: none)").matches;
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

  /* ---------- 放大舞台：把桌面版畫面放大到看得清楚 ---------- */
  KM.zoomStage = function (stage, opts) {
    opts = opts || {};
    const cam = stage.querySelector(".zstage__cam");
    if (!cam) return null;
    const IW = parseFloat(cam.dataset.w || "1920"), IH = parseFloat(cam.dataset.h || "1129");
    const st = { s: 1, tx: 0, ty: 0, region: null, zoomed: false };
    let camW = IW, camH = IH, ox = 0, oy = 0, sw = 0, sh = 0;

    const mini = document.createElement("div");
    mini.className = "zstage__mini"; mini.setAttribute("aria-hidden", "true");
    mini.innerHTML = '<img alt=""><i></i>';
    const miniImg = mini.querySelector("img"), miniBox = mini.querySelector("i");
    const ctrl = document.createElement("div");
    ctrl.className = "zstage__ctrl";
    ctrl.innerHTML = '<button type="button" class="zbtn zbtn--fit" data-z="fit">⊡ 看全圖</button><button type="button" class="zbtn" data-z="lb">⤢ 放大看</button>';
    const nav = document.createElement("div");
    nav.className = "zstage__nav";
    nav.innerHTML = '<button type="button" data-z="prev" aria-label="上一個">‹</button><button type="button" data-z="next" aria-label="下一個">›</button>';
    if (!opts.onStep) nav.hidden = true;
    const hint = document.createElement("div");
    hint.className = "zstage__hint"; hint.setAttribute("aria-hidden", "true");
    hint.textContent = coarse ? "左右拖曳可以移動畫面" : "拖曳可以移動 ・ Esc 看全圖";
    stage.append(mini, ctrl, nav, hint);

    const curImg = () => stage.querySelector(".zstage__cam img.is-on") || stage.querySelector(".zstage__cam img");
    function layout() {
      const r = stage.getBoundingClientRect();
      sw = r.width; sh = r.height;
      if (!sw || !sh) return;
      const base = Math.min(sw / IW, sh / IH);
      camW = IW * base; camH = IH * base; ox = (sw - camW) / 2; oy = (sh - camH) / 2;
      cam.style.width = camW + "px"; cam.style.height = camH + "px"; cam.style.left = ox + "px"; cam.style.top = oy + "px";
    }
    function clampPos() {
      const W = camW * st.s, H = camH * st.s;
      st.tx = W <= sw ? (sw - W) / 2 - ox : Math.min(-ox, Math.max(sw - W - ox, st.tx));
      st.ty = H <= sh ? (sh - H) / 2 - oy : Math.min(-oy, Math.max(sh - H - oy, st.ty));
    }
    function apply() {
      clampPos();
      cam.style.setProperty("--s", String(st.s));
      cam.style.transform = "translate(" + st.tx.toFixed(2) + "px," + st.ty.toFixed(2) + "px) scale(" + st.s.toFixed(4) + ")";
      stage.classList.toggle("is-zoomed", st.zoomed);
      const im = curImg();
      if (im && miniImg.getAttribute("src") !== im.getAttribute("src")) miniImg.src = im.getAttribute("src");
      const W = camW * st.s, H = camH * st.s;
      const vx = Math.max(0, -(ox + st.tx) / W), vy = Math.max(0, -(oy + st.ty) / H);
      const vw = Math.min(1, sw / W), vh = Math.min(1, sh / H);
      miniBox.style.left = (vx * 100).toFixed(2) + "%"; miniBox.style.top = (vy * 100).toFixed(2) + "%";
      miniBox.style.width = (vw * 100).toFixed(2) + "%"; miniBox.style.height = (vh * 100).toFixed(2) + "%";
      if (opts.onChange) opts.onChange(st);
    }
    function zoomTo(region) {
      const rg = typeof region === "string" ? region.split(",").map(Number) : region;
      if (!rg || rg.length !== 4 || rg.some(isNaN)) return fit();
      if (!sw) layout();
      const x = rg[0], y = rg[1], w = rg[2], h = rg[3];
      const rw = camW * w / 100, rh = camH * h / 100;
      const native = IW / camW; // 1 個圖片像素 = 1 個 CSS 像素
      let s = Math.min(sw / rw, sh / rh);
      if (s < native * 0.75) s = native * 0.75; // 區塊太大就放到至少 75% 原始大小，讓人拖著看
      s = Math.max(1, Math.min(native, s));
      st.s = s; st.region = rg; st.zoomed = s > 1.001;
      const cx = camW * (x + w / 2) / 100, cy = camH * (y + h / 2) / 100;
      st.tx = sw / 2 - ox - s * cx; st.ty = sh / 2 - oy - s * cy;
      apply();
    }
    function fit() { st.s = 1; st.tx = 0; st.ty = 0; st.region = null; st.zoomed = false; apply(); }

    // 拖曳平移（觸控只左右，直向留給頁面捲動）
    let drag = null;
    stage.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !st.zoomed || e.target.closest("button,a")) return;
      drag = { x: e.clientX, y: e.clientY, tx: st.tx, ty: st.ty, touch: e.pointerType === "touch" };
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      stage.classList.add("is-dragging");
    });
    stage.addEventListener("pointermove", (e) => {
      if (!drag) return;
      st.tx = drag.tx + (e.clientX - drag.x);
      st.ty = drag.touch ? drag.ty : drag.ty + (e.clientY - drag.y);
      apply();
    });
    const endDrag = () => { if (!drag) return; drag = null; stage.classList.remove("is-dragging"); };
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);

    stage.addEventListener("click", (e) => {
      const b = e.target.closest("[data-z]");
      if (!b) return;
      const k = b.dataset.z;
      if (k === "fit") fit();
      else if (k === "lb") KM.lightbox(curImg(), b);
      else if (k === "prev" && opts.onStep) opts.onStep(-1);
      else if (k === "next" && opts.onStep) opts.onStep(1);
    });
    mini.addEventListener("click", fit);
    stage.addEventListener("keydown", (e) => { if (e.key === "Escape" && st.zoomed) { e.preventDefault(); e.stopPropagation(); fit(); } });

    layout(); apply();
    if ("ResizeObserver" in window) {
      new ResizeObserver(() => { layout(); if (st.region) zoomTo(st.region); else fit(); }).observe(stage);
    } else {
      window.addEventListener("resize", () => { layout(); if (st.region) zoomTo(st.region); else fit(); });
    }
    return { zoomTo, fit, state: st, layout };
  };

  /* ---------- 燈箱：任何截圖點開就是原始解析度 ---------- */
  let lb = null, lbOpener = null, lbScale = 1, lbNat = [1920, 1129];
  function lbParts() { return { sc: lb.querySelector(".lightbox__scroll"), im: lb.querySelector(".lightbox__pad img"), z: lb.querySelector(".lightbox__zoom") }; }
  function lbFitScale() {
    const sc = lbParts().sc;
    return Math.min((sc.clientWidth - 32) / lbNat[0], (sc.clientHeight - 32) / lbNat[1], 1);
  }
  function lbSetScale(s, e) {
    const p = lbParts();
    s = Math.max(0.2, Math.min(4, s));
    const r = p.sc.getBoundingClientRect();
    const px = e ? e.clientX - r.left : p.sc.clientWidth / 2, py = e ? e.clientY - r.top : p.sc.clientHeight / 2;
    const r1 = p.im.getBoundingClientRect();
    const fx = (px - (r1.left - r.left)) / Math.max(1, r1.width), fy = (py - (r1.top - r.top)) / Math.max(1, r1.height);
    lbScale = s;
    p.im.style.width = Math.round(lbNat[0] * s) + "px"; p.im.style.height = Math.round(lbNat[1] * s) + "px";
    const r2 = p.im.getBoundingClientRect();
    p.sc.scrollLeft += (r2.left - r.left) - (px - fx * r2.width);
    p.sc.scrollTop += (r2.top - r.top) - (py - fy * r2.height);
    p.z.textContent = Math.round(s * 100) + "%";
  }
  function lbClose() {
    if (!lb || !lb.classList.contains("is-open")) return;
    lb.classList.remove("is-open");
    document.body.style.overflow = "";
    if (lbOpener && typeof lbOpener.focus === "function") { try { lbOpener.focus({ preventScroll: true }); } catch (err) { /* ignore */ } }
  }
  function lbBuild() {
    lb = document.createElement("div");
    lb.className = "lightbox"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "放大看圖");
    lb.innerHTML =
      '<div class="lightbox__bar"><span class="lightbox__title"></span><div class="lightbox__tools">' +
      '<button type="button" data-lb="-" aria-label="縮小">－</button><span class="lightbox__zoom">100%</span><button type="button" data-lb="+" aria-label="放大">＋</button>' +
      '<button type="button" data-lb="1">1:1</button><button type="button" data-lb="fit">適合螢幕</button>' +
      '<button type="button" class="lb-x" data-lb="x" aria-label="關閉">✕</button></div></div>' +
      '<div class="lightbox__scroll"><div class="lightbox__pad"><img alt=""></div></div>';
    document.body.appendChild(lb);
    const p = lbParts();
    lb.addEventListener("click", (e) => {
      const b = e.target.closest("[data-lb]");
      if (b) {
        const k = b.dataset.lb;
        if (k === "x") lbClose();
        else if (k === "+") lbSetScale(lbScale * 1.25);
        else if (k === "-") lbSetScale(lbScale / 1.25);
        else if (k === "1") lbSetScale(1);
        else if (k === "fit") lbSetScale(lbFitScale());
        return;
      }
      if (e.target === p.sc || e.target.classList.contains("lightbox__pad")) lbClose();
    });
    p.im.addEventListener("dblclick", (e) => { lbSetScale(Math.abs(lbScale - 1) < 0.01 ? lbFitScale() : 1, e); });
    p.sc.addEventListener("wheel", (e) => { e.preventDefault(); lbSetScale(lbScale * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e); }, { passive: false });
    // 滑鼠拖曳＝捲動
    let d = null;
    p.im.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" || e.button !== 0) return; d = { x: e.clientX, y: e.clientY, l: p.sc.scrollLeft, t: p.sc.scrollTop }; e.preventDefault(); });
    window.addEventListener("pointermove", (e) => { if (!d) return; p.sc.scrollLeft = d.l - (e.clientX - d.x); p.sc.scrollTop = d.t - (e.clientY - d.y); });
    window.addEventListener("pointerup", () => { d = null; });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") { e.preventDefault(); lbClose(); }
      else if (e.key === "+" || e.key === "=") lbSetScale(lbScale * 1.25);
      else if (e.key === "-") lbSetScale(lbScale / 1.25);
    });
  }
  KM.lightbox = function (img, opener) {
    if (!img) return;
    if (!lb) lbBuild();
    const p = lbParts();
    lbOpener = opener || img;
    lb.querySelector(".lightbox__title").textContent = img.alt || "";
    const src = img.currentSrc || img.src;
    const setNat = () => {
      lbNat = [p.im.naturalWidth || parseInt(img.getAttribute("width") || "1920", 10), p.im.naturalHeight || parseInt(img.getAttribute("height") || "1129", 10)];
      lbSetScale(window.innerWidth >= 900 ? 1 : lbFitScale());
      p.sc.scrollLeft = Math.max(0, (p.sc.scrollWidth - p.sc.clientWidth) / 2); p.sc.scrollTop = 0;
    };
    p.im.onload = setNat;
    p.im.src = src;
    lb.classList.add("is-open");
    document.body.style.overflow = "hidden";
    if (p.im.complete && p.im.naturalWidth) setNat();
    const x = lb.querySelector(".lb-x"); if (x) x.focus({ preventScroll: true });
  };
  function initLightbox() {
    const SEL = ".window img, .day__img img, img[data-zoomable]";
    document.querySelectorAll(SEL).forEach((im) => { im.setAttribute("tabindex", "0"); im.setAttribute("role", "button"); im.setAttribute("aria-label", (im.alt || "截圖") + "（點一下放大）"); });
    document.addEventListener("click", (e) => { const im = e.target.closest(SEL); if (im) KM.lightbox(im, im); });
    document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(SEL)) { e.preventDefault(); KM.lightbox(e.target, e.target); } });
  }

  /* ---------- 截圖導覽（步進器＋放大） ---------- */
  function initTours() {
    document.querySelectorAll("[data-tour]").forEach((root) => {
      const imgs = Array.from(root.querySelectorAll(".zstage__cam img, .tour__stage img"));
      const steps = Array.from(root.querySelectorAll(".tour__step"));
      const stepsBox = root.querySelector(".tour__steps");
      const spot = root.querySelector(".tour__spot");
      const spotSeal = spot ? spot.querySelector(".seal") : null;
      const stageEl = root.querySelector(".zstage");
      const dur = parseInt(root.dataset.dur || "5000", 10);
      root.style.setProperty("--tour-dur", dur + "ms");
      let cur = 0, timer = null, paused = false, visible = true, zs = null;

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
        if (zs) zs.zoomTo(st.dataset.zoom || st.dataset.spot);
        if (stepsBox && window.innerWidth <= 640) stepsBox.scrollTo({ left: Math.max(0, st.offsetLeft - 12), behavior: reduce ? "auto" : "smooth" });
        schedule();
      };
      const schedule = () => {
        clearTimeout(timer);
        if (reduce || paused || !visible) return;
        timer = setTimeout(() => show(cur + 1), dur);
      };
      zs = stageEl && root.hasAttribute("data-zoom") ? KM.zoomStage(stageEl, { onStep: (d) => show(cur + d) }) : null;
      steps.forEach((s, i) => s.addEventListener("click", () => show(i)));
      root.querySelectorAll("[data-dir]").forEach((b) => b.addEventListener("click", () => show(cur + parseInt(b.dataset.dir, 10))));
      root.addEventListener("mouseenter", () => { paused = true; clearTimeout(timer); });
      root.addEventListener("mouseleave", () => { paused = false; schedule(); });
      root.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); show(cur + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); show(cur - 1); }
        if (e.key === "Escape" && zs) { e.preventDefault(); zs.fit(); }
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

  /* ---------- 每頁的「這頁幾分鐘」提示列與「下一站」卡 ---------- */
  const PAGES = {
    guide: { k: "零", name: "第一次看", href: "guide.html", min: 10, see: "它是什麼、五個數字、主畫面每一塊在講什麼、天梯怎麼讀、三個位置與三個劇本、九個常見問題", blurb: "十分鐘新手導讀。點畫面上的數字，那一塊會放大並附上解釋。" },
    work: { k: "壹", name: "作品", href: "work.html", min: 5, see: "桌面版六步導覽（會自動放大到該看的地方）、它替你做的六件事、三個核心規則", blurb: "真實畫面六步導覽，還有輸入一個代號之後它替你做的六件事。" },
    concept: { k: "貳", name: "設計發想", href: "concept.html", min: 6, see: "為什麼叫孔明錦囊、三個名字的由來、三個設計原則、從手寫筆記到一座天梯的四幕故事", blurb: "為什麼叫孔明錦囊？天梯、伏擊位、錦囊三個名字的由來。" },
    usage: { k: "參", name: "實用情況", href: "usage.html", min: 6, see: "一天的使用故事、2026-10-21 的驗證紀錄、三檔真實輸出、誠實的限制與下一步", blurb: "從早上八點半到收盤的一天使用故事，和 2026-10-21 的實算驗證。" },
    glossary: { k: "肆", name: "名詞小辭典", href: "glossary.html", min: 5, see: "十五個名詞，每個一句白話加一個台積電的真實數字", blurb: "十五個名詞，每個一句白話、一個真實數字，看不懂的字都在這裡。" },
    play: { k: "伍", name: "拆錦囊", href: "play.html", min: 5, see: "按「帶我走一遍」、自己拖現價、翻開三個錦囊、CDP 計算機", blurb: "按「帶我走一遍」，再自己拖現價，看今天落在哪個劇本。" },
    home: { k: "封面", name: "回到封面", href: "index.html", blurb: "把三句話再看一次，或把網址分享給朋友。" }
  };
  const ORDER = ["guide", "work", "concept", "usage", "glossary", "play", "home"];
  function initPageChrome() {
    const page = document.body.dataset.page;
    const me = PAGES[page];
    const strip = document.querySelector("[data-readstrip]");
    if (strip && me && me.min) {
      strip.innerHTML = "<b>⏱ 這頁約 " + me.min + " 分鐘</b><span>你會看到：" + me.see + "</span>";
    }
    const slot = document.querySelector("[data-next]");
    if (slot && me) {
      const nk = ORDER[(ORDER.indexOf(page) + 1) % ORDER.length];
      const nx = PAGES[nk];
      slot.innerHTML =
        '<div class="wrap"><a class="next-card" href="' + nx.href + '">' +
        '<span class="next-card__k">下一站 ・ ' + nx.k + "</span>" +
        '<span class="next-card__n">' + nx.name + "</span>" +
        '<span class="next-card__p">' + nx.blurb + "</span>" +
        '<span class="next-card__arr" aria-hidden="true">→</span></a></div>';
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNav(); initPageChrome(); initReveal(); initCount(); initTypewriters(); initTours(); initPouches(); initLightbox();
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
