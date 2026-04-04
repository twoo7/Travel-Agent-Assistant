import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TripContextProvider } from "@/context/TripContext";
import { Stepper } from "@/components/Stepper";

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
          <Stepper />
          <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        </TripContextProvider>
      </body>
    </html>
  );
}
