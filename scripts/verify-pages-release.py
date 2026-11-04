#!/usr/bin/env python3
"""Verify the public files a fresh DOMUS service worker needs to install."""
import hashlib
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import urlopen

root = Path(__file__).resolve().parents[1] / "domus-3"
base = sys.argv[1].rstrip("/") + "/"
build = json.loads((root / "version.json").read_bytes())["build"]
manifest = (root / "asset-manifest.js").read_text(encoding="utf-8")
hashes = json.loads(re.search(r"self\.DOMUS3_ASSET_HASHES=(\{[^;]+\});", manifest)[1])
files = {f"{quote(path)}?build={build}": digest for path, digest in hashes.items()}
for path, query in [("version.json", ""), ("sw.js", f"?v={build}"),
                    ("asset-manifest.js", f"?build={build}")]:
    files[path + query] = hashlib.sha256((root / path).read_bytes()).hexdigest()

# Check both navigation entry points alongside the versioned install requests.
for path in ("", "index.html?source=pwa"):
    files[path] = hashes["index.html"]


def verify(item):
    path, expected = item
    try:
        with urlopen(base + path, timeout=15) as response:
            actual = hashlib.sha256(response.read()).hexdigest()
        if actual != expected:
            return f"{path or './'}: SHA-256 distinto"
    except (URLError, TimeoutError) as error:
        return f"{path or './'}: {error}"
    return None


with ThreadPoolExecutor(max_workers=12) as pool:
    for attempt in range(5):
        failures = [error for error in pool.map(verify, files.items()) if error]
        if not failures:
            print(f"DOMUS {build}: {len(files)} URLs públicas verificadas")
            break
        print(f"Intento {attempt + 1}: " + "; ".join(failures), flush=True)
        if attempt == 4:
            sys.exit(1)
        time.sleep(15)
