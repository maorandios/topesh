import type { ReactNode } from "react"

export function BidiText({ children }: { children: ReactNode }) {
  return (
    <bdi dir="ltr" className="bidi-isolate inline-block">
      {children}
    </bdi>
  )
}
