"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/activities", label: "Activities" },
  { href: "/voting", label: "Voting" },
  { href: "/program", label: "Program" },
  { href: "/profile", label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/60 bg-[var(--surface)]/95 backdrop-blur">
      <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-2 px-4 pb-4 pt-3">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                "min-h-12 rounded-full px-2 py-3 text-center text-xs font-semibold",
                active
                  ? "bg-[var(--light-purple)] text-[var(--text-main)]"
                  : "bg-[var(--bg-main)] text-[var(--text-soft)]",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
