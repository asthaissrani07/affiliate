import json
import urllib.request
from html import unescape
import re

url = "https://affiliate.watch/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
except Exception as e:
    print(f"Error fetching page: {e}")
    exit(1)

# Find the app div
pattern = r'<div\s+id="app"\s+data-page="([^"]+)"'
match = re.search(pattern, html)
if not match:
    print("Could not find data-page attribute in HTML")
    # Let's try searching for it more broadly
    pattern_alt = r'data-page="([^"]+)"'
    match = re.search(pattern_alt, html)

if match:
    escaped_json = match.group(1)
    # Unescape HTML entities
    raw_json = unescape(escaped_json)
    try:
        data = json.loads(raw_json)
        print("Success! JSON parsed.")
        
        # Let's inspect the keys in props
        props = data.get("props", {})
        print("Props keys:", list(props.keys()))
        
        # Find where the affiliates list is
        # Usually it could be in props['affiliates'] or props['programs'] or similar
        for key in list(props.keys()):
            val = props[key]
            if isinstance(val, dict):
                print(f"Sub-keys of props['{key}']:", list(val.keys()))
            elif isinstance(val, list):
                print(f"props['{key}'] is a list of length:", len(val))
                if len(val) > 0:
                    print("Sample item keys:", list(val[0].keys()) if isinstance(val[0], dict) else type(val[0]))
        
        # Let's save the props object to look at it
        with open("props_dump.json", "w", encoding="utf-8") as f:
            json.dump(props, f, indent=2)
            
    except Exception as e:
        print(f"Error parsing JSON: {e}")
else:
    print("No match found for data-page")
