import { Suspense } from "react";
import TeamDetail from "@/components/teams/TeamDetail";
import Skeleton from "@/components/ui/Skeleton";

export const metadata = { title: "Team · IVP Pickleball 2026" };

// Team codes are fixed (T01–T10), so these pages are prebuilt. The client
// component renders the live data for the code it is given.
export function generateStaticParams() {
  return Array.from({ length: 10 }, (_, i) => ({ code: `T${String(i + 1).padStart(2, "0")}` }));
}

async function TeamFromParams({ params }) {
  const { code } = await params;
  return <TeamDetail code={code} />;
}

export default function TeamPage({ params }) {
  return (
    <Suspense fallback={<Skeleton rows={4} className="h-28" />}>
      <TeamFromParams params={params} />
    </Suspense>
  );
}
