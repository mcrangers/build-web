# MC Rangers

The website for MC Rangers, a CUHK student hiking club: upcoming hikes with sign-up links, a blog with photos and comments after every hike, and a merch page.

Live site: https://mcrangers.github.io

## How it works

- Plain HTML, CSS and JavaScript hosted on GitHub Pages. No build step.
- All content lives in `data/`: `site.json` (settings and links), `hikes.json`, `posts.json` and `merch.json`.
- `admin.html` edits those files and uploads photos to `images/uploads/` through the GitHub API, using a fine-grained key with Contents: Read and write on this repository.
- Sign-ups and merch orders go to Google Forms.
- Blog comments use Firebase Authentication and Cloud Firestore on the free plan. Only verified CUHK emails (`@link.cuhk.edu.hk` or `@cuhk.edu.hk`) can post. `firestore.rules` enforces this on the server. See [SETUP.md](SETUP.md).

## Related

- [Trail Bingo](https://github.com/mcrangers/hike-bingo), our hike icebreaker game.

## License

MIT

## Home page

The home page (`index.html`, `css/home.css`) is built from small data files, so content can change without touching the layout:

| File | What it holds |
| --- | --- |
| `data/hikes.json` | Upcoming and past hikes, including each sign-up form link. Edit in Admin. |
| `data/site.json` | About text and links: `joinForm`, `instagram`, `email`, `trailBingo`, `photoGuide`. Edit in Admin → Settings. |
| `data/journey.json` | The scroll journey: checkpoints (name, coordinates, photo, caption) in the order the line visits them. |
| `data/trails.geojson` | Routes shown in the Trail explorer. Add a GeoJSON feature to add a route. |
| `data/hk-basemap.json` | The Hong Kong outline, reservoirs and contour lines used by both maps. |
| `data/credits.json` | Photo and map credits listed in the footer. |

Scripts: `js/hkmap.js` draws the base map, `js/journey.js` runs the scroll journey, `js/explorer.js` runs the Trail explorer and `js/home.js` handles the rest of the home page.

The journey line is illustrative: it joins the checkpoints with a smooth curve and is labelled "Illustrative journey" on the page. Each checkpoint can take optional `via` bend points (`[lat, lon]` pairs) to steer the line; verified route geometry belongs in `data/trails.geojson`. Journey captions are sample copy until the committee replaces them.

A link that has not been set (an empty value, or a bare `https://forms.gle/`) shows as "not set yet" on the page instead of a dead button.

## Map

The Map page shows a pin for every hike or trip in `data/hikes.json` that has a `location`. In Admin → Hikes, set the Type (Hike, Rafting, Kayaking and so on) and paste coordinates or a Google Maps link into Map location. Link the blog post and the pin opens the story. Turn the map off in Admin → Settings → Map. Map data © OpenStreetMap contributors.

## Credits

Home page photos are from Wikimedia Commons under the licences listed in `data/credits.json`. Base map outline from OpenFreeMap and OpenMapTiles, contours from Mapzen terrain tiles, trail lines from Waymarked Trails; all built on © OpenStreetMap contributors data (ODbL).
