/* Home page extras: header state over the hero, the "past adventures" block and the credits list.
   Hikes are rendered by site.js, the journey by journey.js and the explorer by explorer.js. */
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* Header: see-through over the hero photo, solid once the page starts moving. */
  const head = $(".site-head"), heroImg = $("#heroImg"), hero = $(".hero-x");
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY;
    head.classList.toggle("scrolled", y > 24);
    // Restrained image drift while the hero is on screen. Skipped for reduced motion.
    if (heroImg && hero && !reduced.matches && y < hero.offsetHeight) heroImg.style.transform = `translate3d(0, ${(y * 0.14).toFixed(1)}px, 0)`;
  }
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* Past adventures: only what is really in data/hikes.json and data/posts.json. */
  function story({ hikes = [], posts = [], util }) {
    const past = hikes.filter(h => util.isPast(h) && h.status !== "hidden").sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const postFor = h => h.post && posts.find(p => p.id === h.post);

    const list = $("#pastList");
    if (list) list.innerHTML = past.length ? past.slice(0, 5).map(h => {
      const p = postFor(h), sub = [h.type && h.type !== "Hike" ? h.type : "", h.trail].filter(Boolean).join(" · ");
      return `<li><time datetime="${esc(h.date)}">${esc(util.fmtDate(h.date))}</time>
        <div><b>${esc(h.title)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div>
        ${p ? `<a href="post.html?p=${encodeURIComponent(p.id)}">Read the story<span class="sr-only">: ${esc(p.title)}</span> &rarr;</a>` : ""}</li>`;
    }).join("") : `<li class="past-empty">No past trips posted yet. They show up here after each hike.</li>`;

    // Photos: covers from blog posts and images from past hikes, newest first, no repeats.
    const seen = new Set(), shots = [];
    past.forEach(h => { const p = postFor(h), src = (p && p.cover) || h.image; if (src && !seen.has(src)) { seen.add(src); shots.push({ src, title: h.title, date: h.date, href: p ? `post.html?p=${encodeURIComponent(p.id)}` : "" }); } });
    posts.forEach(p => { if (p.cover && !seen.has(p.cover)) { seen.add(p.cover); shots.push({ src: p.cover, title: p.title, date: p.date, href: `post.html?p=${encodeURIComponent(p.id)}` }); } });
    const box = $("#storyPhotos");
    if (box) {
      box.dataset.count = Math.min(shots.length, 3);
      box.innerHTML = shots.slice(0, 3).map(s => {
        const img = `<img src="${esc(s.src)}" alt="${esc(s.title)}" loading="lazy" decoding="async" width="1200" height="900">`;
        return `<figure class="reveal">${s.href ? `<a href="${s.href}" aria-label="Read the story: ${esc(s.title)}">${img}</a>` : img}<figcaption><b>${esc(s.title)}</b><span>${esc(util.fmtDate(s.date))}</span></figcaption></figure>`;
      }).join("");
      box.querySelectorAll(".reveal").forEach(el => io ? io.observe(el) : el.classList.add("in"));
    }
  }
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" }) : null;
  if (window.MCR) story(window.MCR); else window.addEventListener("mcr:data", e => story(e.detail), { once: true });

  /* Credits for third-party photos and map data (data/credits.json). */
  (window.MCRCredits || fetch("data/credits.json").then(r => r.json())).then(c => {
    const body = $("#creditsBody"); if (!body || !c) return;
    const photos = (c.photos || []).map(p => `<li>${esc(p.usedFor)}: <a href="${esc(p.source)}" target="_blank" rel="noopener">&ldquo;${esc(p.title)}&rdquo;</a> by ${esc(p.author)}, ${p.licenseUrl ? `<a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener license">${esc(p.license)}</a>` : esc(p.license)}</li>`).join("");
    const map = (c.map || []).map(m => `<li>${esc(m.what)}: <a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.credit)}</a></li>`).join("");
    body.innerHTML = `<p>Photos from Wikimedia Commons, resized and cropped. All other images are from MC Rangers.</p><ul>${photos}</ul><p>Maps are drawn from open data and simplified. They are not for navigation.</p><ul>${map}</ul>`;
  }).catch(() => {});
})();
