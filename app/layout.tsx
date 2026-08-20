import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import IssueDesignBridge from "@/components/issue-design-bridge";
import PersistenceBridge from "@/components/persistence-bridge";
import Providers from "./providers";
import "@neondatabase/auth-ui/css";
import "./globals.css";
import "./editor-enhancements.css";
import "./workspace-v2.css";
import "./typography-tokens.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Lexozine Studio",
  description: "Editorial design and digital magazine production studio by LexoGraphix Plus.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable}`}>
        <Providers><IssueDesignBridge /><PersistenceBridge />{children}</Providers>
      </body>
    </html>
  );
}
