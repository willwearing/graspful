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
    default: `${siteName}: Author courses with your AI agent`,
    template: `%s | ${siteName}`,
  },
  description:
    "Use your source material and a coding agent to author course YAML. Review lessons, worked examples, and questions before you publish with Graspful.",
  openGraph: {
    title: `${siteName}: Author courses with your AI agent`,
    description:
      "Author and review courses with CLI or MCP tools. Publish lessons with diagnostics, practice questions, and scheduled review.",
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
