/* Scroll journey: story panels on one side, a map that draws a trail line on the other.
   Content comes from data/journey.json. The line is a smooth curve through real places,
   so it is labelled as illustrative. Scrolling is native: we only read the scroll position.

   Without this script (or if the map fails to load) the panels still read as a normal list. */
(() => {
  const section = document.getElementById("journey");
  const list = document.getElementById("journeySteps");
  const mapHost = document.getElementById("journeyMap");
  if (!section || !list || !mapHost) return;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const json = f => fetch(f).then(r => { if (!r.ok) throw new Error(f + " " + r.status); return r.json(); });
  const credits = json("data/credits.json").catch(() => ({ photos: [], map: [] }));
  window.MCRCredits = credits;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pad = n => String(n).padStart(2, "0");

  function stepHTML(c, i, n, credit) {
    const p = c.photo || {};
    const by = credit ? `<span class="credit">Photo: <a href="${esc(credit.source)}" target="_blank" rel="noopener">${esc(credit.author)}</a>, ${credit.licenseUrl ? `<a href="${esc(credit.licenseUrl)}" target="_blank" rel="noopener license">${esc(credit.license)}</a>` : esc(credit.license)}</span>` : "";
    return `<li class="step" id="cp-${esc(c.id)}" data-i="${i}">
      <div class="step-head">
        <span class="step-num" aria-hidden="true">${pad(i + 1)}</span>
        <div>
          <p class="step-region">${esc(c.region)}<span class="sr-only">, stop ${i + 1} of ${n}</span></p>
          <h3>${esc(c.name)}</h3>
        </div>
      </div>
      ${p.src ? `<figure class="step-photo"><img src="${esc(p.src)}" alt="${esc(p.alt || "")}" width="${p.width || 1200}" height="${p.height || 900}" loading="lazy" decoding="async">${by ? `<figcaption>${by}</figcaption>` : ""}</figure>` : ""}
      <div class="step-body">
        <p class="step-title">${esc(c.title)}</p>
        <p class="step-cap">${esc(c.caption)}</p>
        ${c.fact ? `<p class="step-fact">${esc(c.fact)}${c.factUrl ? ` <a href="${esc(c.factUrl)}" target="_blank" rel="noopener">(${esc(c.factSource || "source")})</a>` : ""}</p>` : ""}
        <p class="step-club" data-club="${esc(c.id)}" hidden></p>
      </div>
    </li>`;
  }

  /* Link a stop to real entries in data/hikes.json, if there are any. Nothing is shown otherwise. */
  function clubLinks(cps) {
    const fill = () => {
      const { hikes = [], posts = [], util } = window.MCR || {};
      if (!util) return;
      cps.forEach(c => {
        const slot = list.querySelector(`[data-club="${CSS.escape(c.id)}"]`);
        const hs = (c.hikeIds || []).map(id => hikes.find(h => h.id === id)).filter(h => h && h.status !== "hidden");
        if (!slot || !hs.length) return;
        const up = hs.find(h => !util.isPast(h)), past = hs.find(h => util.isPast(h));
        const post = past && past.post && posts.find(p => p.id === past.post);
        let html = "";
        if (up) html = `<span>On the calendar</span><a href="#hikes">${esc(up.title)}, ${esc(util.fmtDate(up.date))} &rarr;</a>`;
        else if (post) html = `<span>We&rsquo;ve been</span><a href="post.html?p=${encodeURIComponent(post.id)}">Read &ldquo;${esc(post.title)}&rdquo; &rarr;</a>`;
        else if (past) html = `<span>We&rsquo;ve been</span>${esc(past.title)}, ${esc(util.fmtDate(past.date))}`;
        if (html) { slot.innerHTML = html; slot.hidden = false; }
      });
    };
    if (window.MCR) fill(); else window.addEventListener("mcr:data", fill, { once: true });
  }

  async function buildMap(data, steps) {
    const cps = data.checkpoints;
    const map = await HKMap.create(mapHost, {
      id: "journeyMapSvg",
      title: "Map of Hong Kong with an illustrative journey",
      desc: `A line links ${cps.length} places across Hong Kong: ${cps.map(c => c.name).join(", ")}. It is a storytelling route, not a walking route.`
    });
    const { el } = HKMap;

    // Route: checkpoints plus optional bend points, as one smooth curve.
    const pts = [], cpAt = [];
    cps.forEach(c => {
      (c.via || []).forEach(([lat, lon]) => pts.push(map.project(lon, lat)));
      cpAt.push(pts.length);
      pts.push(map.project(c.lon, c.lat));
    });
    const segs = HKMap.smoothSegments(pts);
    const d = segs.join("");
    const routeLayer = map.layer("jr-route");
    el("path", { class: "jr-ghost", d }, routeLayer);
    const line = el("path", { class: "jr-line", d }, routeLayer);
    const total = line.getTotalLength();
    // Length along the line at each checkpoint, measured on the path up to that point.
    const probe = el("path", { d: "M0,0", visibility: "hidden" }, routeLayer);
    const lens = cpAt.map(k => { if (!k) return 0; probe.setAttribute("d", segs.slice(0, k + 1).join("")); return probe.getTotalLength(); });
    probe.remove();

    const cpLayer = map.layer("jr-cps");
    const tagLayer = map.layer("jr-tags"); // labels sit above every dot, so tab order can stay in story order
    tagLayer.setAttribute("aria-hidden", "true");
    const tags = [];
    const nodes = cps.map((c, i) => {
      const side = c.labelSide === "right" ? "right" : "left";
      const a = el("a", { class: "jr-cp", href: `#cp-${c.id}`, "aria-label": `Stop ${i + 1}, ${c.name}: jump to this part of the story` }, cpLayer);
      const g = map.pin(a, c.lon, c.lat);
      el("circle", { class: "jr-halo", r: 15 }, g);
      el("circle", { class: "jr-dot", r: 6 }, g);

      const tag = map.pin(tagLayer, c.lon, c.lat, { class: "jr-tag", "data-side": side });
      const s = side === "right" ? 1 : -1;
      if (c.photo && c.photo.src) {
        const clip = `jr-clip-${i}`;
        el("circle", { r: 34, cx: s * 52, cy: -48 }, el("clipPath", { id: clip }, tag));
        el("image", { href: c.photo.src, x: s * 52 - 46, y: -48 - 34, width: 92, height: 68, preserveAspectRatio: "xMidYMid slice", "clip-path": `url(#${clip})`, class: "jr-thumb" }, tag);
        el("circle", { class: "jr-thumb-ring", r: 34, cx: s * 52, cy: -48 }, tag);
      }
      el("text", { class: "jr-name" }, tag).textContent = c.name; // positioned in CSS
      tags.push(tag);
      const peek = on => () => tag.classList.toggle("is-peek", on);
      a.addEventListener("mouseenter", peek(true)); a.addEventListener("mouseleave", peek(false));
      a.addEventListener("focus", peek(true)); a.addEventListener("blur", peek(false));
      return a;
    });

    const marker = map.pin(map.layer("jr-marker"), cps[0].lon, cps[0].lat, { "aria-hidden": "true" });
    el("circle", { class: "jr-marker-bg", r: 12 }, marker);
    // Small walking figure
    el("circle", { class: "jr-marker-fg", cx: 1, cy: -6, r: 2.1 }, marker);
    el("path", { class: "jr-marker-ln", d: "M1 -3 L0 2 L-3 7 M0 2 L3 6.5 M0.6 -1.4 L-3.4 1 M0.8 -1.2 L4.4 1.2 L5 7" }, marker);

    section.classList.add("is-live");
    let cur = -1, target = 0, active = -1, raf = 0;

    function setActive(i) {
      if (i === active) return;
      active = i;
      steps.forEach((s, k) => { s.classList.toggle("is-active", k === i); s.classList.toggle("is-done", k < i); });
      nodes.forEach((n, k) => { n.classList.toggle("is-active", k === i); n.classList.toggle("is-done", k < i || (reduced.matches && k !== i)); });
      tags.forEach((t, k) => t.classList.toggle("is-active", k === i));
      mapHost.dataset.active = cps[i].id;
    }

    function paint(len) {
      line.style.strokeDasharray = `${total} ${total}`;
      line.style.strokeDashoffset = String(Math.max(0, total - len));
      const p = line.getPointAtLength(len);
      map.movePin(marker, p.x, p.y);
    }

    // Where the reader is in the story, as a fractional checkpoint index (2.5 = halfway between stops 3 and 4).
    function progress() {
      const vh = window.innerHeight;
      const stacked = getComputedStyle(section).getPropertyValue("--journey-stacked").trim() === "1";
      const mapBottom = stacked ? mapHost.getBoundingClientRect().bottom : 0;
      const focus = stacked ? mapBottom + (vh - mapBottom) * 0.45 : vh * 0.5;
      const ys = steps.map(s => { const r = s.getBoundingClientRect(); return r.top + Math.min(r.height * 0.4, vh * 0.3); });
      if (focus <= ys[0]) return 0;
      for (let i = 0; i < ys.length - 1; i++) if (focus < ys[i + 1]) return i + (focus - ys[i]) / (ys[i + 1] - ys[i]);
      return ys.length - 1;
    }

    function frame() {
      raf = 0;
      const t = progress();
      const i = Math.floor(t), f = t - i;
      setActive(Math.min(cps.length - 1, Math.round(t)));
      if (reduced.matches) { line.style.strokeDasharray = "none"; marker.style.display = "none"; cur = total; return; }
      marker.style.display = "";
      target = lens[i] + ((lens[i + 1] ?? lens[i]) - lens[i]) * f;
      cur = cur < 0 ? target : cur + (target - cur) * 0.22;
      if (Math.abs(target - cur) < 0.4) cur = target; else raf = requestAnimationFrame(frame);
      paint(cur);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    reduced.addEventListener?.("change", () => { active = -1; cur = -1; kick(); });
    list.addEventListener("load", kick, true); // lazy images change panel heights
    kick();
  }

  (async () => {
    let data;
    try { data = await json("data/journey.json"); }
    catch (e) { list.innerHTML = `<li class="step-error">The journey could not be loaded. <a href="#hikes">Skip to upcoming hikes</a>.</li>`; return; }
    const cr = await credits;
    const byFile = Object.fromEntries((cr.photos || []).map(p => [p.file, p]));
    const cps = data.checkpoints || [];
    list.innerHTML = cps.map((c, i) => stepHTML(c, i, cps.length, c.photo && byFile[c.photo.src])).join("");
    document.querySelectorAll("[data-journey-label]").forEach(n => n.textContent = data.label || "Illustrative journey");
    document.querySelectorAll("[data-journey-count]").forEach(n => n.textContent = cps.length);
    clubLinks(cps);
    const steps = [...list.querySelectorAll(".step")];
    try { await buildMap(data, steps); }
    catch (e) { console.warn("Journey map unavailable:", e); mapHost.closest(".journey-map")?.classList.add("is-missing"); }
  })();
})();
