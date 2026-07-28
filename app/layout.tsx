import type { Metadata } from "next";
import {
  Instrument_Serif,
  Work_Sans,
  IBM_Plex_Mono,
  DM_Serif_Display,
} from "next/font/google";
import "./globals.css";

// Accent — sparing, elevated moments only (single emphasized words).
const instrumentSerif = Instrument_Serif({
  variable: "--font-accent",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

// Workhorse — nav, buttons, headings, most bold UI chrome.
const workSans = Work_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Body / "coded data" — paragraph copy and anything representing raw/coded text.
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Brand wordmark only — preserved as-is (branding is a separate, deferred decision).
const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-wordmark",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Qualai — Understand what your team really feels",
  description:
    "AI-powered qualitative analysis for HR. Turn open-text survey responses into structured, stakeholder-ready insight.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: `
          try {
            const theme = localStorage.getItem('qualai_theme');
            if (theme === 'light') document.documentElement.classList.add('light');
          } catch(e) {}
        `}} />
      </head>
      <body
        className={`${instrumentSerif.variable} ${workSans.variable} ${ibmPlexMono.variable} ${dmSerifDisplay.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
