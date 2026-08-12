import { useState } from "react";
import { CalendarRange, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MONTHS,
  MORE_PRESET_IDS,
  PRESETS,
  PRIMARY_PRESET_IDS,
  type DatePreset,
  type DateRange,
} from "@/data/bookings";
import { cn } from "@/lib/utils";

interface DateFiltersProps {
  preset: DatePreset;
  range: DateRange;
  onPresetChange: (preset: DatePreset) => void;
  onRangeChange: (range: DateRange) => void;
}

const YEARS = [2023, 2024, 2025, 2026];

function byIds(ids: DatePreset[]) {
  return ids
    .map((id) => PRESETS.find((p) => p.id === id))
    .filter((p): p is (typeof PRESETS)[number] => Boolean(p));
}

export function DateFilters({ preset, range, onPresetChange, onRangeChange }: DateFiltersProps) {
  const primary = byIds(PRIMARY_PRESET_IDS);
  const more = byIds(MORE_PRESET_IDS);
  const moreActive = MORE_PRESET_IDS.includes(preset);
  const [showMore, setShowMore] = useState(moreActive);

  function applyPreset(id: DatePreset, nextRange: DateRange | null) {
    if (!nextRange) return;
    onPresetChange(id);
    onRangeChange(nextRange);
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-fg)]">
        <CalendarRange className="size-4 text-[var(--color-primary)]" />
        Date range
      </div>

      <div className="flex flex-wrap gap-2">
        {primary.map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant={preset === p.id ? "default" : "secondary"}
            className={cn(
              "h-8 rounded-full px-3",
              preset === p.id ? "" : "bg-[var(--color-bg-subtle)] border-transparent",
            )}
            onClick={() => applyPreset(p.id, p.range)}
          >
            {p.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={showMore || moreActive ? "secondary" : "ghost"}
          className="h-8 rounded-full px-3"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
        >
          More
          <ChevronDown className={cn("size-3.5 transition-transform", showMore && "rotate-180")} />
        </Button>
      </div>

      {showMore && (
        <div className="flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3">
          <span className="self-center text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-subtle)]">
            More
          </span>
          {more.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={preset === p.id ? "default" : "secondary"}
              className={cn(
                "h-8 rounded-full px-3",
                preset === p.id ? "" : "bg-[var(--color-bg-subtle)] border-transparent",
              )}
              onClick={() => applyPreset(p.id, p.range)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Start year">
          <Select
            value={String(range.startYear)}
            onValueChange={(v) => {
              onPresetChange("custom");
              onRangeChange({ ...range, startYear: Number(v) });
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Start month">
          <Select
            value={String(range.startMonth)}
            onValueChange={(v) => {
              onPresetChange("custom");
              onRangeChange({ ...range, startMonth: Number(v) });
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="End year">
          <Select
            value={String(range.endYear)}
            onValueChange={(v) => {
              onPresetChange("custom");
              onRangeChange({ ...range, endYear: Number(v) });
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="End month">
          <Select
            value={String(range.endMonth)}
            onValueChange={(v) => {
              onPresetChange("custom");
              onRangeChange({ ...range, endMonth: Number(v) });
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--color-fg-subtle)]">{label}</span>
      {children}
    </label>
  );
}
