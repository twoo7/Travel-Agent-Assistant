import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { TripContextProvider } from "@/context/TripContext";
import { LayoutShell } from "@/components/LayoutShell";
import { ToastProvider } from "@/components/ui/Toast";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Travel Agent Assistant",
  description: "AI-powered trip planner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSerif.variable} ${dmSans.variable} font-body bg-background min-h-screen`}>
        <TripContextProvider>
          <ToastProvider>
            <LayoutShell>{children}</LayoutShell>
          </ToastProvider>
        </TripContextProvider>
      </body>
    </html>
  );
}
