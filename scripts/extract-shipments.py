"""One-off extract of 8-12-2026 Updated Shipping Report → src/data/shipments-2026.json"""
import json
import re
from collections import defaultdict
from datetime import datetime, date

import openpyxl

SRC = r"C:\Users\chris.woodmore\Desktop\2026 Shipping Report\8-12-2026 Updated Shipping Report.xlsx"
OUT = r"C:\Users\chris.woodmore\Ascent-Bookings-Dashboard-Performance\src\data\shipments-2026.json"

wb = openpyxl.load_workbook(SRC, data_only=True, read_only=True)
rows = list(wb["Sheet1"].iter_rows(max_col=22, values_only=True))
wb.close()

job_re = re.compile(r"^\d{2}-\d{5}")
months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]
mi = {m: i for i, m in enumerate(months)}
current = None
jobs = []
totals = {}
adj = defaultdict(dict)


def money(v):
    if v is None:
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).replace("$", "").replace(",", "").replace(" ", "")
    if s in ("", "-", "$-"):
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


def iso(v):
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    return None


def classify(job: str) -> str:
    j = job.upper()
    if "-INS" in j or j.endswith("INS"):
        return "insulation"
    if re.search(r"AG-C|-C(\d|$)|-C$", j):
        return "component"
    return "building"


def state_from_city(city):
    if not city:
        return None
    m = re.search(r",\s*([A-Z]{2})\s*$", str(city).strip(), re.I)
    return m.group(1).upper() if m else None


start_end = {}
for i, row in enumerate(rows, 1):
    b = row[1]
    if isinstance(b, str) and "2026 Revenue" in b:
        for m in months:
            if b.startswith(m):
                current = m
        continue
    if isinstance(b, str) and b in (
        "Deferred Loss",
        "Deferred Gain",
        "Freight",
        "Claims / CO's",
        "Difference",
        "Discounts",
        "Other Revenue",
    ):
        if current and current != "December":
            adj[current][b] = round(money(row[9]), 2)
        continue
    if row[5] == "Total Shipped Rev" or (isinstance(row[5], str) and "Total Shipped" in str(row[5])):
        if current:
            totals[current] = round(money(row[9]), 2)
        continue
    # Variance block only (no job #, month abbreviation in col F)
    if (
        i >= 1008
        and row[1] is None
        and isinstance(row[5], str)
        and row[5][:3]
        in ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
    ):
        mmap = {
            "Jan": "January",
            "Feb": "February",
            "Mar": "March",
            "Apr": "April",
            "May": "May",
            "Jun": "June",
            "Jul": "July",
            "Aug": "August",
            "Sep": "September",
            "Oct": "October",
            "Nov": "November",
            "Dec": "December",
        }
        key = mmap.get(row[5][:3])
        if key:
            end_v = money(row[11])
            start_end[key] = {
                "startRev": round(money(row[9]), 2),
                "endRev": round(end_v, 2) if end_v else None,
            }
        continue

    job = row[1]
    if not (isinstance(job, str) and job_re.match(job.strip())):
        continue
    jobs.append(
        {
            "id": job.strip(),
            "month": current or "Unknown",
            "monthIndex": mi.get(current or "", 0),
            "year": 2026,
            "egmPct": round(money(row[2]), 2),
            "dm": str(row[3] or "").strip(),
            "bsr": str(row[4] or "").strip(),
            "credit": str(row[5] or "").strip(),
            "revenue": round(money(row[9]), 2),
            "customer": str(row[12] or "").strip(),
            "project": str(row[13] or "").strip(),
            "city": str(row[14] or "").strip(),
            "state": state_from_city(row[14]),
            "kind": classify(job.strip()),
            "erd": iso(row[15]),
            "fabStart": iso(row[19]) if iso(row[19]) else None,
            "wtw": bool(row[8]),
        }
    )

# Patch July end from section total
if "July" in totals:
    start_end.setdefault("July", {})["endRev"] = totals["July"]
    if "startRev" not in start_end["July"]:
        start_end["July"]["startRev"] = 7625291.53

