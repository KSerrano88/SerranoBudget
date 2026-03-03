import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { auth } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Serrano Budget",
  description: "Personal budget management application",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider session={session}>
          <TooltipProvider>
            {session ? (
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                  <header className="flex md:hidden h-14 shrink-0 items-center gap-2 border-b bg-white px-4">
                    <SidebarTrigger className="size-9" />
                    <span className="text-sm font-semibold">Serrano Budget</span>
                  </header>
                  <div className="flex-1 p-6">{children}</div>
                </SidebarInset>
              </SidebarProvider>
            ) : (
              children
            )}
          </TooltipProvider>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
