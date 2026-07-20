"use client";

import { motion } from "framer-motion";

interface Props {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: string; up: boolean };
  color: string;
  index?: number;
}

export default function StatCard({ label, value, icon, trend, color, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      className="rounded-xl border border-[#7DA0CA]/20 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:bg-[#052659]/40 dark:border-white/10"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#021024]/50 dark:text-white/50 font-medium">{label}</p>
          <p className="mt-1.5 text-3xl font-bold text-[#021024] dark:text-white tracking-tight">{value}</p>
          {trend && (
            <p className={`mt-1.5 text-xs font-medium ${trend.up ? "text-emerald-600 dark:text-emerald-400" : "text-orange-500"}`}>
              {trend.up ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color} text-white`}>{icon}</div>
      </div>
    </motion.div>
  );
}
