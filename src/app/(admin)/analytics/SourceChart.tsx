"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// одна фирменная и производные: цвет здесь различает столбцы, а не кодирует смысл
const BAR_COLORS = ["#1550e4", "#3d74f0", "#6f99f5", "#a1bdf9", "#c9d9fc"];

export type ChartRow = { name: string; orders: number };

export default function SourceChart({ data }: { data: ChartRow[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={32}
          />
          <Tooltip cursor={{ fill: "rgba(21,80,228,.06)" }} />
          <Bar dataKey="orders" name="Заявок" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
