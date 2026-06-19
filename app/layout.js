import React from "react";
import "./globals.css";
import styles from "./layout.module.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata = {
  title: "ScratchX | Premium Digital Rewards & Customer Engagement Platform",
  description:
    "ScratchX helps retailers create digital scratch card campaigns, rewards, cashback offers, and loyalty experiences that increase customer engagement, retention, and repeat purchases.",
  metadataBase: new URL("https://test.thescratchx.com"),
  openGraph: {
    title: "ScratchX | Reward Customers. Bring Them Back.",
    description:
      "Create digital scratch-card campaigns, rewards, cashback offers, and customer engagement experiences that drive loyalty, retention, and repeat customers.",
    url: "https://test.thescratchx.com",
    siteName: "ScratchX",
    images: [
      {
        url: "/ScratchX.webp",
        width: 1200,
        height: 630,
        alt: "ScratchX – Digital Scratch Card Campaigns",
      },
    ],
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScratchX | Reward Customers. Bring Them Back.",
    description:
      "Create digital scratch-card campaigns, rewards, cashback offers, and customer engagement experiences that drive loyalty, retention, and repeat customers.",
    images: ["/ScratchX.webp"],
  },
  icons: {
    icon: "/ScratchX.webp",
    shortcut: "/ScratchX.webp",
    apple: "/ScratchX.webp",
  },
  keywords: [
    "scratch card campaigns",
    "digital rewards",
    "customer loyalty",
    "cashback offers",
    "retail engagement",
    "loyalty platform",
    "customer retention",
    "digital rewards platform",
    "customer engagement platform",
    "customer loyalty platform",
    "customer retention platform",
    "retail loyalty platform",
    "digital scratch card platform",
    "scratch card campaigns",
    "customer rewards platform",
    "cashback offers",
    "retail engagement",
    "customer retention software",
    "customer loyalty software",
    "repeat customer platform",
    "customer engagement campaigns",
    "interactive reward experiences",
    "drive repeat purchases",
    "turn purchases into repeat customers",
    "ScratchX"
  ],
  authors: [{ name: "ScratchX" }],
  creator: "ScratchX",
  publisher: "ScratchX",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning style={{ colorScheme: 'light' }}>
      <body suppressHydrationWarning>
        <AuthProvider>
          <main className={styles.mainContent}>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
