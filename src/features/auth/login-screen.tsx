"use client"

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import {
  ArrowRight,
  Flame,
  IdCard,
  KeyRound,
  Mail,
  ShieldCheck,
  ShieldUser,
  UserRound,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { devRoleSwitcherEnabled } from "@/features/dev-role/users"
import { he } from "@/i18n/he"
import { cn } from "cn"

type AuthRole = "manager" | "teamLeader"
type AuthStep = "main" | "otp"

const OTP_LENGTH = 6
const fieldClass =
  "h-12 w-full rounded-xl border-border bg-card/80 ps-3 pe-11 text-end text-base shadow-none md:text-base"

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function isValidIdentity(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits.length >= 8 && digits.length <= 9
}

export function LoginScreen() {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [role, setRole] = useState<AuthRole>("manager")
  const [step, setStep] = useState<AuthStep>("main")
  const [email, setEmail] = useState("")
  const [identity, setIdentity] = useState("")
  const [otp, setOtp] = useState<string[]>(() => Array.from({ length: OTP_LENGTH }, () => ""))
  const [error, setError] = useState<string | null>(null)
  const year = new Date().getFullYear()

  const goMain = () => {
    setStep("main")
    setOtp(Array.from({ length: OTP_LENGTH }, () => ""))
    setError(null)
  }

  const onManagerContinue = (event: FormEvent) => {
    event.preventDefault()
    const value = email.trim()
    if (!value) {
      setError(he.auth.emailRequired)
      return
    }
    if (!isValidEmail(value)) {
      setError(he.auth.emailInvalid)
      return
    }
    setError(null)
    setStep("otp")
  }

  const onLeaderSignIn = (event: FormEvent) => {
    event.preventDefault()
    const value = identity.trim()
    if (!value) {
      setError(he.auth.identityRequired)
      return
    }
    if (!isValidIdentity(value)) {
      setError(he.auth.identityInvalid)
      return
    }
    setError(null)
    // UI only — auth wiring comes later.
  }

  const onOtpVerify = (event: FormEvent) => {
    event.preventDefault()
    if (otp.join("").length !== OTP_LENGTH) {
      setError(he.auth.otpIncomplete)
      return
    }
    setError(null)
    // UI only — Supabase OTP verification comes later.
  }

  return (
    <div className="relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(255_51_0_/0.14),transparent_55%),radial-gradient(ellipse_at_bottom,rgb(255_51_0_/0.06),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 to-transparent"
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        <AnimatePresence mode="wait" initial={false}>
          {step === "main" ? (
            <motion.div
              key="main"
              className="flex min-h-0 flex-1 flex-col"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex min-h-0 flex-1 flex-col justify-center gap-8">
                <BrandHeader />
                <div className="flex flex-col gap-6">
                  <RolePicker
                    role={role}
                    onChange={(next) => {
                      setRole(next)
                      setError(null)
                    }}
                  />

                  <AnimatePresence mode="wait" initial={false}>
                    {role === "manager" ? (
                      <motion.form
                        key="manager-form"
                        className="flex flex-col gap-4"
                        onSubmit={onManagerContinue}
                        initial={reduce ? false : { opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reduce ? undefined : { opacity: 0, x: -10 }}
                        transition={{ duration: 0.22 }}
                      >
                        <Field
                          id="login-email"
                          label={he.auth.email}
                          icon={Mail}
                          hint={he.auth.managerHint}
                        >
                          <Input
                            id="login-email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            dir="ltr"
                            value={email}
                            placeholder={he.auth.emailPlaceholder}
                            className={fieldClass}
                            aria-invalid={Boolean(error)}
                            onChange={(event) => {
                              setEmail(event.target.value)
                              setError(null)
                            }}
                          />
                        </Field>
                        {error ? <ErrorText>{error}</ErrorText> : null}
                        <Button type="submit" size="touch" className="h-12 w-full gap-2 rounded-xl text-base">
                          {he.auth.continue}
                          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
                        </Button>
                      </motion.form>
                    ) : (
                      <motion.form
                        key="leader-form"
                        className="flex flex-col gap-4"
                        onSubmit={onLeaderSignIn}
                        initial={reduce ? false : { opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reduce ? undefined : { opacity: 0, x: -10 }}
                        transition={{ duration: 0.22 }}
                      >
                        <Field
                          id="login-identity"
                          label={he.auth.identity}
                          icon={IdCard}
                          hint={he.auth.teamLeaderHint}
                        >
                          <Input
                            id="login-identity"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            dir="ltr"
                            value={identity}
                            placeholder={he.auth.identityPlaceholder}
                            className={fieldClass}
                            aria-invalid={Boolean(error)}
                            onChange={(event) => {
                              setIdentity(event.target.value.replace(/\D/g, "").slice(0, 9))
                              setError(null)
                            }}
                          />
                        </Field>
                        {error ? <ErrorText>{error}</ErrorText> : null}
                        <Button type="submit" size="touch" className="h-12 w-full gap-2 rounded-xl text-base">
                          {he.auth.signIn}
                          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
                        </Button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <LoginFooter year={year} onDev={() => router.push("/dev")} />
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              className="flex min-h-0 flex-1 flex-col"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                  <Flame className="size-4" aria-hidden />
                  {he.appName}
                </div>
                <button
                  type="button"
                  className="pressable inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  onClick={goMain}
                >
                  {he.auth.back}
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
                </button>
              </div>

              <div className="mt-6 flex min-h-0 flex-1 flex-col justify-center gap-6">
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="inline-flex size-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[0_0_32px_rgb(255_51_0_/0.18)]">
                    <ShieldCheck className="size-7" aria-hidden />
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <h1 className="text-2xl font-semibold tracking-tight">{he.auth.otpTitle}</h1>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {he.auth.otpBody}
                      <br />
                      <span dir="ltr" className="font-medium text-foreground">
                        {email.trim()}
                      </span>
                    </p>
                  </div>
                </div>

                <form className="flex flex-col gap-5" onSubmit={onOtpVerify}>
                  <div className="flex flex-col gap-2">
                    <p className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <KeyRound className="size-3.5" aria-hidden />
                      {he.auth.otpLabel}
                    </p>
                    <OtpInputs
                      value={otp}
                      onChange={(next) => {
                        setOtp(next)
                        setError(null)
                      }}
                    />
                  </div>
                  {error ? <ErrorText className="text-center">{error}</ErrorText> : null}
                  <Button type="submit" size="touch" className="h-12 w-full rounded-xl text-base">
                    {he.auth.otpVerify}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    {he.auth.otpResendHint}{" "}
                    <button
                      type="button"
                      className="pressable font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {he.auth.otpResend}
                    </button>
                  </p>
                </form>
              </div>
              <LoginFooter year={year} onDev={() => router.push("/dev")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function BrandHeader() {
  return (
    <header className="flex flex-col items-center gap-4 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-[0_12px_40px_rgb(255_51_0_/0.22)]">
        <Flame className="size-8" aria-hidden />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
          {he.appName}
        </h1>
        <p className="text-sm text-muted-foreground">{he.auth.tagline}</p>
      </div>
    </header>
  )
}

function RolePicker({
  role,
  onChange,
}: {
  role: AuthRole
  onChange: (role: AuthRole) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={he.auth.chooseRole}
      className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card/70 p-1.5"
    >
      <RoleOption
        pressed={role === "manager"}
        icon={ShieldUser}
        label={he.auth.manager}
        onClick={() => onChange("manager")}
      />
      <RoleOption
        pressed={role === "teamLeader"}
        icon={UserRound}
        label={he.auth.teamLeader}
        onClick={() => onChange("teamLeader")}
      />
    </div>
  )
}

function RoleOption({
  pressed,
  icon: Icon,
  label,
  onClick,
}: {
  pressed: boolean
  icon: typeof ShieldUser
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={pressed}
      className={cn(
        "pressable flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-xl px-2 text-sm transition-colors",
        pressed
          ? "bg-primary text-primary-foreground shadow-[0_8px_24px_rgb(255_51_0_/0.28)]"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
      onClick={onClick}
    >
      <Icon className="size-[1.125rem]" aria-hidden />
      <span className="font-medium">{label}</span>
    </button>
  )
}

function Field({
  id,
  label,
  hint,
  icon: Icon,
  children,
}: {
  id: string
  label: string
  hint: string
  icon: typeof Mail
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        {children}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function ErrorText({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <p className={cn("text-sm text-destructive", className)}>{children}</p>
}

function OtpInputs({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const baseId = useId()
  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  const setDigit = (index: number, digit: string) => {
    const next = [...value]
    next[index] = digit
    onChange(next)
  }

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH)
    if (!digits) return
    const next = Array.from({ length: OTP_LENGTH }, (_, i) => digits[i] ?? "")
    onChange(next)
    const focusIndex = Math.min(digits.length, OTP_LENGTH - 1)
    refs.current[focusIndex]?.focus()
  }

  return (
    <div className="flex justify-center gap-2" dir="ltr" role="group" aria-label={he.auth.otpLabel}>
      {value.map((digit, index) => (
        <input
          key={`${baseId}-${index}`}
          ref={(node) => {
            refs.current[index] = node
          }}
          id={`${baseId}-${index}`}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          aria-label={`${he.auth.otpLabel} ${index + 1}`}
          className={cn(
            "h-12 w-11 rounded-xl border border-border bg-card text-center text-lg font-semibold tabular-nums text-foreground shadow-none outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          )}
          onChange={(event) => {
            const nextDigit = event.target.value.replace(/\D/g, "").slice(-1)
            setDigit(index, nextDigit)
            if (nextDigit && index < OTP_LENGTH - 1) {
              refs.current[index + 1]?.focus()
            }
          }}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Backspace" && !value[index] && index > 0) {
              refs.current[index - 1]?.focus()
            }
            if (event.key === "ArrowLeft" && index > 0) {
              event.preventDefault()
              refs.current[index - 1]?.focus()
            }
            if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
              event.preventDefault()
              refs.current[index + 1]?.focus()
            }
          }}
          onPaste={onPaste}
        />
      ))}
    </div>
  )
}

function LoginFooter({ year, onDev }: { year: number; onDev: () => void }) {
  return (
    <footer className="mt-auto flex flex-col items-center gap-1.5 pt-6 pb-1 text-center">
      <div className="h-px w-16 bg-gradient-to-l from-transparent via-border to-transparent" />
      <p className="text-xs font-medium text-muted-foreground">{he.auth.footer}</p>
      <p className="text-[11px] text-muted-foreground/80">
        © {year} · {he.auth.footerRights}
      </p>
      {devRoleSwitcherEnabled ? (
        <button
          type="button"
          className="pressable mt-1 text-[11px] text-muted-foreground/70 underline-offset-2 hover:text-muted-foreground hover:underline"
          onClick={onDev}
        >
          {he.auth.devEntry}
        </button>
      ) : null}
    </footer>
  )
}
