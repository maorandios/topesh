"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"

export type AnimatedListItem = {
  id: string
  label: string
}

export function AnimatedList({
  items,
  onRemove,
  removeLabel,
}: {
  items: AnimatedListItem[]
  onRemove: (id: string) => void
  removeLabel: string
}) {
  const reduce = useReducedMotion()

  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.li
            key={item.id}
            layout
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2"
          >
            <span className="text-sm">{item.label}</span>
            <button
              type="button"
              className="pressable min-h-11 rounded-lg px-3 text-sm text-muted-foreground"
              onClick={() => onRemove(item.id)}
            >
              {removeLabel}
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
