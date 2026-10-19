import { Suspense } from "react";
import HeaderRole from "@/components/HeaderRole";

function HeaderFallback() {
  return (
    <header
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-50 h-[76px] border-b border-gray-200 bg-white/95"
    />
  );
}
export default function Header() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <HeaderRole />
    </Suspense>
  );
}
