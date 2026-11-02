import { appIcon } from "@/lib/app-icon";

export const dynamic = "force-static";

// Small monochrome icon Android shows in the status bar.
export function GET() {
  return appIcon(96, { badge: true });
}
