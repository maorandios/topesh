import { managerUser, teamLeaders } from "@/data/catalog"

/** Preview role entry until real auth ships. Set NEXT_PUBLIC_DEV_ROLE_SWITCHER=false to show the holding page. */
export const devRoleSwitcherEnabled =
  process.env.NEXT_PUBLIC_DEV_ROLE_SWITCHER !== "false"

export const devManager = managerUser
export const devTeamLeaders = teamLeaders

export const DEV_ROLE_STORAGE_KEY = "work-diary:dev-role"
export const DEV_USER_STORAGE_KEY = "work-diary:dev-user-id"
