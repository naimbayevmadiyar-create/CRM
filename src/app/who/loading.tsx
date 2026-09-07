import { SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-md p-6">
      <SkeletonPage rows={3} rowHeight="h-16" />
    </main>
  );
}
