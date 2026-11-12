/* Lightweight SVG map of Hong Kong, shared by the scroll journey and the trail explorer.
   Geometry lives in data/hk-basemap.json (already projected to the SVG viewBox), so nothing
   here needs a map service or an API key. Anything with a lat/lon goes through map.project(). */
window.HKMap = (() => {
  const NS = "http://www.w3.org/2000/svg";

  function el(name, attrs = {}, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // Web Mercator, matching the projection the base map was generated with.
  const mercY = lat => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2; };
  function projector(p) {
    const x0 = (p.west + 180) / 360, x1 = (p.east + 180) / 360, y0 = mercY(p.north);
    const k = p.width / (x1 - x0);
    return (lon, lat) => [((lon + 180) / 360 - x0) * k, (mercY(lat) - y0) * k];
  }

  let base;
  const loadBase = () => base || (base = fetch("data/hk-basemap.json").then(r => { if (!r.ok) throw new Error("base map " + r.status); return r.json(); }));

  /* Build the base map inside `host`. Returns helpers for adding layers on top. */
  async function create(host, { title, desc, id }) {
    const data = await loadBase();
    const { width: W, height: H } = data.projection;
    const project = projector(data.projection);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "hkmap", role: "img", "aria-labelledby": `${id}-t ${id}-d`, preserveAspectRatio: "xMidYMid meet" });
    el("title", { id: `${id}-t` }, svg).textContent = title;
    el("desc", { id: `${id}-d` }, svg).textContent = desc;

    const g = el("g", { class: "hkmap-base", "aria-hidden": "true" }, svg);
    el("path", { class: "hkmap-neighbour", d: data.neighbour, "fill-rule": "evenodd" }, g);
    el("path", { class: "hkmap-land", d: data.land, "fill-rule": "evenodd" }, g);
    const cont = el("g", { class: "hkmap-contours" }, g);
    data.contours.forEach(c => el("path", { d: c.d, "data-elevation": c.elevation_m }, cont));
    el("path", { class: "hkmap-water", d: data.reservoirs, "fill-rule": "evenodd" }, g);
    el("path", { class: "hkmap-coast", d: data.land, "fill-rule": "evenodd" }, g);

    // Things placed with pin() keep the same on-screen size however wide the map is drawn.
    const pins = [];
    let u = 1; // viewBox units per CSS pixel
    const place = p => p.node.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${u.toFixed(3)})`);
    function rescale() {
      const w = svg.getBoundingClientRect().width;
      u = w ? W / w : 1;
      svg.style.setProperty("--u", u.toFixed(3)); // lets CSS size strokes in screen pixels: calc(var(--u) * 2px)
      pins.forEach(place);
    }
    function pin(parent, lon, lat, attrs = {}) {
      const [x, y] = project(lon, lat);
      const p = { node: el("g", attrs, parent), x, y };
      pins.push(p); place(p);
      return p.node;
    }
    function movePin(node, x, y) { const p = pins.find(q => q.node === node); if (p) { p.x = x; p.y = y; place(p); } }

    const labels = el("g", { class: "hkmap-labels", "aria-hidden": "true" }, svg);
    (data.labels || []).forEach(l => { el("text", { "text-anchor": "middle" }, pin(labels, l.lon, l.lat)).textContent = l.name; });

    host.appendChild(svg);
    rescale();
    if ("ResizeObserver" in window) new ResizeObserver(rescale).observe(svg); else window.addEventListener("resize", rescale);

    return { svg, project, pin, movePin, rescale, width: W, height: H, layer: (cls, before) => { const n = el("g", { class: cls }); svg.insertBefore(n, before || labels); return n; } };
  }

  /* Smooth curve through points [[x,y],...] (Catmull-Rom, written as cubic Béziers).
     Returns one path command per point so callers can also build partial paths. */
  function smoothSegments(pts, tension = 0.5) {
    const seg = [`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) * tension / 3 * 2, p1[1] + (p2[1] - p0[1]) * tension / 3 * 2];
      const c2 = [p2[0] - (p3[0] - p1[0]) * tension / 3 * 2, p2[1] - (p3[1] - p1[1]) * tension / 3 * 2];
      seg.push(`C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`);
    }
    return seg;
  }

  /* GeoJSON LineString / MultiLineString ([lon, lat] pairs) to an SVG path. */
  function geoPath(geometry, project) {
    const lines = geometry.type === "LineString" ? [geometry.coordinates] : geometry.coordinates;
    return lines.map(line => "M" + line.map(([lon, lat]) => { const [x, y] = project(lon, lat); return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(" ")).join("");
  }

  return { create, el, smoothSegments, geoPath };
})();
