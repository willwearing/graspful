import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/lib/theme";
import { siteName } from "@/lib/site-config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${siteName}: Turn Your Expertise Into a Course Business`,
    template: `%s | ${siteName}`,
  },
  description:
    "Your expertise. AI's scaffolding. Every course gets adaptive diagnostics, mastery tracking, and spaced review. Launch a live product in minutes, not months.",
  openGraph: {
    title: `${siteName}: Turn Your Expertise Into a Course Business`,
    description:
      "Your expertise. AI's scaffolding. Every course gets adaptive diagnostics, mastery tracking, and spaced review.",
    type: "website",
  },
};

const preventFlash = `(function(){var t=localStorage.getItem("site-theme");if(t==="dark"){document.documentElement.classList.add("dark")}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preventFlash }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
