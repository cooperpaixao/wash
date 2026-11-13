# Wash 66 website

Static site for Wash 66, the soft-touch express car wash at 7 Pettingill Road, Quispamsis, NB.

Plain HTML, CSS and a small JavaScript file. No build step, no framework. Upload the folder to any static host (Netlify, Cloudflare Pages, GitHub Pages, cPanel) and it works.

## Pages

| URL | File |
| --- | --- |
| `/` | `index.html` |
| `/disclaimers/` | `disclaimers/index.html` (same URL as the old site) |
| `/services/`, `/about/`, `/contact/` | Redirects from the old site's URLs to the right section of the new home page |
| 404 | `404.html` |

## Before launch: things to fill in

1. **Prices.** The prices are placeholders. In `index.html`, search for `PRICES AND FEATURES ARE PLACEHOLDERS`. Each tier has a line like:

   ```html
   <span class="price-amt" data-tier="good" data-single="12" data-monthly="30">12</span>
   ```

   - `data-single` is the price of one wash.
   - `data-monthly` is the monthly membership price.
   - The number between the tags is what shows before anyone taps the toggle, so keep it the same as `data-single`.

   The "Membership math" calculator reads these same numbers, so it updates by itself.

2. **What's in each wash.** The feature lists under Good, Better and Best are placeholders based on the old site's packages. Edit the `<li>` items in each tier.

3. **Before/after photos.** The images in `assets/img/before-after/` are computer-generated stand-ins. Real photos from the tunnel will look much better. For each pair:
   - Take the before and after shots from the same spot, same angle, same zoom (a phone on a tripod or a mark on the ground helps).
   - Crop both to 4:3 landscape.
   - Save two sizes of each: 1600 x 1200 and 800 x 600, as `.webp` (or `.jpg` and change the file names in `index.html`).
   - Replace the files with the same names: `hero-before.webp`, `hero-before-800.webp`, `hero-after.webp`, `hero-after-800.webp`, and the same for `salt`, `mud` and `film`.

4. **Google rating.** The review section shows "4.2 on Google". Check the current number on the Google Business Profile and update it (search for `rating-score` and `--r: 4.2`).

5. **Reviews.** The quotes are real customer reviews found online, but the reviewer names weren't available. If you want names on them, find the reviews on Google and add first names in the `<footer>` of each `<blockquote>`. To add more, copy a `<blockquote class="review">` block.

6. **Google review link.** The "Leave us a Google review" link opens a Maps search. For a direct link, get the review link from the Google Business Profile (Ask for reviews > copy link) and paste it in place of both `google.com/maps/search` links in the reviews section.

7. **Logo.** The logo was traced from the 128 x 144 px file on the current site. If you have the original artwork (SVG, AI, EPS or a big PNG), swap it in for a perfect match. See "Brand colours and logo" below.

8. **Disclaimers.** `disclaimers/index.html` was rebuilt from the wording on the current site. Read it over against the live page once before switching.

## Brand colours and logo

**Colours.** Taken from the logo and the current wash66.com. They live at the very top of `assets/css/styles.css`, under `:root`:

```css
--brand-dark: #193A62;          /* Wash 66 navy: header, dark sections, text */
--brand-accent: #2D67B6;        /* royal blue: main buttons, badges, links */
--brand-on-accent: #FFFFFF;     /* text that sits on the accent colour */
--brand-accent-light: #8CC0F5;  /* lighter blue for highlights on navy backgrounds */
--brand-secondary: #3C6089;     /* steel blue: winter section and water accents */
--brand-light: #F4F7FB;         /* page background */
```

Change a value there and the whole site follows: buttons, cards, illustrations, checkmarks, the windshield graphic, everything.

A few things don't read the CSS and need a manual touch if the colours change:

- `<meta name="theme-color" content="#193A62">` in `index.html` and `disclaimers/index.html` (tints the phone browser bar).
- The navy fill inside `assets/img/logo-badge.svg` and `assets/img/favicon.svg`.
- The link preview image (`assets/img/og.jpg`, designed in `tools/share-card.html`). Regenerate it with `node tools/render-share-images.mjs`, then run `python3 tools/stamp-assets.py` (instructions at the top of that file). Add `--icon` to also redo the home screen icon.

**Logo files.**

- `assets/img/logo.svg`: white logo with a see-through middle, for navy backgrounds (header, footer).
- `assets/img/logo-badge.svg`: the same logo with the navy fill and a navy outline, so it works on any background. Also used as the browser tab icon (`favicon.svg`).

Both were traced from the small logo PNG on the current site. To replace them with original artwork, keep the same file names (or update the `<img src>` in the header and footer of each page).

**Font.** Montserrat, the same family the current site uses, self-hosted in `assets/fonts/` (SIL Open Font License, see `OFL.txt`).

## Editing other things

- **Link previews point at the Cloudflare preview address for now** (`wash66.cooper-577.workers.dev`), because wash66.com still shows the old site. When wash66.com switches to this site, run `python3 tools/set-share-domain.py https://wash66.com` so previews use the real domain again.
- **After editing `assets/css/styles.css`, `assets/js/main.js` or `assets/js/live.js`, or regenerating the link preview image**, run `python3 tools/stamp-assets.py`. It updates the `?v=` fingerprint on every page so visitors' browsers (and apps showing link previews) load the new file instead of a cached copy.

