import { managerUser, teamLeaders } from "@/data/catalog"

export const devRoleSwitcherEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_DEV_ROLE_SWITCHER === "true"

export const devManager = managerUser
export const devTeamLeaders = teamLeaders

export const DEV_ROLE_STORAGE_KEY = "work-diary:dev-role"
export const DEV_USER_STORAGE_KEY = "work-diary:dev-user-id"
