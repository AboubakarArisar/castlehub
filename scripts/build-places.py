"""Builds src/data/places.json for the World Map: countries (with an approximate centre)
and cities of 100,000+ people, each with rounded city-centre coordinates and IANA timezone.
A country gets a timezone only when all its cities share one (Pakistan yes, the US no).

Sources (downloaded when you run this, not at runtime):
  - GeoNames cities15000, admin1 codes and country info (CC BY 4.0, https://www.geonames.org)
  - world-countries 5.1.0 country centres (ODbL, https://github.com/mledoze/countries)

usage: python scripts/build-places.py
"""
import io
import json
import urllib.request
import zipfile
from collections import Counter
from pathlib import Path

MIN_POPULATION = 100_000
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "places.json"


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=120) as r:
        return r.read()


def main():
    centres = {c["cca2"]: c["latlng"] for c in json.loads(fetch("https://cdn.jsdelivr.net/npm/world-countries@5.1.0/countries.json")) if c.get("latlng")}

    countries = {}
    for line in fetch("https://download.geonames.org/export/dump/countryInfo.txt").decode("utf8").splitlines():
        if line.startswith("#") or not line.strip():
            continue
        f = line.split("\t")
        code, name = f[0], f[4]
        if code in centres:
            lat, lng = centres[code]
            countries[code] = {"code": code, "name": name, "lat": round(lat, 2), "lng": round(lng, 2)}

    regions = {}
    for line in fetch("https://download.geonames.org/export/dump/admin1CodesASCII.txt").decode("utf8").splitlines():
        f = line.split("\t")
        if len(f) >= 3:
            regions[f[0]] = f[2]

    raw = zipfile.ZipFile(io.BytesIO(fetch("https://download.geonames.org/export/dump/cities15000.zip"))).read("cities15000.txt").decode("utf8")
    cities = []
    zones = {}  # every timezone seen in each country, from all 15k+ towns for accuracy
    for line in raw.splitlines():
        f = line.split("\t")
        cc, pop, tz = f[8], int(f[14] or 0), f[17]
        if tz:
            zones.setdefault(cc, set()).add(tz)
        if pop < MIN_POPULATION or cc not in countries:
            continue
        cities.append({"id": int(f[0]), "name": f[1], "cc": cc, "region": regions.get(f"{cc}.{f[10]}", ""), "lat": round(float(f[4]), 2), "lng": round(float(f[5]), 2), "pop": pop, "tz": tz})
    for code, country in countries.items():
        if len(zones.get(code, ())) == 1:
            country["tz"] = next(iter(zones[code]))

    # Only name the region where two cities in one country share a name (Springfield, Illinois).
    dupes = Counter((c["cc"], c["name"]) for c in cities)
    out_cities = []
    for c in sorted(cities, key=lambda c: -c["pop"]):
        city = {"id": c["id"], "name": c["name"], "cc": c["cc"], "lat": c["lat"], "lng": c["lng"], "tz": c["tz"]}
        if dupes[(c["cc"], c["name"])] > 1 and c["region"]:
            city["region"] = c["region"]
        out_cities.append(city)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"countries": sorted(countries.values(), key=lambda c: c["name"]), "cities": out_cities}, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
    print(f"{len(countries)} countries, {len(out_cities)} cities -> {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
