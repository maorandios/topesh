import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { Providers } from "@/components/providers"
import "./globals.css"

const googleSans = localFont({
  src: [
    {
      path: "../fonts/GoogleSans-Variable.ttf",
      style: "normal",
      weight: "100 900",
    },
    {
      path: "../fonts/GoogleSans-Italic-Variable.ttf",
      style: "italic",
      weight: "100 900",
    },
  ],
  variable: "--font-google-sans",
  display: "swap",
  fallback: ["Arial", "Helvetica Neue", "sans-serif"],
})

export const metadata: Metadata = {
  title: "יומן עבודה",
  description: "יומן עבודה תפעולי לצוותי התקנה",
  applicationName: "יומן עבודה",
  appleWebApp: {
    capable: true,
    title: "יומן עבודה",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1C2127",
  interactiveWidget: "resizes-content",
  colorScheme: "light",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      data-nav="forward"
      className={`${googleSans.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
