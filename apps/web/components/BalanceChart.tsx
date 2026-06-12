"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DataPoint {
  time: string;
  value: number;
}

const generateMockData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  const now = new Date();
  let baseValue = 12500;
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    baseValue += (Math.random() - 0.45) * 500;
    data.push({
      time: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Math.max(0, baseValue),
    });
  }
  return data;
};

export function BalanceChart() {
  const data = useMemo(() => generateMockData(), []);

  return (
    <div className="h-48 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="time" 
            hide 
          />
          <YAxis 
            domain={["dataMin - 1000", "dataMax + 1000"]} 
            hide 
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              borderRadius: "12px",
              border: "1px solid rgba(217, 70, 239, 0.2)",
              boxShadow: "0 8px 32px rgba(139, 92, 246, 0.15)",
              color: "#111827",
              fontWeight: 600,
            }}
            itemStyle={{ color: "#ec4899" }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Balance"]}
            labelStyle={{ color: "#6b7280", fontWeight: 500, marginBottom: "4px" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="url(#colorValue)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorValue)"
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
