"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { DollarSign, PlusCircle, History, BarChart3 } from "lucide-react";

const navItems = [
  { title: "Balance", href: "/balance-sheet", icon: DollarSign },
  { title: "Add", href: "/add-transaction", icon: PlusCircle },
  { title: "History", href: "/history", icon: History },
  { title: "Totals", href: "/monthly-totals", icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex md:hidden flex-col shrink-0 bg-[#000366]">
      <div className="flex h-10 items-center px-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-sky-300">
          Menu
        </span>
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
