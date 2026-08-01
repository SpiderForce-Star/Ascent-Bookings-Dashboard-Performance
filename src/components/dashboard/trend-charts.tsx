import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface Point {
  key: string;
  month: string;
  year: number;
  revenue: number;
  gm: number;
  gmPct: number;
  priorRevenue: number;
  priorGm: number;
}

interface TrendChartsProps {
  data: Point[];
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 shadow-[var(--shadow-md)]">
      <p className="mb-1.5 text-xs font-medium text-[var(--color-fg)]">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-6 text-xs">
            <span className="flex items-center gap-1.5 text-[var(--color-fg-muted)]">
              <span className="size-2 rounded-full" style={{ background: entry.color }} />
              {entry.name}
            </span>
            <span className="font-medium tabular text-[var(--color-fg)]">
              {entry.dataKey === "gmPct"
                ? `${Number(entry.value).toFixed(1)}%`
                : formatCurrency(Number(entry.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const axisStyle = { fontSize: 11, fill: "var(--color-fg-subtle)" };
const gridStroke = "var(--color-border)";

export function TrendCharts({ data }: TrendChartsProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center text-sm text-[var(--color-fg-muted)]">
          No months in the selected range.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Revenue trend</CardTitle>
          <CardDescription>Bookings vs prior-year same months</CardDescription>
        </CardHeader>
        <CardContent className="h-72 pt-0 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="key" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v, true)}
                width={56}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "var(--color-fg-muted)" }}
                iconType="circle"
                iconSize={8}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                fill="url(#revFill)"
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="priorRevenue"
                name="Prior year"
                stroke="var(--color-chart-3)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Gross margin</CardTitle>
          <CardDescription>Margin dollars and rate by month</CardDescription>
        </CardHeader>
        <CardContent className="h-72 pt-0 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="key" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis
                yAxisId="left"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v, true)}
                width={56}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                width={40}
                domain={[0, 40]}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "var(--color-fg-muted)" }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                yAxisId="left"
                dataKey="gm"
                name="GM $"
                fill="var(--color-ink)"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
                opacity={0.85}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="gmPct"
                name="GM %"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--color-primary)", strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden xl:col-span-2">
        <CardHeader>
          <CardTitle>Year-over-year comparison</CardTitle>
          <CardDescription>Side-by-side monthly bookings in the selected window</CardDescription>
        </CardHeader>
        <CardContent className="h-72 pt-0 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="key" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v, true)}
                width={56}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "var(--color-fg-muted)" }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="priorRevenue"
                name="Prior year"
                fill="var(--color-bg-muted)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="revenue"
                name="Selected"
                fill="var(--color-primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
