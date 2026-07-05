"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ChartDataPoint {
  date: string;
  amount: number;
}

interface DashboardClientProps {
  chartData: ChartDataPoint[];
}

export const DashboardClient: React.FC<DashboardClientProps> = ({ chartData }) => {
  return (
    <div className="w-full h-80 pt-4">
      {chartData.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center text-on-surface-variant/60">
          No transaction history available.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4E342E" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#4E342E" stopOpacity={0} />
              </linearGradient>
            </defs>
            {/* Subtle gridlines, Y-axis only */}
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0, 0, 0, 0.05)" />
            <XAxis
              dataKey="date"
              stroke="rgba(0, 0, 0, 0.4)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="rgba(0, 0, 0, 0.4)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.22)",
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
                color: "#1a1c1d",
              }}
              formatter={(value: any) => [`₹${value}`, "Revenue"]}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#4E342E"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              activeDot={{ r: 5, fill: "#C89B3C", stroke: "#FFFFFF", strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
export default DashboardClient;
