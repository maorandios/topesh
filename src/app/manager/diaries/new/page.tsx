import { redirect } from "next/navigation"

/** Deep-link / desktop-compatible create entry. Mobile create uses the global sheet. */
export default function NewDiaryPage() {
  redirect("/manager?create=1")
}
