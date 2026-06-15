import type { Metadata } from "next";
import "./globals.css";
import { AuthInitializer } from "@/components/auth/AuthInitializer";

export const metadata: Metadata = {
  metadataBase: new URL("https://devleep.com"),
  title: {
    default: "Devleep | Real DevOps Labs on Your AWS Infrastructure",
    template: "%s | Devleep",
  },
  description:
    "Practice Linux, Docker, Kubernetes, GitHub Actions and AWS on real infrastructure running inside your own AWS account. Fix incidents, troubleshoot failures and build production-ready DevOps skills.",
  keywords: [
    "DevOps labs",
    "hands-on DevOps",
    "Linux labs",
    "Docker labs",
    "Kubernetes labs",
    "AWS labs",
    "CI/CD labs",
    "GitHub Actions labs",
    "cloud infrastructure training",
    "DevOps practice",
    "incident response training",
    "free DevOps labs",
    "Devleep",
  ],
  icons: {
    icon: [
      { url: "/icons/favicon.ico",       type: "image/x-icon" },
      { url: "/icons/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/icons/favicon.svg",       type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Devleep",
    url: "https://devleep.com",
    title: "Devleep | Real DevOps Labs on Your AWS Infrastructure",
    description:
      "Practice Linux, Docker, Kubernetes, GitHub Actions and AWS on real infrastructure running inside your own AWS account. Fix incidents, troubleshoot failures and build production-ready DevOps skills.",
    images: [{ url: "/OG-image.png", width: 1200, height: 630, alt: "Devleep — Real DevOps Labs on AWS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Devleep | Real DevOps Labs on Your AWS Infrastructure",
    description:
      "Practice Linux, Docker, Kubernetes, GitHub Actions and AWS on real infrastructure running inside your own AWS account. Fix incidents, troubleshoot failures and build production-ready DevOps skills.",
    images: ["/OG-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link href="https://fonts.gstatic.com" rel="preconnect" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthInitializer>
          {children}
        </AuthInitializer>
      </body>
    </html>
  );
}