- **Hours** appear in three places: the Visit section in `index.html` (also `about/` and `contact/`), the JSON-LD block at the top of `index.html` (helps Google show your hours), and `assets/js/live.js` (the "Open now" badge, look for `fallbackStatus`; it is only used when the Hub feed is not available). When the feed is available, the Hub's hours replace the Visit and footer text, see "Live feed from the Hub" below. The JSON-LD hours stay static.
- **Phone and email** are plain text in the HTML. Search and replace `506-847-7627`, `+15068477627` and `info@wash66.com`.

## Live feed from the Hub

The staff app (the Hub) can change hours, notices, prices, which sections show and a snow/rain effect without anyone editing this code. `assets/js/live.js` (loaded with `defer` on every page, after `main.js`) reads the feed in each visitor's browser and applies it. The feed contract (every field and what it means) is in the Hub project: `wash66-hub/docs/WEBSITE-FEED.md`.

- **Feed address:** `https://hub.cooperpaixao.ca/api/public/website`, fixed in `live.js`.
- **Testing:** on `localhost` or `127.0.0.1` only, `?hub=http://localhost:8868` (or any other web address) reads a different feed, for example `http://localhost:8872/?hub=http://localhost:8871`. Anywhere else the parameter is ignored, so nobody can make the real site show someone else's feed.
- **If the Hub can't be reached:** the last feed (saved in the browser as `w66.feed`, up to 7 days old) is used; with nothing saved, the page stays exactly as written in the HTML. So the HTML is always the fallback: keep it correct.
- **Timing:** the feed is fetched on load (5 second limit) and every 5 minutes while the tab is visible. Status and notices are re-checked every minute using Atlantic (Moncton) time.
- **Safety:** feed text goes into the page with `textContent` only, numbers are checked before use, and unknown or broken parts of the feed are ignored.

What the feed controls, and the hooks in the HTML:

| What | Hook in the HTML |
| --- | --- |
| Open/closed pill on the home page | `data-open-status` with `data-open-text` inside. `live.js` is the only thing that writes it. |
| Notices above the header | `<div class="notice-bar" data-notices role="status">` on every page (`live.js` fills it). Each notice has a close button that hides it for the browser session. Upcoming notices show as a calm "Heads up" row. |
| Regular hours and the "Upcoming" list | `<dl class="hours" data-hours>` (home, about, contact). The footer lines use `data-hours-footer`. |
| Prices in text | `<span data-price="good.single">$14.95</span>`. Keys are the feed's `prices` keys. Whole dollars show as `$36`, otherwise `$14.95`. For "from $60 to $150" style ranges use `data-price-min="detail.p1,detail.p2,detail.p3"` and `data-price-max="..."`. |
| The big price numbers and the calculator | `.price-amt[data-tier][data-single][data-monthly]`. `live.js` updates both attributes, then calls `window.W66.refreshPrices()` (in `main.js`). |
| "Pays off at N washes a month" (membership article) | `data-payback="good"` (or `better`, `best`), worked out like the calculator. |
| Sections (home page) | `data-section="washes"`, `membership`, `results`, `winter`, `extras`, `detailing`, `reviews`, `giftCards`, `faq` on the `<section>` (the ids are the same as before; `giftCards` is `#gift-cards`). `paused` greys the section out, makes it inert and shows the note; `off` hides it and the links to it (CSS, see `data-sec-off` in `styles.css`). `on` removes any pause, including the one written into the HTML. |
| Detailing page | `data-section="detailing"` on the packages block, the add-ons block (`data-section-only="off"`) and `#book` (`data-no-note`). `data-detailing-off-note` is the "isn't offered right now" box. `data-detailing-action` is the phone action bar's main button (Book when detailing is on, Prices otherwise). When detailing is `off` the Detailing menu and footer links are hidden. |
| Pausing by hand | `class="is-paused"` on the section, a `.season-note` box, and `inert data-live-inert` on the blocks that should grey out. `data-pause-keep` keeps a block clickable while paused. |
| Snow or rain over the home hero | Drawn on a `<canvas class="hero-fx">` that `live.js` adds between `.hero-overlay` and the content. Only on screens 900 px wide or more, and not for visitors who asked for reduced motion. It pauses when the hero is off screen or the tab is hidden. |

Left static on purpose: JSON-LD (including prices and hours), `<meta>` tags, `llms.txt`, the FAQ answers, and the policy wording on `/disclaimers/`. If a price changes in the Hub, check those by hand.

To try things locally, run a small server that returns a feed with CORS `*` on `/api/public/website`, serve the site with `npx http-server -p 8872 -c-1 .`, and open pages with `?hub=` pointing at it.

## Previewing locally

Any static server works. For example:

```sh
npx http-server -p 8080 .
```

Then open http://localhost:8080.

## House style

The copy avoids em dashes and en dashes on purpose. Use commas, periods, or "to" for ranges (8 am to 7 pm).
