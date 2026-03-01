import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paris Trip Planner",
  description: "Private group trip planner for Paris",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
