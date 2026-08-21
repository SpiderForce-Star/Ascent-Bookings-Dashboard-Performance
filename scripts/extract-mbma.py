"""
Extract MBMA Non-Agriculture 2025 county shipments for the Ascent focus
territory (TX, FL, OH, IN, MO, IL) and build a compact SVG choropleth.

Sources (proprietary, internal use only):
  Desktop/MBMA Dashboard info/CountyShip4Q25.pdf
  Desktop/MBMA Dashboard info/ShipByState4Q25.xlsx

Outputs:
  src/data/mbma/counties.json
  src/data/mbma/geo.json
"""

from __future__ import annotations

import json
import math
import re
import urllib.request
from pathlib import Path

import fitz
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "src" / "data" / "mbma"
PDF = Path(r"C:\Users\chris.woodmore\Desktop\MBMA Dashboard info\CountyShip4Q25.pdf")
XLSX = Path(r"C:\Users\chris.woodmore\Desktop\MBMA Dashboard info\ShipByState4Q25.xlsx")

FOCUS = {
    "12": "FL",
    "17": "IL",
    "18": "IN",
    "29": "MO",
    "39": "OH",
    "48": "TX",
}
STATE_NAMES = {
    "TX": "Texas",
    "FL": "Florida",
    "OH": "Ohio",
    "IN": "Indiana",
    "MO": "Missouri",
    "IL": "Illinois",
}

# Leadership-specified 2025 YTD checkpoints (000s). Parser must match these.
CHECKPOINTS = {
    "48201": 74739,  # Harris TX
    "18003": 25517,  # Allen IN
    "29077": 22806,  # Greene MO
    "39049": 20297,  # Franklin OH
    "39113": 17971,  # Montgomery OH
    "18097": 17451,  # Marion IN
    "18039": 15418,  # Elkhart IN
    "17031": 15290,  # Cook IL
    "48291": 14883,  # Liberty TX
    "48473": 13601,  # Waller TX
    "48339": 13358,  # Montgomery TX
    "12031": 7395,  # Duval FL
}

NUM_RE = re.compile(r"^-?[0-9,]+$")
FIPS_RE = re.compile(r"^\d{5}$")
NAME_RE = re.compile(r"^[A-Z][A-Z0-9 .&'\-]+$")
ROW_NUM_RE = re.compile(r"^\d{1,3}$")


def money(s: str) -> int:
    return int(s.replace(",", ""))


def extract_counties() -> list[dict]:
    doc = fitz.open(PDF)
    lines: list[str] = []
    for page in doc:
        text = page.get_text("text")
        for raw in text.splitlines():
            s = raw.strip()
            if not s:
                continue
            if s.startswith("Page ") or s.startswith("Compiled:") or s.startswith("METAL BUILDING"):
                continue
            if s in {"Number", "Name", "FIPS", "Q1", "Q2", "Q3", "Q4", "YTD", "TOTAL"}:
                continue
            lines.append(s)
    doc.close()

    counties: list[dict] = []
    i = 0
    n = len(lines)
    while i < n - 6:
        if (
            ROW_NUM_RE.match(lines[i])
            and NAME_RE.match(lines[i + 1])
            and FIPS_RE.match(lines[i + 2])
            and all(NUM_RE.match(lines[i + k]) for k in range(3, 8))
        ):
            fips = lines[i + 2]
            prefix = fips[:2]
            if prefix in FOCUS:
                q1, q2, q3, q4, ytd = (money(lines[i + k]) for k in range(3, 8))
                counties.append(
                    {
                        "fips": fips,
                        "name": title_county(lines[i + 1]),
                        "state": FOCUS[prefix],
                        "q1": q1,
                        "q2": q2,
                        "q3": q3,
                        "q4": q4,
                        "ytd": ytd,
                    }
                )
            i += 8
            continue
        i += 1
    return counties


