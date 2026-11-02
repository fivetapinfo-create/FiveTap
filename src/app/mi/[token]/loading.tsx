import { Logo } from "@/components/Logo";
import { PageSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="admin">
      <header className="admin-top">
        <div className="container">
          <Logo size={20} />
        </div>
      </header>
      <PageSkeleton hero panels={3} />
    </div>
  );
}
