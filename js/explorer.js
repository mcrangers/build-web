/* Trail explorer: a small, clearly labelled sample of routes drawn on the same SVG map.
   Routes come from data/trails.geojson. To add one, append a GeoJSON Feature there:
   the list, the map line and the detail panel are all generated from it. */
(() => {
  const host = document.getElementById("explorerMap");
  const listEl = document.getElementById("explorerList");
  const detail = document.getElementById("explorerDetail");
  if (!host || !listEl || !detail) return;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COLOURS = 4; // .t-0 … .t-3 in css/home.css, taken from the logo stripes

  function detailHTML(p) {
    const facts = [
      ["Length", p.length_km ? `${p.length_km} km` : ""],
      [p.unit ? p.unit[0].toUpperCase() + p.unit.slice(1) : "Sections", p.sections],
      ["Where", p.region]
    ].filter(f => f[1]);
    return `<p class="ex-zh" lang="zh-Hant">${esc(p.name_zh || "")}</p>
      <h3>${esc(p.name)}</h3>
      <p class="ex-sum">${esc(p.summary || "")}</p>
      <dl class="ex-facts">${facts.map(f => `<div><dt>${esc(f[0])}</dt><dd>${esc(f[1])}</dd></div>`).join("")}</dl>
      ${p.sourceUrl ? `<p class="ex-src">Length and route description: <a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">${esc(p.source || "source")}</a>. Line: OpenStreetMap, simplified.</p>` : ""}`;
  }

  (async () => {
    let fc;
    try { fc = await fetch("data/trails.geojson").then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }); }
    catch (e) { detail.innerHTML = `<p class="ex-sum">The sample routes could not be loaded.</p>`; return; }
    const feats = (fc.features || []).filter(f => f.geometry && f.properties && f.properties.id);
    document.querySelectorAll("[data-trail-count]").forEach(n => n.textContent = feats.length);

    listEl.innerHTML = feats.map((f, i) => `<li><button type="button" class="ex-item t-${i % COLOURS}" data-id="${esc(f.properties.id)}" aria-pressed="false">
        <span class="ex-swatch" aria-hidden="true"></span>
        <span class="ex-name">${esc(f.properties.name)}</span>
        <span class="ex-len">${f.properties.length_km ? esc(f.properties.length_km) + " km" : ""}</span>
      </button></li>`).join("");
    const buttons = [...listEl.querySelectorAll("button")];

    let lines = [];
    function select(id, focusDetail) {
      const i = Math.max(0, feats.findIndex(f => f.properties.id === id));
      buttons.forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
      lines.forEach((l, k) => { l.g.classList.toggle("is-on", k === i); if (k === i) l.g.parentNode.appendChild(l.g); });
      detail.className = `ex-detail t-${i % COLOURS}`;
      detail.innerHTML = detailHTML(feats[i].properties);
      host.dataset.selected = feats[i].properties.id;
      if (focusDetail) detail.focus({ preventScroll: true });
    }
    buttons.forEach(b => b.addEventListener("click", () => select(b.dataset.id)));
    select(feats[0].properties.id);

    try {
      const map = await HKMap.create(host, {
        id: "explorerMapSvg",
        title: "Map of Hong Kong showing a sample of long-distance trails",
        desc: feats.map(f => f.properties.name).join(", ") + ". Lines are simplified from OpenStreetMap and are not for navigation."
      });
      const layer = map.layer("ex-trails");
      lines = feats.map((f, i) => {
        const d = HKMap.geoPath(f.geometry, map.project);
        const g = HKMap.el("g", { class: `ex-trail t-${i % COLOURS}`, "data-id": f.properties.id }, layer);
        HKMap.el("path", { class: "ex-hit", d }, g);   // wide invisible stroke so the line is easy to click or tap
        HKMap.el("path", { class: "ex-line", d }, g);
        g.addEventListener("click", () => select(f.properties.id));
        return { g };
      });
      select(host.dataset.selected);
    } catch (e) { console.warn("Explorer map unavailable:", e); host.classList.add("is-missing"); }
  })();
})();
