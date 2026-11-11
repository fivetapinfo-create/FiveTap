import { Landing } from "@/components/Landing";
import { HOME } from "@/lib/verticals";

// Rebuilt every 5 minutes (and at once when a plan is edited in the panel).
export const revalidate = 300;

export default function Home() {
  return <Landing vertical={HOME} />;
}
