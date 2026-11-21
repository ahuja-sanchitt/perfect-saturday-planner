import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, JetBrains_Mono, Yatra_One } from "next/font/google";
import "./globals.css";

// Body: Atkinson Hyperlegible Next (Braille Institute), built for legibility, which suits dense times, prices and badges.
// Display: Yatra One, a lettered face with the hand of Delhi's painted cinema hoardings. Titles, stop names and showtimes only.
// Mono: only inside the agent console, where the content really is logs and tool names.
const body = Atkinson_Hyperlegible_Next({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const display = Yatra_One({ variable: "--font-display-face", subsets: ["latin"], weight: "400" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Perfect Saturday · Delhi NCR",
  description: "An AI agent that plans a realistic, personalised Saturday in Delhi NCR — with a live trace of every tool call.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1b1a2e" };

const THEME_SCRIPT = `try{var q=new URLSearchParams(location.search),m=q.get("motion");if(m==="off")document.documentElement.dataset.motion="off"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${body.variable} ${display.variable} ${mono.variable} h-full antialiased`}>
      <head>
        {/* Review aid: ?motion=off settles animations (used for screenshots). Applied before paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
