import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Body: Atkinson Hyperlegible Next (Braille Institute), built for legibility, which suits dense times, prices and badges.
// Display: Bricolage Grotesque for headings only, a warmer, slightly quirky voice for a "local friend" planner.
// Mono: only inside the agent console, where the content really is logs and tool names.
const body = Atkinson_Hyperlegible_Next({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
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
