import { appIcon } from "@/lib/app-icon";

// iPhone home-screen icon for the venue's app: white, unlike the founder's black one.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return appIcon(180, { owner: true });
}
