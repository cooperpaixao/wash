"""Point the link preview tags (og:url, og:image, twitter:image) at a domain.

While wash66.com still shows the old site, previews point at the Cloudflare
preview address so a shared link shows the new image and text:

    python3 tools/set-share-domain.py https://wash66.cooper-577.workers.dev

When wash66.com switches over to this site, point them back:

    python3 tools/set-share-domain.py https://wash66.com

Canonical links, structured data, the sitemap and robots.txt always stay on
wash66.com, so search engines keep treating wash66.com as the real address.
"""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
origin = (sys.argv[1] if len(sys.argv) > 1 else "https://wash66.com").rstrip("/")
if not re.fullmatch(r"https://[a-z0-9.-]+", origin):
    sys.exit("Give a full origin, like https://wash66.com")

TAGS = re.compile(r'(<meta (?:property="og:url"|property="og:image"|name="twitter:image") content=")https://[^/"]+')

changed = 0
for page in glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True):
    if os.sep + "tools" + os.sep in page:
        continue
    with open(page, encoding="utf-8") as f:
        html = f.read()
    new = TAGS.sub(lambda m: m.group(1) + origin, html)
    if new != html:
        with open(page, "w", encoding="utf-8") as f:
            f.write(new)
        changed += 1

print("link previews now use", origin, "| pages updated:", changed)