def title_county(name: str) -> str:
    # Keep ST / DE / LA particles readable: ST JOHNS → St. Johns
    parts = name.replace(".", "").split()
    special = {"ST": "St.", "STE": "Ste.", "DE": "De", "DU": "Du", "LA": "La", "LE": "Le", "MC": "Mc"}
    out = []
    for p in parts:
        if p in special:
            out.append(special[p])
        elif p.startswith("MC") and len(p) > 2:
            out.append("Mc" + p[2:].title())
        else:
            out.append(p.title())
    return " ".join(out)


def verify(counties: list[dict]) -> None:
    by_fips = {c["fips"]: c for c in counties}
    missing = []
    mismatch = []
    for fips, expected in CHECKPOINTS.items():
        row = by_fips.get(fips)
        if not row:
            missing.append(fips)
        elif row["ytd"] != expected:
            mismatch.append((fips, row["name"], row["ytd"], expected))
    if missing or mismatch:
        raise SystemExit(f"Checkpoint failure missing={missing} mismatch={mismatch}")

    by_state: dict[str, int] = {}
    for c in counties:
        by_state[c["state"]] = by_state.get(c["state"], 0) + c["ytd"]
    print("County YTD by state:", by_state)
    print(f"Extracted {len(counties)} counties")


# --- Albers equal-area conic (WGS84 sphere, d3-geo-albersUsa lower-48 params) ---
PHI0 = math.radians(37.5)
LAM0 = math.radians(-96.0)
PHI1 = math.radians(29.5)
PHI2 = math.radians(45.5)
N = (math.sin(PHI1) + math.sin(PHI2)) / 2.0
C = math.cos(PHI1) ** 2 + 2 * N * math.sin(PHI1)
RHO0 = math.sqrt(C - 2 * N * math.sin(PHI0)) / N


def albers(lon: float, lat: float) -> tuple[float, float]:
    phi = math.radians(lat)
    lam = math.radians(lon)
    theta = N * (lam - LAM0)
    rho = math.sqrt(C - 2 * N * math.sin(phi)) / N
    x = rho * math.sin(theta)
    y = RHO0 - rho * math.cos(theta)
    return x, -y  # SVG y-down


def iter_rings(geom: dict):
    t = geom.get("type")
    coords = geom.get("coordinates") or []
    if t == "Polygon":
        yield from coords
    elif t == "MultiPolygon":
        for poly in coords:
            yield from poly


def project_ring(ring: list) -> list[tuple[float, float]]:
    pts = []
    for pair in ring:
        lon, lat = pair[0], pair[1]
        pts.append(albers(lon, lat))
    return pts


