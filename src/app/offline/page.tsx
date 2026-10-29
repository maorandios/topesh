import { PlaceholderScreen } from "@/components/shell/placeholder-screen"
import { AppLink } from "@/components/shell/app-link"
import { he } from "@/i18n/he"

export default function OfflinePage() {
  return (
    <PlaceholderScreen title={he.offline.title} body={he.offline.body}>
      <AppLink
        href="/"
        direction="back"
        className="pressable inline-flex min-h-11 items-center self-start rounded-xl border border-border px-4 text-sm"
      >
        {he.offline.home}
      </AppLink>
    </PlaceholderScreen>
  )
}
