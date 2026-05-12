import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bill Splitter",
  description: "Split bills with friends from a photo of your receipt",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
