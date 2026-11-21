import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Body: Instrument Sans (clear at small sizes, less generic than Inter).
// Display: Bricolage Grotesque for headings only, a warmer, slightly quirky voice for a "local friend" planner.
// Mono: only inside the agent console, where the content really is logs and tool names.
const body = Instrument_Sans({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const display = Bricolage_Grotesque({ variable: "--font-display-face", subsets: ["latin"], weight: ["600", "700"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Perfect Saturday · Delhi NCR",
  description: "An AI agent that plans a realistic, personalised Saturday in Delhi NCR — with a live trace of every tool call.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f9fafb" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