closed = ["January", "February", "March", "April", "May", "June", "July"]
monthly = []
for m in closed:
    mj = [j for j in jobs if j["month"] == m]
    job_sum = sum(j["revenue"] for j in mj)
    egm_d = sum(j["revenue"] * j["egmPct"] / 100 for j in mj)
    a = adj.get(m, {})
    monthly.append(
        {
            "year": 2026,
            "month": m,
            "monthIndex": mi[m],
            "shipped": totals.get(m, 0),
            "jobRevenue": round(job_sum, 2),
            "egmDollars": round(egm_d, 2),
            "egmPct": round(egm_d / job_sum, 4) if job_sum else 0,
            "jobCount": len(mj),
            "freight": a.get("Freight", 0),
            "deferredLoss": a.get("Deferred Loss", 0),
            "deferredGain": a.get("Deferred Gain", 0),
            "discounts": a.get("Discounts", 0),
            "claims": a.get("Claims / CO's", 0),
            "otherRevenue": a.get("Other Revenue", 0),
            "startRev": start_end.get(m, {}).get("startRev"),
            "endRev": start_end.get(m, {}).get("endRev") or totals.get(m),
            "actual": True,
        }
    )

# August partial
aug_jobs = [j for j in jobs if j["month"] == "August"]
if aug_jobs or totals.get("August"):
    job_sum = sum(j["revenue"] for j in aug_jobs)
    egm_d = sum(j["revenue"] * j["egmPct"] / 100 for j in aug_jobs)
    monthly.append(
        {
            "year": 2026,
            "month": "August",
            "monthIndex": 7,
            "shipped": totals.get("August", job_sum),
            "jobRevenue": round(job_sum, 2),
            "egmDollars": round(egm_d, 2),
            "egmPct": round(egm_d / job_sum, 4) if job_sum else 0,
            "jobCount": len(aug_jobs),
            "freight": 0,
            "deferredLoss": 0,
            "deferredGain": 0,
            "discounts": 0,
            "claims": 0,
            "otherRevenue": 0,
            "startRev": start_end.get("August", {}).get("startRev"),
            "endRev": totals.get("August"),
            "actual": False,
            "partial": True,
        }
    )

# Prior-year shipped $ for YoY (from earlier consolidated extract)
history = [
    {"year": 2025, "month": "January", "monthIndex": 0, "shipped": 4903998.15, "actual": True},
    {"year": 2025, "month": "February", "monthIndex": 1, "shipped": 6614475.53, "actual": True},
    {"year": 2025, "month": "March", "monthIndex": 2, "shipped": 9366082.85, "actual": True},
    {"year": 2025, "month": "April", "monthIndex": 3, "shipped": 6347208.69, "actual": True},
    {"year": 2025, "month": "May", "monthIndex": 4, "shipped": 5748174.58, "actual": True},
    {"year": 2025, "month": "June", "monthIndex": 5, "shipped": 9770874.24, "actual": True},
]

payload = {
    "source": "8-12-2026 Updated Shipping Report.xlsx",
    "asOf": "2026-08-12",
    "notes": "EGM is Estimated Gross Margin from the shipping report, not accounting GM. Closed months January–July 2026. August is partial through 8/12.",
    "monthly": monthly,
    "historyShipped": history,
    "forwardStart": [
        {"month": "August", "monthIndex": 7, "startRev": start_end.get("August", {}).get("startRev") or 8159283.09},
        {"month": "September", "monthIndex": 8, "startRev": start_end.get("September", {}).get("startRev") or 15776646.28},
        {"month": "October", "monthIndex": 9, "startRev": start_end.get("October", {}).get("startRev") or 5701123.2},
    ],
    "jobs": [j for j in jobs if j["month"] in closed + ["August"] and j["revenue"] != 0],
}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=None, separators=(",", ":"))

print("wrote", OUT, "jobs", len(payload["jobs"]), "monthly", len(monthly))
print("YTD shipped", sum(m["shipped"] for m in monthly if m.get("actual")))
