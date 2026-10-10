import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexovate — Make what’s next",
  description: "A thoughtful workspace for billing, campaigns, and community growth.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
