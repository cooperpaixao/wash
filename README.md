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

7. **Logo and brand colours.** The current colours and text logo are stand-ins. See "Brand colours and logo" below.

8. **Disclaimers.** `disclaimers/index.html` was rebuilt from the wording on the current site. Read it over against the live page once before switching.

## Brand colours and logo

**Colours.** Open `assets/css/styles.css`. At the very top, under `:root`, are five lines:

```css
--brand-dark: #0C1720;       /* dark sections, text, outlines */
--brand-accent: #FFC72C;     /* main buttons, badges, highlights, prices */
--brand-on-accent: #0C1720;  /* text that sits on the accent colour */
--brand-secondary: #3A7EA3;  /* winter section and water accents */
--brand-light: #F3F1EC;      /* page background */
```

Put the brand's hex codes there and the whole site follows: buttons, cards, illustrations, checkmarks, the windshield graphic, everything. If the accent colour is dark (a deep red or blue), set `--brand-on-accent` to `#FFFFFF` so text on it stays readable.

Three small things don't read the CSS and need a manual touch:

- `<meta name="theme-color" content="#0C1720">` in `index.html` and `disclaimers/index.html` (tints the phone browser bar). Use the `--brand-dark` value.
- `assets/img/favicon.svg` (browser tab icon). Two colours in the file: the background and the badge.
- The link preview image and home screen icon. Regenerate them with `node tools/render-share-images.mjs` (instructions at the top of that file).

**Logo.** The header and footer use a text logo (WASH plus a 66 badge). To use the real logo file, save it as `assets/img/logo.svg` (or `.png`) and replace the inside of each `<a class="brand">` with:

```html
<img src="assets/img/logo.svg" alt="Wash 66" height="36">
```

On the disclaimers page the path is `../assets/img/logo.svg`. For the footer (dark background), use a light or white version of the logo if there is one.

## Editing other things

- **Hours** appear in three places: the Visit section in `index.html`, the JSON-LD block at the top of `index.html` (helps Google show your hours), and `assets/js/main.js` (the "Open now" badge, look for `8 * 60` and `19 * 60`).
- **Phone and email** are plain text in the HTML. Search and replace `506-847-7627`, `+15068477627` and `info@wash66.com`.
- **Colours** are at the top of `assets/css/styles.css` under `:root`.
- **Font** is Archivo, self-hosted in `assets/fonts/` (SIL Open Font License, see `OFL.txt`).

## Previewing locally

Any static server works. For example:

```sh
npx http-server -p 8080 .
```

Then open http://localhost:8080.

## House style

The copy avoids em dashes and en dashes on purpose. Use commas, periods, or "to" for ranges (8 am to 7 pm).
