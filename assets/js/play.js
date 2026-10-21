/* 互動體驗頁 */
(function () {
  "use strict";
  const KM = window.KM;
  const $ = (s, r) => (r || document).querySelector(s);
  const state = { sym: "2330", price: null };

  const SC = {
    a: { key: "scenario_a", cls: "a", color: "cinnabar", accent: "#c8372d", name: "劇本 A", sub: "開高突破", who: "強勢進攻型" },
    b: { key: "scenario_b", cls: "b", color: "gold", accent: "#c9a227", name: "劇本 B", sub: "平盤震盪", who: "箱型區間型" },
    c: { key: "scenario_c", cls: "c", color: "celadon", accent: "#5e8c7a", name: "劇本 C", sub: "開低破線", who: "弱勢防守型" }
  };

  function strip(s) { return (s || "").replace(/^[^一-龥A-Za-z0-9【(（]+/, "").trim(); }

  function renderHeader(d) {
    $("#pName").textContent = d.name;
    $("#pSym").textContent = d.symbol;
    $("#pDate").textContent = (d.session_info && d.session_info.data_full_str) || d.date_str;
    const b = d.subjective_bias || {};
    $("#pBias").textContent = b.bias || "—";
    $("#pBias").className = "zone " + (/多/.test(b.bias || "") ? "zone--a" : "zone--c");
    $("#pStars").textContent = b.stars || "";
    $("#pReason").textContent = b.core_reason || "";
    $("#pRef").textContent = KM.fmt(d.ref_close, d.market_type);
    $("#pYH").textContent = KM.fmt(d.yesterday_high, d.market_type);
    $("#pYL").textContent = KM.fmt(d.yesterday_low, d.market_type);
    $("#pCDP").textContent = KM.fmt(d.cdp_values.CDP, d.market_type);
  }

  function renderSlider(d) {
    const sl = $("#priceSlider");
    const tick = KM.tick(d.ref_close, d.market_type);
    sl.min = d.limit_down; sl.max = d.limit_up; sl.step = tick;
    sl.value = d.ref_close;
    $("#slMin").textContent = KM.fmt(d.limit_down, d.market_type) + (d.market_type === "FUTURES" ? " 天梯底" : " 跌停");
    $("#slMax").textContent = KM.fmt(d.limit_up, d.market_type) + (d.market_type === "FUTURES" ? " 天梯頂" : " 漲停");
    $("#slTick").textContent = "每檔 " + tick;
    state.price = d.ref_close;
    readout(d);
  }

  function readout(d) {
    const p = state.price;
    const pct = ((p - d.ref_close) / d.ref_close) * 100;
    $("#roPrice").textContent = KM.fmt(p, d.market_type);
    const pctEl = $("#roPct");
    pctEl.textContent = KM.pct(pct);
    pctEl.style.color = pct > 0 ? "#ffb3ab" : pct < 0 ? "#a9d6c4" : "";

    // 劇本區
    let z, zt, zd;
    if (p > d.yesterday_high) { z = "a"; zt = "劇本 A ・ 開高突破區"; zd = "已越過昨高 " + KM.fmt(d.yesterday_high, d.market_type) + "，等回踩不破再上車，切忌急追。"; }
    else if (p < d.yesterday_low) { z = "c"; zt = "劇本 C ・ 開低破線區"; zd = "跌破昨低 " + KM.fmt(d.yesterday_low, d.market_type) + "，嚴禁接刀，等反抽不過再偏空。"; }
    else { z = "b"; zt = "劇本 B ・ 平盤震盪區"; zd = "落在昨高昨低之間，中軸不開單，耐心等邊界。"; }
    const zone = $("#roZone");
    zone.className = "zone zone--" + z; zone.textContent = zt;
    $("#roZoneDesc").textContent = zd;

    // 最近伏擊位
    let best = null, bd = Infinity;
    (d.top3_ambush || []).forEach((a) => { const dd = Math.abs(a.price - p); if (dd < bd) { bd = dd; best = a; } });
    if (best) {
      const tick = KM.tick(d.ref_close, d.market_type);
      const ticks = Math.round(bd / tick);
      $("#roAmb").textContent = "伏擊 Top" + best.rank + " ・ " + KM.fmt(best.price, d.market_type);
      $("#roAmbName").textContent = strip(best.title).replace(/\s*\(.*$/, "");
      $("#roAmbDist").textContent = ticks === 0 ? "就在這裡，扣板機的位置" : "距離 " + ticks + " 檔（" + KM.pct(((best.price - p) / p) * 100) + "）";
      $("#roAmbSop").textContent = best.brief_sop || "";
    }

    // 上下最近撐壓
    let up = null, dn = null;
    d.levels.forEach((l) => {
      if (l.price > p && (!up || l.price < up.price)) up = l;
      if (l.price < p && (!dn || l.price > dn.price)) dn = l;
    });
    $("#roUp").textContent = up ? KM.fmt(up.price, d.market_type) : "—";
    $("#roUpTag").textContent = up ? KM.cleanTags(up.tags).slice(0, 2).join("・") : "";
    $("#roDn").textContent = dn ? KM.fmt(dn.price, d.market_type) : "—";
    $("#roDnTag").textContent = dn ? KM.cleanTags(dn.tags).slice(0, 2).join("・") : "";

    KM.markCurrent($("#playLadder"), p);
    highlightPouch(z);
  }

  function highlightPouch(z) {
    document.querySelectorAll(".pouch-card").forEach((c) => c.classList.toggle("is-hot", c.dataset.sc === z));
  }

  function renderPouches(d) {
    const pb = d.j_playbook || {};
    Object.keys(SC).forEach((k) => {
      const sc = SC[k], s = pb[sc.key] || {};
      const card = $('.pouch-card[data-sc="' + k + '"]');
      if (!card) return;
      card.classList.remove("open");
      card.style.setProperty("--accent", sc.accent);
      $(".pc-cond", card).textContent = s.condition || "";
      $(".pc-action", card).textContent = strip(s.action);
      $(".pc-entry", card).textContent = s.entry_sop || "";
      $(".pc-stop", card).textContent = s.stop_loss || "";
      $(".pc-target", card).textContent = s.target || "";
      const fb = $(".pc-fake", card);
      if (fb) {
        fb.textContent = s.fake_breakout ? strip(s.fake_breakout) : "";
        const show = s.fake_breakout ? "" : "none";
        fb.style.display = show;
        if (fb.previousElementSibling) fb.previousElementSibling.style.display = show;
      }
    });
    const q = (pb.j_quotes || [])[0];
    $("#pQuote").textContent = q ? strip(q) : "";
  }

  /* ---------- CDP 小計算機 ---------- */
  function cdp(H, L, C) {
    const c = (H + L + 2 * C) / 4, r = H - L;
    return { AH: c + r, NH: 2 * c - L, CDP: c, NL: 2 * c - H, AL: c - r };
  }
  function calc() {
    const H = parseFloat($("#inH").value), L = parseFloat($("#inL").value), C = parseFloat($("#inC").value);
    const out = $("#cdpOut");
    if (!(H > 0 && L > 0 && C > 0) || H < L) { out.querySelectorAll(".v").forEach((v) => (v.textContent = "—")); return; }
    const r = cdp(H, L, C);
    ["AH", "NH", "CDP", "NL", "AL"].forEach((k) => { $("." + k + " .v", out).textContent = (Math.round(r[k] * 100) / 100).toFixed(2).replace(/\.?0+$/, ""); });
  }
  function fillCalc(d) {
    $("#inH").value = d.yesterday_high; $("#inL").value = d.yesterday_low; $("#inC").value = d.ref_close;
    calc();
  }

  function render() {
    const d = KM.data(state.sym);
    if (!d) return;
    renderHeader(d);
    KM.renderLadder($("#playLadder"), d, { onView: false, delay: 50, maxTags: 3 });
    renderSlider(d);
    renderPouches(d);
    fillCalc(d);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("#symSeg button").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll("#symSeg button").forEach((x) => x.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        state.sym = b.dataset.sym;
        render();
      });
    });
    $("#priceSlider").addEventListener("input", (e) => { state.price = parseFloat(e.target.value); readout(KM.data(state.sym)); });
    document.querySelectorAll("[data-jump]").forEach((b) => b.addEventListener("click", () => {
      const d = KM.data(state.sym);
      const map = { ref: d.ref_close, yh: d.yesterday_high, yl: d.yesterday_low, t1: d.top3_ambush[0].price, t2: d.top3_ambush[1].price, t3: d.top3_ambush[2].price };
      const v = map[b.dataset.jump];
      if (v == null) return;
      $("#priceSlider").value = v; state.price = v; readout(d);
    }));
    ["#inH", "#inL", "#inC"].forEach((s) => $(s).addEventListener("input", calc));
    render();
  });
})();
