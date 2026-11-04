import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import Script from "next/script"
import { Providers } from "@/components/providers"
import { THEME_STORAGE_KEY } from "@/features/theme/theme"
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
  title: "טופ-אש",
  description: "יומן עבודה תפעולי לצוותי התקנה",
  applicationName: "טופ-אש",
  appleWebApp: {
    capable: true,
    title: "טופ-אש",
    // Draw under the status bar so the top chrome background is continuous on iPhone.
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFDFB" },
    { media: "(prefers-color-scheme: dark)", color: "#050506" },
  ],
  interactiveWidget: "resizes-content",
  colorScheme: "light dark",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      data-nav="forward"
      suppressHydrationWarning
      className={`${googleSans.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-background text-foreground">
        <Script
          id="topesh-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}else{document.documentElement.style.colorScheme="light";}}catch(e){}})();`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
