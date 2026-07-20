"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import PageTransition from "./PageTransition";

/**
 * Session pages build their own consolidated top bar (SessionTopBar) that
 * already carries everything the global Navbar provides -- rendering both
 * would duplicate nav links and stack two chrome bars. Every other route
 * keeps the global Navbar + its pt-16 offset exactly as before.
 */
export default function RootChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSessionRoute = pathname?.startsWith("/session/");

  if (isSessionRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <div className="pt-16">
        <PageTransition>{children}</PageTransition>
      </div>
    </>
  );
}
