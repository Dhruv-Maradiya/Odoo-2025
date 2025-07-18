import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { HeroUIProvider } from "@heroui/react";
import { AuthProvider } from "@/lib/auth-provider";
import { SearchProvider } from "@/contexts/search-context";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StackIt - Q&A Forum Platform",
  description:
    "A minimal question-and-answer platform for collaborative learning",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <HeroUIProvider>
              <SearchProvider>
                {children}
                <Toaster richColors />
              </SearchProvider>
            </HeroUIProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
