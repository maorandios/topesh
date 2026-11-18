"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "cn"

type Point = { x: number; y: number }

const INK_LIGHT = "#111827"
const INK_DARK = "#fb923c" // orange-400 — visible on dark pad

function inkColor() {
  if (typeof document === "undefined") return INK_LIGHT
  return document.documentElement.classList.contains("dark") ? INK_DARK : INK_LIGHT
}

function configureStroke(ctx: CanvasRenderingContext2D, ratio: number) {
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.strokeStyle = inkColor()
  ctx.lineWidth = 2.25
}

function clearPad(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, ratio: number) {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.restore()
  configureStroke(ctx, ratio)
}

export function SignaturePad({
  className,
  ariaLabel,
  clearLabel,
  initialDataUrl = null,
  onChange,
}: {
  className?: string
  ariaLabel: string
  clearLabel: string
  initialDataUrl?: string | null
  onChange: (dataUrl: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastRef = useRef<Point | null>(null)
  const inkRef = useRef(Boolean(initialDataUrl))
  const [hasInk, setHasInk] = useState(Boolean(initialDataUrl))

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return

    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const width = parent.clientWidth
      const height = parent.clientHeight
      const previous = inkRef.current ? canvas.toDataURL("image/png") : null
      canvas.width = Math.max(1, Math.floor(width * ratio))
      canvas.height = Math.max(1, Math.floor(height * ratio))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      clearPad(ctx, canvas, ratio)
      const source = previous || initialDataUrl
      if (!source || !inkRef.current) return
      const image = new Image()
      image.onload = () => {
        ctx.drawImage(image, 0, 0, width, height)
        configureStroke(ctx, ratio)
      }
      image.src = source
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(parent)

    const themeObserver = new MutationObserver(() => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      configureStroke(ctx, window.devicePixelRatio || 1)
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => {
      observer.disconnect()
      themeObserver.disconnect()
    }
  }, [initialDataUrl])

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const emit = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    inkRef.current = true
    setHasInk(true)
    onChange(canvas.toDataURL("image/png"))
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const ratio = window.devicePixelRatio || 1
    clearPad(ctx, canvas, ratio)
    inkRef.current = false
    setHasInk(false)
    onChange(null)
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative h-40 w-full overflow-hidden rounded-md border border-input bg-card touch-none">
        <canvas
          ref={canvasRef}
          aria-label={ariaLabel}
          className="absolute inset-0 h-full w-full cursor-crosshair"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            drawingRef.current = true
            lastRef.current = pointFromEvent(event)
          }}
          onPointerMove={(event) => {
            if (!drawingRef.current || !lastRef.current) return
            const canvas = canvasRef.current
            const ctx = canvas?.getContext("2d")
            if (!canvas || !ctx) return
            const next = pointFromEvent(event)
            ctx.beginPath()
            ctx.moveTo(lastRef.current.x, lastRef.current.y)
            ctx.lineTo(next.x, next.y)
            ctx.stroke()
            lastRef.current = next
          }}
          onPointerUp={() => {
            if (!drawingRef.current) return
            drawingRef.current = false
            lastRef.current = null
            emit()
          }}
          onPointerCancel={() => {
            drawingRef.current = false
            lastRef.current = null
          }}
        />
      </div>
      <button
        type="button"
        className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-40"
        disabled={!hasInk}
        onClick={clear}
      >
        {clearLabel}
      </button>
    </div>
  )
}
