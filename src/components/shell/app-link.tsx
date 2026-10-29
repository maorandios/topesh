import Link from "next/link"
import type { ComponentProps } from "react"

type AppLinkProps = ComponentProps<typeof Link> & {
  direction?: "forward" | "back"
}

export function AppLink({
  direction = "forward",
  ...props
}: AppLinkProps) {
  return (
    <Link
      {...props}
      transitionTypes={[direction === "back" ? "nav-back" : "nav-forward"]}
    />
  )
}
