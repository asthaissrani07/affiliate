import urllib.request
import re

urls = [
    "https://affiliate.watch/build/assets/vendor-core-ef33c58d.css",
    "https://affiliate.watch/build/assets/vendor-4e86aad1.css",
    "https://affiliate.watch/build/assets/app-0d7a2f83.css"
]

for url in urls:
    name = url.split("/")[-1]
    print(f"Downloading {name}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla"})
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8')
            with open(name, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Saved {name} ({len(content)} characters)")
    except Exception as e:
        print(f"Error: {e}")
