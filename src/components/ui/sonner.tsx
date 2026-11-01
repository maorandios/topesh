"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CheckCircle2Icon,
  InfoIcon,
  Loader2Icon,
  XCircleIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "@/features/theme/theme-provider"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      dir="rtl"
      position="top-center"
      className="toaster group"
      gap={12}
      duration={3200}
      visibleToasts={3}
      offset={{ top: "0.75rem", right: "1rem", left: "1rem", bottom: "1rem" }}
      mobileOffset={{ top: "0.75rem", right: "1rem", left: "1rem", bottom: "1rem" }}
      icons={{
        success: <CheckCircle2Icon className="size-5 text-emerald-500" aria-hidden />,
        info: <InfoIcon className="size-5 text-zinc-400" aria-hidden />,
        warning: <TriangleAlertIcon className="size-5 text-zinc-400" aria-hidden />,
        error: <XCircleIcon className="size-5 text-red-500" aria-hidden />,
        loading: <Loader2Icon className="size-5 animate-spin text-zinc-400" aria-hidden />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--width": "fit-content",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast topesh-toast",
          title: "topesh-toast-title",
          description: "topesh-toast-description",
          icon: "topesh-toast-icon",
          success: "topesh-toast-success",
          error: "topesh-toast-error",
          info: "topesh-toast-info",
          warning: "topesh-toast-info",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
