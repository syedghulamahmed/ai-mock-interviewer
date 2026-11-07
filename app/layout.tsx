import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "InterviewForge AI — Practice with purpose", description: "Adaptive AI mock interviews with actionable feedback and progress tracking." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
