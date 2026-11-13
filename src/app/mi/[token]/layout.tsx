import { IntroSplash } from "@/components/IntroSplash";

/** FiveTap Business opens with its animation, once per session. */
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IntroSplash variant="business" />
      {children}
    </>
  );
}
