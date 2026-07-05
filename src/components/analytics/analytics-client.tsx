"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SegmentProps {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface AnalyticsClientProps {
  segments: SegmentProps[];
  monthlyGrowthData: Array<{ month: string; count: number }>;
}

export const AnalyticsClient: React.FC<AnalyticsClientProps> = ({ segments, monthlyGrowthData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-card-gap w-full">
      {/* Customer Segmentation */}
      <div className="bg-white/65 dark:bg-primary/65 backdrop-blur-xl border border-white/22 dark:border-white/10 rounded-xl p-6 flex flex-col col-span-1 min-h-[320px]">
        <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-6">
          Customer Segmentation
        </h3>
        <div className="flex-1 flex flex-col justify-center gap-5">
          {segments.map((seg, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }}></div>
                  <span className="font-body-md text-body-md text-primary font-medium">{seg.label}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-label-sm text-label-sm font-semibold text-primary">{seg.percentage}%</span>
                  <span className="text-[12px] text-on-surface-variant">{seg.count} users</span>
                </div>
              </div>
              <div className="w-full bg-black/5 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${seg.percentage}%`, backgroundColor: seg.color }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Growth Chart */}
      <div className="bg-white/65 dark:bg-primary/65 backdrop-blur-xl border border-white/22 dark:border-white/10 rounded-xl p-6 flex flex-col col-span-1 lg:col-span-2 min-h-[320px]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Customer Growth (Monthly)
          </h3>
        </div>
        <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyGrowthData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0, 0, 0, 0.05)" />
              <XAxis dataKey="month" stroke="rgba(0, 0, 0, 0.4)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(0, 0, 0, 0.4)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.22)",
                  borderRadius: "12px",
                }}
              />
              <Bar dataKey="count" fill="#4E342E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
