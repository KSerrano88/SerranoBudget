"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { DollarSign, PlusCircle, History, BarChart3 } from "lucide-react";

const navItems = [
  { title: "Balance", href: "/balance-sheet", icon: DollarSign },
  { title: "Add Transaction", href: "/add-transaction", icon: PlusCircle },
  { title: "History", href: "/history", icon: History },
  { title: "Totals", href: "/monthly-totals", icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 flex md:hidden flex-col shrink-0 bg-[#000366]">
      <div className="grid grid-cols-4 h-12">
        <div className="col-span-3 flex items-center px-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-sky-300">
            Menu
          </span>
        </div>
        <div className="flex items-center justify-center px-1">
          <div className="w-full rounded bg-gradient-to-br from-[#1a2876] to-[#000244] px-2 py-1.5 shadow ring-1 ring-white/10">
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
      </div>
      <div className="flex">
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
