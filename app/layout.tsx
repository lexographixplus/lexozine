import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import IssueDesignBridge from "@/components/issue-design-bridge";
import "./globals.css";
import "./editor-enhancements.css";
import "./workspace-v2.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Lexozine Studio",
  description: "Editorial design and digital magazine production studio by LexoGraphix Plus.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable}`}><IssueDesignBridge />{children}</body>
    </html>
  );
}
