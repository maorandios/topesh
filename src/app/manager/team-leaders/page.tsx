import { redirect } from "next/navigation"

export default function TeamLeadersPage() {
  redirect("/manager/organization?tab=teamLeaders")
}
