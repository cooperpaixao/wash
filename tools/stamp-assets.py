"""Stamp the stylesheet, script and link preview image with a fingerprint.

Browsers cache /assets/css/styles.css and /assets/js/main.js for a day, and
apps like Facebook and iMessage keep link preview images for weeks.
Changing the ?v= value whenever a file changes makes them load the new
version right away. Run this after editing any of those files:

    python3 tools/stamp-assets.py
"""
import glob, hashlib, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = ["/assets/css/styles.css", "/assets/js/main.js", "/assets/img/og.jpg"]

stamps = {}
for path in ASSETS:
    with open(os.path.join(ROOT, path.lstrip("/")), "rb") as f:
        stamps[path] = hashlib.md5(f.read()).hexdigest()[:8]

changed = 0
for page in glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True):
    if os.sep + "tools" + os.sep in page:
        continue
    with open(page, encoding="utf-8") as f:
        html = f.read()
    new = html
    for path, stamp in stamps.items():
        new = re.sub(re.escape(path) + r'(\?v=[0-9a-zA-Z]+)?"', f'{path}?v={stamp}"', new)
    if new != html:
        with open(page, "w", encoding="utf-8") as f:
            f.write(new)
        changed += 1

print("stamps:", stamps, "| pages updated:", changed)
