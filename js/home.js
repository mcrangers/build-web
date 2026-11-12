(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nav = $('#nav'), blog = nav?.querySelector('a[href="blog.html"]');
  if (blog) nav.prepend(blog);
  const actions = $('.hero-x-actions');
  if (actions) actions.innerHTML = '<a class="btn cta" href="blog.html">Read our stories &rarr;</a><a class="btn ghost" href="#hikes">Explore upcoming hikes</a>';
  const journey = $('#journey');
  if (journey && !$('#latestStories')) journey.insertAdjacentHTML('beforebegin', '<section class="section" id="latestStories" aria-labelledby="latestStoriesH"><div class="wrap"><header class="sec-head"><div><p class="kicker">From the blog</p><h2 id="latestStoriesH">Our latest stories.</h2></div><a class="more" href="blog.html">All stories &rarr;</a></header><div class="posts" id="latestPosts" aria-live="polite"><p>Loading stories&hellip;</p></div><noscript><p><a href="blog.html">Read the blog</a></p></noscript></div></section>');
  const count = document.querySelector('[data-journey-count]');
  if (count && count.textContent === 'seven') count.textContent = '4';
  const head = $('.site-head'), hero = $('.hero-x'), heroImg = $('#heroImg');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let ticking = false;
  function paintHeader() {
    ticking = false;
    const y = window.scrollY;
    head?.classList.toggle('scrolled', y > 24);
    if (heroImg && hero && !reduced.matches && y < hero.offsetHeight) heroImg.style.transform = `translate3d(0, ${(y * .14).toFixed(1)}px, 0)`;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paintHeader); } }, {passive:true});
  paintHeader();
  function render({hikes = [], posts = [], util}) {
    const latest = posts.slice().sort((a,b) => String(b.date).localeCompare(String(a.date))).slice(0,3);
    const target = $('#latestPosts');
    if (target) target.innerHTML = latest.length ? latest.map(p => `<a class="post-card" href="post.html?p=${encodeURIComponent(p.id)}">${p.cover ? `<div class="pc-img"><img src="${esc(p.cover)}" alt="" loading="lazy" width="1200" height="900"></div>` : ''}<div class="pc-body"><p class="meta">${esc(util.fmtDate(p.date))}</p><h3>${esc(p.title)}</h3>${p.summary ? `<p>${esc(p.summary)}</p>` : ''}<span>Read story &rarr;</span></div></a>`).join('') : '<div class="empty" style="grid-column:1/-1"><b>Stories coming soon</b><a href="blog.html">Visit the blog</a></div>';
    const past = hikes.filter(h => util.isPast(h) && h.status !== 'hidden').sort((a,b) => String(b.date).localeCompare(String(a.date)));
    const postFor = h => h.post && posts.find(p => p.id === h.post);
    const list = $('#pastList');
    if (list) list.innerHTML = past.length ? past.slice(0,5).map(h => { const p = postFor(h); return `<li><time datetime="${esc(h.date)}">${esc(util.fmtDate(h.date))}</time><div><b>${esc(h.title)}</b>${h.trail ? `<span>${esc(h.trail)}</span>` : ''}</div>${p ? `<a href="post.html?p=${encodeURIComponent(p.id)}">Read the story &rarr;</a>` : ''}</li>`; }).join('') : '<li class="past-empty">No past trips posted yet.</li>';
    const seen = new Set(), shots = [];
    function shot(src,title,date,href) { if (src && !seen.has(src)) { seen.add(src); shots.push({src,title,date,href}); } }
    past.forEach(h => { const p = postFor(h); shot(p?.cover || h.image,h.title,h.date,p ? `post.html?p=${encodeURIComponent(p.id)}` : ''); });
    posts.forEach(p => shot(p.cover,p.title,p.date,`post.html?p=${encodeURIComponent(p.id)}`));
    const box = $('#storyPhotos');
    if (box) { box.dataset.count = Math.min(shots.length,3); box.innerHTML = shots.slice(0,3).map(s => { const img = `<img src="${esc(s.src)}" alt="${esc(s.title)}" loading="lazy" decoding="async" width="1200" height="900">`; return `<figure>${s.href ? `<a href="${s.href}">${img}</a>` : img}<figcaption><b>${esc(s.title)}</b><span>${esc(util.fmtDate(s.date))}</span></figcaption></figure>`; }).join(''); }
  }
  if (window.MCR) render(window.MCR); else window.addEventListener('mcr:data', e => render(e.detail), {once:true});
  (window.MCRCredits || fetch('data/credits.json').then(r => { if (!r.ok) throw new Error('Credits unavailable'); return r.json(); })).then(c => {
    const body = $('#creditsBody'); if (!body || !c) return;
    const photos = (c.photos || []).map(p => `<li>${esc(p.usedFor)}: <a href="${esc(p.source)}" target="_blank" rel="noopener">${esc(p.title)}</a> by ${esc(p.author)}, ${p.licenseUrl ? `<a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener">${esc(p.license)}</a>` : esc(p.license)}</li>`).join('');
    const maps = (c.map || []).map(m => `<li>${esc(m.what)}: <a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.credit)}</a></li>`).join('');
    body.innerHTML = `<p>Photos from Wikimedia Commons, resized and cropped. All other images are from MC Rangers.</p><ul>${photos}</ul><p>Maps are drawn from open data and simplified. They are not for navigation.</p><ul>${maps}</ul>`;
  }).catch(() => {});
})();
