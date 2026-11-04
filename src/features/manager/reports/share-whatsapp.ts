const WHATSAPP_MESSAGE = 'היי, מצ"ב יומני עבודה'

export function whatsappSendUrl(message = WHATSAPP_MESSAGE) {
  // web.whatsapp.com works on desktop; api.whatsapp.com deep-links the app on phones.
  const mobileUa = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  const base = mobileUa ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send"
  return `${base}?text=${encodeURIComponent(message)}`
}

function hasRealTouch() {
  return navigator.maxTouchPoints > 0 || "ontouchstart" in window
}

/**
 * Native file share only on real touch devices.
 * Chrome DevTools "mobile" mode spoofs the UA but usually has no touch points —
 * treating it as desktop avoids a false navigator.share path that never opens WhatsApp.
 */
export function canShareFilesWithWhatsApp() {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function" ||
    !hasRealTouch()
  ) {
    return false
  }
  try {
    const probe = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "probe.pdf", {
      type: "application/pdf",
    })
    return navigator.canShare({ files: [probe], text: WHATSAPP_MESSAGE })
  } catch {
    return false
  }
}

/**
 * Open WhatsApp with the prefilled message.
 * Must run synchronously inside the click handler (before any await).
 */
export function openWhatsAppChat(message = WHATSAPP_MESSAGE) {
  const url = whatsappSendUrl(message)
  const opened = window.open(url, "_blank")
  if (opened) return
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.target = "_blank"
  anchor.rel = "noopener noreferrer"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

export function downloadShareFile(file: File) {
  const url = URL.createObjectURL(file)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = file.name
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export async function shareFileNative(file: File, message = WHATSAPP_MESSAGE) {
  await navigator.share({ files: [file], text: message, title: message })
}

export { WHATSAPP_MESSAGE }
