import { redirect } from "next/navigation"

/** Settings opens as a side panel from the nav; no dedicated desktop page. */
export default function LeaderSettingsPage() {
  redirect("/leader")
}
