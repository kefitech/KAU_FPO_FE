import type { FpoRedirect } from "@/types/auth";

export function resolvePostLoginPath(redirect: FpoRedirect | null, firstMenuPath?: string): string {
  if (!redirect) return firstMenuPath ?? "/admin/dashboard";
  switch (redirect.stage) {
    case "wizard_step":
      return redirect.step ? `/fpo/register?step=${redirect.step}` : "/fpo/register";
    case "verify_email":
    case "verify_phone":
    case "upload_documents":
    case "submit":
      return "/fpo/register";
    case "status":
      return "/fpo/status";
    case "dashboard":
      return "/fpo/dashboard";
    default:
      return "/dashboard";
  }
}
