"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { DollarSign, PlusCircle, Repeat, History, BarChart3, PieChart, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

const navItems = [
  { title: "Balance", href: "/balance-sheet", icon: DollarSign },
  { title: "Add Transaction", href: "/add-transaction", icon: PlusCircle },
  { title: "Recurring", href: "/recurring-transactions", icon: Repeat },
  { title: "History", href: "/history", icon: History },
  { title: "Totals", href: "/monthly-totals", icon: BarChart3 },
  { title: "Charts", href: "/visualizations", icon: PieChart },
];

export function MobileNav() {
  const pathname = usePathname();
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <nav className="sticky top-0 z-50 flex md:hidden flex-col shrink-0 bg-[#000366]">
      <div className="flex h-12 items-center justify-between px-4">
        <Button
          variant="ghost"
          className="min-h-11 text-sky-300 hover:bg-[#010337] hover:text-white"
          aria-label="Open menu"
          aria-expanded={openMobile}
          onClick={() => setOpenMobile(true)}
        >
          <Menu aria-hidden="true" />
          Menu
        </Button>
        <div className="shrink-0 rounded bg-gradient-to-br from-[#1a2876] to-[#000244] px-3 py-1.5 shadow ring-1 ring-white/10">
          <div className="text-center">
            <span className="block text-[7px] font-semibold uppercase tracking-[0.25em] text-sky-300">
              Serrano
            </span>
            <span className="block text-[11px] font-extrabold tracking-tight text-white">
              Budget<span className="text-amber-400">-inator</span>
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 min-[480px]:grid-cols-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-bold text-white transition-colors ${
                isActive
                  ? "bg-[#010337]"
                  : "hover:bg-[#010337]"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
