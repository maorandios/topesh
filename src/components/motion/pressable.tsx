"use client"

import { motion, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"

export function Pressable({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={className}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.12 }}
    >
      {children}
    </motion.div>
  )
}
