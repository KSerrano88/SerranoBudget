"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  DollarSign,
  PlusCircle,
  History,
  BarChart3,
  Trash2,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const navItems = [
  {
    title: "30 Day Balance Sheet",
    href: "/balance-sheet",
    icon: DollarSign,
  },
  {
    title: "Add a Transaction",
    href: "/add-transaction",
    icon: PlusCircle,
  },
  {
    title: "Display Transaction History",
    href: "/history",
    icon: History,
  },
  {
    title: "Transaction Totals by Month",
    href: "/monthly-totals",
    icon: BarChart3,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  async function handleDeleteLast() {
    const res = await fetch("/api/transactions/last", { method: "DELETE" });
    if (res.ok) {
      toast.success("Last transaction deleted");
      window.location.reload();
    } else {
      toast.error("Failed to delete last transaction");
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <Link href="/balance-sheet" className="block">
          <div className="rounded-lg bg-gradient-to-br from-[#1a2876] to-[#000244] px-4 py-3 shadow-lg ring-1 ring-white/10">
            <div className="text-center">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-300">
                Serrano
              </span>
              <span className="block text-xl font-extrabold tracking-tight text-white">
                Budget<span className="text-amber-400">-inator</span>
              </span>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="py-3 text-[14px] font-bold border-t border-[#00094D] border-b border-b-[#1A2876]"
                  >
                    <Link href={item.href} onClick={() => setOpenMobile(false)}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-[#1A2876]" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <SidebarMenuButton className="py-3 text-[13px] font-semibold text-red-300 hover:text-red-200">
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Last Transaction</span>
                    </SidebarMenuButton>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete Last Transaction
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete the most recently added
                        transaction? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteLast}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="py-3 text-[13px] opacity-80 hover:opacity-100"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
