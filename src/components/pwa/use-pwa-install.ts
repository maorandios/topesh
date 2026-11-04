"use client"

import { useEffect, useSyncExternalStore } from "react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
}

type InstallState = {
  installed: boolean
  ios: boolean
  promptEvent: BeforeInstallPromptEvent | null
}

const listeners = new Set<() => void>()

let state: InstallState = {
  installed: false,
  ios: false,
  promptEvent: null,
}

let listening = false

function emit() {
  for (const listener of listeners) listener()
}

function readInstalled() {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(display-mode: standalone)").matches) return true
  return Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  )
}

function readIos() {
  if (typeof window === "undefined") return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function getSnapshot(): InstallState {
  return state
}

function getServerSnapshot(): InstallState {
  return { installed: false, ios: false, promptEvent: null }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  ensureListening()
  return () => {
    listeners.delete(listener)
  }
}

function ensureListening() {
  if (listening || typeof window === "undefined") return
  listening = true

  state = {
    installed: readInstalled(),
    ios: readIos(),
    promptEvent: null,
  }

  const onPrompt = (event: Event) => {
    event.preventDefault()
    state = {
      ...state,
      installed: readInstalled(),
      promptEvent: event as BeforeInstallPromptEvent,
    }
    emit()
  }

  const onInstalled = () => {
    state = { installed: true, ios: state.ios, promptEvent: null }
    emit()
  }

  const onDisplayMode = () => {
    const installed = readInstalled()
    state = {
      ...state,
      installed,
      promptEvent: installed ? null : state.promptEvent,
    }
    emit()
  }

  window.addEventListener("beforeinstallprompt", onPrompt)
  window.addEventListener("appinstalled", onInstalled)
  window.matchMedia("(display-mode: standalone)").addEventListener("change", onDisplayMode)
  emit()
}

/** Mount once near the app root so beforeinstallprompt is never missed. */
export function PwaInstallListener() {
  useEffect(() => {
    ensureListening()
  }, [])
  return null
}

export function usePwaInstall() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const promptInstall = async () => {
    const event = state.promptEvent
    if (!event) return
    await event.prompt()
    state = { ...state, promptEvent: null, installed: readInstalled() }
    emit()
  }

  const canInstallAndroid = Boolean(snapshot.promptEvent) && !snapshot.installed
  const canInstallIos = snapshot.ios && !snapshot.installed
  const showInstall = canInstallAndroid || canInstallIos

  return {
    installed: snapshot.installed,
    canInstallAndroid,
    canInstallIos,
    showInstall,
    promptInstall,
  }
}
