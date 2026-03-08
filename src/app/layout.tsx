import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { auth } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
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
        className={`${inter.variable} antialiased`}
      >
        <SessionProvider session={session}>
          <TooltipProvider>
            {session ? (
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                  <MobileNav />
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
