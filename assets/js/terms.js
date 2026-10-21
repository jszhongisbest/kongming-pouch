/* 名詞小辭典：資料 ＋ 全站提示小卡 ＋ 辭典頁渲染 */
(function () {
  "use strict";
  const TERMS = [
    { id: "daytrade", name: "當沖", en: "Day trading", cat: "基本", short: "當天買、當天賣，收盤前一定把部位出掉，不留到明天。", ex: "早上 9:00 開盤後買進台積電，13:30 收盤前賣掉，不管賺賠都不留過夜。" },
    { id: "sr", name: "撐壓（支撐／壓力）", en: "Support / Resistance", cat: "基本", short: "價格容易停下來的地方：往下掉容易被接住的叫支撐，往上漲容易被擋住的叫壓力。", ex: "今天台積電 2400 是支撐（很多人想在這裡買），2440 是壓力（很多人想在這裡賣）。" },
    { id: "ref", name: "平盤", en: "Reference price", cat: "基本", short: "昨天的收盤價，是今天漲跌的基準點。高於它叫上漲，低於它叫下跌。", ex: "台積電今天的平盤是 2420。開在 2425 叫「開高」，開在 2415 叫「開低」。" },
    { id: "yhyl", name: "昨高、昨低", en: "Previous high / low", cat: "基本", short: "昨天盤中最高和最低的成交價，是今天最常被拿來當邊界的兩條線。", ex: "昨高 2435、昨低 2415。今天衝過 2435 代表比昨天強，跌破 2415 代表比昨天弱。" },
    { id: "limit", name: "漲停、跌停", en: "Limit up / down", cat: "基本", short: "台股一天最多只能漲或跌 10%，到了就不能再往上或往下成交。", ex: "平盤 2420，漲停是 2660、跌停是 2180，今天的價格只會在這之間。" },
    { id: "tick", name: "跳動檔位", en: "Tick size", cat: "基本", short: "價格一次最少跳多少。股價越高，一檔越大。系統算出的每個價位都會先對齊到檔位。", ex: "台積電超過 1,000 元，一檔是 5 元，所以價位只會是 2420、2425、2430，不會出現 2423。" },
    { id: "cdp", name: "CDP 五價", en: "Counter-trend Daily Pivot", cat: "計算", short: "用昨天的最高、最低、收盤算出今天的五條線：中間的 CDP 是多空分水嶺，上下各兩條是轉強、轉弱與極限。", ex: "昨高 2435、昨低 2415、昨收 2420，算出 CDP 2422.5，AH 2442.5、NH 2430、NL 2410、AL 2402.5。" },
    { id: "pivot", name: "樞紐", en: "Pivot points", cat: "計算", short: "另一套用昨天高低收算出來的支撐壓力線，上方 R1 到 R3，下方 S1 到 S3。", ex: "台積電今天的樞紐 R2 在 2440，剛好和 CDP 的 AH、J-Box 箱頂疊在一起，所以 2440 特別重要。" },
    { id: "ma", name: "均線與扣抵", en: "Moving average", cat: "計算", short: "最近幾天收盤價的平均。「扣抵」是看明天會扣掉哪一天的價格，預先知道均線會往上還是往下。", ex: "台積電 5 日均線 2421 正在下彎，意思是最近的價格比之前低，均線變成壓力。" },
    { id: "jbox", name: "J-Box 整理箱", en: "Consolidation box", cat: "結構", short: "最近幾天價格來回震盪的範圍，像一個箱子：箱頂是壓力、箱底是支撐、中軸是多空分界。", ex: "台積電最近四天在 2390 到 2445 之間來回，箱頂 2445、箱底 2390、中軸 2416。" },
    { id: "volume", name: "換手成本（大量區）", en: "High-volume level", cat: "結構", short: "成交量特別大的價位，代表很多人在那裡買進。之後價格回到那裡，常常會有反應。", ex: "台積電 2460 和 2490 是最近的大量區，所以它們出現在天梯的壓力階上。" },
    { id: "ladder", name: "天梯", en: "Price ladder", cat: "結構", short: "把今天所有重要的價位從漲停排到跌停，一階一階列出來，每一階寫上它為什麼重要。", ex: "台積電今天的天梯有 19 階，從 2660 漲停排到 2180 跌停。" },
    { id: "ambush", name: "伏擊位", en: "Ambush level", cat: "怎麼用", short: "天梯上理由疊得最多的三個價位，是今天唯一建議出手的地方：上方獵殺位、下方吸籌位、中間分水嶺。", ex: "Top1 上方 2440、Top2 下方 2400、Top3 分水嶺 2420。價格沒到這三個地方，就不動。" },
    { id: "scenario", name: "劇本", en: "Scenario", cat: "怎麼用", short: "開盤前寫好的三套應對：開高（A）、開平（B）、開低（C），各有條件、進場、停損、目標。開盤只會發生一種。", ex: "台積電今天若開在 2420 上下 0.5% 內，就是劇本 B：中間不動，等價格走到 2440 或 2400 再出手。" },
    { id: "stop", name: "停損", en: "Stop loss", cat: "怎麼用", short: "事先決定「錯了就在這裡認輸」的價格，到了就無條件出場，避免小賠變大賠。", ex: "在 2400 做多，防守設在下方兩檔 2390。跌破 2390 就離場，不要等。" }
  ];
  const CATS = [["基本", "基本價位"], ["計算", "算出來的價位"], ["結構", "結構"], ["怎麼用", "怎麼用"]];
  const map = {};
  TERMS.forEach((t) => (map[t.id] = t));
  window.KM = window.KM || {};
  window.KM.TERMS = TERMS;
  window.KM.termMap = map;

  document.addEventListener("DOMContentLoaded", () => {
    /* ---------- 提示小卡 ---------- */
    const pop = document.createElement("div");
    pop.className = "term-pop";
    pop.setAttribute("role", "dialog");
    pop.hidden = true;
    pop.innerHTML = '<div class="term-pop__name"></div><p class="term-pop__short"></p><p class="term-pop__ex"><b>例</b><span></span></p><a class="term-pop__more" href="#">完整說明 →</a>';
    document.body.appendChild(pop);
    const onGlossary = /glossary\.html$/.test(location.pathname);
    let current = null, hideTimer = null;
    const canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;

    function position(el) {
      const r = el.getBoundingClientRect();
      const pw = Math.min(340, window.innerWidth - 24);
      pop.style.width = pw + "px";
      let x = r.left + r.width / 2 - pw / 2;
      x = Math.max(12, Math.min(x, window.innerWidth - pw - 12));
      const ph = pop.offsetHeight;
      let y = r.bottom + 10;
      if (y + ph > window.innerHeight - 12 && r.top - ph - 10 > 12) y = r.top - ph - 10;
      pop.style.left = x + window.scrollX + "px";
      pop.style.top = y + window.scrollY + "px";
    }
    function show(el) {
      const t = map[el.dataset.term];
      if (!t) return;
      clearTimeout(hideTimer);
      current = el;
      pop.querySelector(".term-pop__name").textContent = t.name + (t.en ? " ・ " + t.en : "");
      pop.querySelector(".term-pop__short").textContent = t.short;
      pop.querySelector(".term-pop__ex span").textContent = t.ex;
      pop.querySelector(".term-pop__more").href = (onGlossary ? "" : "glossary.html") + "#" + t.id;
      pop.hidden = false;
      position(el);
      document.querySelectorAll(".term[aria-expanded='true']").forEach((x) => x.setAttribute("aria-expanded", "false"));
      el.setAttribute("aria-expanded", "true");
    }
    function hide() {
      pop.hidden = true;
      if (current) current.setAttribute("aria-expanded", "false");
      current = null;
    }
    document.querySelectorAll(".term").forEach((el) => {
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.setAttribute("aria-expanded", "false");
      el.addEventListener("click", (e) => { e.stopPropagation(); if (current === el) hide(); else show(el); });
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); current === el ? hide() : show(el); } });
      if (canHover) {
        el.addEventListener("mouseenter", () => show(el));
        el.addEventListener("mouseleave", () => { hideTimer = setTimeout(() => { if (!pop.matches(":hover")) hide(); }, 260); });
      }
    });
    pop.addEventListener("click", (e) => e.stopPropagation());
    pop.addEventListener("mouseenter", () => clearTimeout(hideTimer));
    pop.addEventListener("mouseleave", () => { hideTimer = setTimeout(hide, 220); });
    document.addEventListener("click", hide);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
    window.addEventListener("scroll", () => { if (current) position(current); }, { passive: true });
    window.addEventListener("resize", () => { if (current) position(current); });

    /* ---------- 辭典頁 ---------- */
    const list = document.getElementById("glossaryList");
    if (list) {
      let html = "";
      CATS.forEach(([cat, label]) => {
        const items = TERMS.filter((t) => t.cat === cat);
        html += '<section class="gl-sec" id="cat-' + cat + '"><h2 class="gl-sec__title">' + label + '</h2><div class="glossary-grid">';
        items.forEach((t) => {
          html += '<article class="gl" id="' + t.id + '"><h3>' + t.name + (t.en ? "<span>" + t.en + "</span>" : "") + "</h3><p>" + t.short + '</p><p class="gl__ex"><b>例</b>' + t.ex + "</p></article>";
        });
        html += "</div></section>";
      });
      list.innerHTML = html;
      if (location.hash) {
        const target = document.querySelector(location.hash);
        if (target) setTimeout(() => target.scrollIntoView({ block: "center" }), 50);
      }
    }
  });
})();
