import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TripContextProvider } from "@/context/TripContext";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Travel Agent Assistant",
  description: "AI-powered trip planner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <TripContextProvider>
          <Sidebar />
          <main className="min-h-screen pl-11 transition-all duration-300">{children}</main>
        </TripContextProvider>
      </body>
    </html>
  );
}
