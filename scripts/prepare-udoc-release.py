#!/usr/bin/env python3
"""Prepare a new DOMUS PWA release atomically; never alter financial data."""
import hashlib
import json
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parents[1] / "domus-3"
version_path = root / "version.json"
html_path = root / "index.html"
sw_path = root / "sw.js"
manifest_path = root / "asset-manifest.js"
version = json.loads(version_path.read_text(encoding="utf-8"))
old_build = version["build"]
new_build = int(sys.argv[1]) if len(sys.argv) > 1 else old_build + 1
if new_build <= old_build:
    raise SystemExit("The new build must be greater than the existing build")
old_version = version["version"]
prefix, sep, last = old_version.rpartition(".")
if not sep or not last.isdigit():
    raise SystemExit("Unexpected release version format")
new_version = prefix + "." + str(int(last) + 1)
html = html_path.read_text(encoding="utf-8")
sw = sw_path.read_text(encoding="utf-8")
manifest = manifest_path.read_text(encoding="utf-8")
assert html.count("const APP_BUILD='" + str(old_build) + "'") == 1
assert html.count("DOMUS · " + old_version + " · Build " + str(old_build)) == 1
assert sw.count("const EXPECTED_BUILD=" + str(old_build) + ";") == 1
assert manifest.count("self.DOMUS3_BUILD=" + str(old_build) + ";") == 1
html = html.replace("const APP_BUILD='" + str(old_build) + "'", "const APP_BUILD='" + str(new_build) + "'")
html = html.replace("DOMUS · " + old_version + " · Build " + str(old_build),
                    "DOMUS · " + new_version + " · Build " + str(new_build))
sw = sw.replace("const EXPECTED_BUILD=" + str(old_build) + ";",
                "const EXPECTED_BUILD=" + str(new_build) + ";")
version["build"] = new_build
version["version"] = new_version
version_path.write_text(json.dumps(version, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
html_path.write_text(html, encoding="utf-8")
sw_path.write_text(sw, encoding="utf-8")
assets_match = re.search(r"self\\.DOMUS3_ASSETS=(\\[[^;]+\\]);", manifest)
if not assets_match:
    raise SystemExit("Cannot find PWA asset list")
assets = json.loads(assets_match.group(1))
hashes = {}
for asset in assets:
    file = root / asset
    if not file.is_file() or not file.resolve().is_relative_to(root.resolve()):
        raise SystemExit("Missing or unsafe asset: " + asset)
    hashes[asset] = hashlib.sha256(file.read_bytes()).hexdigest()
manifest_path.write_text(
    "self.DOMUS3_BUILD=" + str(new_build) + ";\n" +
    "self.DOMUS3_ASSETS=" + json.dumps(assets, ensure_ascii=False, separators=(",", ":")) + ";\n" +
    "self.DOMUS3_SHA256=" + json.dumps(hashes, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8")
print("Prepared DOMUS", new_version, "build", new_build, "with", len(assets), "verified assets")