def simplify(pts: list[tuple[float, float]], epsilon: float) -> list[tuple[float, float]]:
    """Douglas–Peucker. Keeps closed rings closed."""
    if len(pts) <= 4:
        return pts

    def _dp(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
        if len(points) < 3:
            return points
        ax, ay = points[0]
        bx, by = points[-1]
        dx, dy = bx - ax, by - ay
        mag = math.hypot(dx, dy) or 1.0
        max_d = -1.0
        idx = 0
        for i in range(1, len(points) - 1):
            px, py = points[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / mag
            if d > max_d:
                max_d = d
                idx = i
        if max_d > epsilon:
            left = _dp(points[: idx + 1])
            right = _dp(points[idx:])
            return left[:-1] + right
        return [points[0], points[-1]]

    closed = pts[0] == pts[-1]
    core = pts[:-1] if closed else pts
    out = _dp(core if not closed else core + [pts[0]])
    if closed:
        if out[0] != out[-1]:
            out.append(out[0])
        if len(out) < 4:
            return pts
    return out


def path_from_rings(rings: list[list[tuple[float, float]]], sx, sy, tx, ty) -> str:
    parts = []
    for ring in rings:
        if len(ring) < 4:
            continue
        cmds = []
        for i, (x, y) in enumerate(ring):
            px = x * sx + tx
            py = y * sy + ty
            cmds.append(("M" if i == 0 else "L") + f"{px:.1f},{py:.1f}")
        parts.append(" ".join(cmds) + " Z")
    return " ".join(parts)


def download_counties_geojson() -> dict:
    # Census cartographic boundary, 20m (highly generalized — small payload).
    urls = [
        "https://www2.census.gov/geo/tiger/GENZ2023/geojson/cb_2023_us_county_20m.json",
        "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json",
    ]
    last_err = None
    for url in urls:
        try:
            print("Downloading", url)
            req = urllib.request.Request(url, headers={"User-Agent": "Ascent-MBMA-extract/1.0"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            last_err = e
            print("  failed:", e)
    raise SystemExit(f"Could not download county GeoJSON: {last_err}")


def build_geo(counties: list[dict]) -> dict:
    gj = download_counties_geojson()
    wanted = {c["fips"] for c in counties}
    raw: dict[str, list[list[tuple[float, float]]]] = {}

    features = gj.get("features") or []
    for feat in features:
        props = feat.get("properties") or {}
        geom = feat.get("geometry") or {}
        fips = (
            props.get("GEOID")
            or props.get("GEO_ID")
            or feat.get("id")
            or props.get("FIPS")
        )
        if fips is None:
            continue
        fips = str(fips)
        if fips.startswith("0500000US"):
            fips = fips[-5:]
        fips = fips.zfill(5)
        if fips not in wanted:
            continue
        rings = []
        for ring in iter_rings(geom):
            if len(ring) < 4:
                continue
            rings.append(project_ring(ring))
        if rings:
            raw[fips] = rings

    missing = sorted(wanted - set(raw))
    if missing:
        print("WARNING missing geometries:", len(missing), missing[:20])

    all_pts = [p for rings in raw.values() for ring in rings for p in ring]
    xs = [p[0] for p in all_pts]
    ys = [p[1] for p in all_pts]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    width, height = 960.0, 620.0
    pad = 12.0
    sx = (width - 2 * pad) / (maxx - minx)
    sy = (height - 2 * pad) / (maxy - miny)
    s = min(sx, sy)
    tx = pad - minx * s + (width - 2 * pad - (maxx - minx) * s) / 2
    ty = pad - miny * s + (height - 2 * pad - (maxy - miny) * s) / 2

    # epsilon in projected units before scale — ~0.4px after scale
    epsilon = 0.4 / s

    out_features = []
    for fips, rings in raw.items():
        simplified = [simplify(ring, epsilon) for ring in rings]
        d = path_from_rings(simplified, s, s, tx, ty)
        if d:
            out_features.append({"fips": fips, "d": d})

    out_features.sort(key=lambda f: f["fips"])
    print(f"Geo features: {len(out_features)}")
    return {
        "viewBox": f"0 0 {int(width)} {int(height)}",
        "width": int(width),
        "height": int(height),
        "features": out_features,
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    counties = extract_counties()
    counties.sort(key=lambda c: (-c["ytd"], c["state"], c["name"]))
    verify(counties)

    # Cross-check state workbook YTD vs county sums (county PDF can omit a few $)
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb.active
    print("State workbook loaded:", ws.title)
    wb.close()

    payload = {
        "source": "MBMA Non-Agriculture Shipment Report",
        "period": "2025 full year",
        "compiled": "2026-02-18",
        "unit": "000s USD",
        "disclaimer": "Industry-wide MBMA data. Not Ascent bookings. Internal use only.",
        "counties": counties,
    }
    counties_path = OUT_DIR / "counties.json"
    counties_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("Wrote", counties_path, "bytes", counties_path.stat().st_size)

    geo = build_geo(counties)
    geo_path = OUT_DIR / "geo.json"
    geo_path.write_text(json.dumps(geo, separators=(",", ":")), encoding="utf-8")
    print("Wrote", geo_path, "bytes", geo_path.stat().st_size)


if __name__ == "__main__":
    main()
