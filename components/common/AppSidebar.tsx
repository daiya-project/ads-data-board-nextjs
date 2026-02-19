"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PieChart,
  Target,
  Settings,
  ChevronDown,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navConfig = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Report",
    icon: PieChart,
    children: [
      { href: "/reports/daily", label: "Daily Report" },
      { href: "/reports/weekly", label: "Weekly Report" },
    ],
  },
  {
    label: "Goal",
    icon: Target,
    children: [
      { href: "/goal/monthly", label: "Monthly" },
      { href: "/goal/weekly", label: "Weekly" },
    ],
  },
  {
    label: "Setting",
    icon: Settings,
    children: [
      { href: "/settings/goal-setting", label: "Goal Setting" },
      { href: "/settings/manager-setting", label: "Manager Setting" },
    ],
  },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

function NavGroup({
  label,
  icon: Icon,
  children: childLinks,
  pathname,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: readonly { href: string; label: string }[];
  pathname: string;
}) {
  const isGroupActive = childLinks.some((c) => pathname === c.href);
  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground",
          isGroupActive && "bg-sidebar-accent/50",
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span>{label}</span>
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-70" />
      </div>
      <ul className="ml-4 space-y-1 border-l border-sidebar-border pl-3">
        {childLinks.map((child) => {
          const isActive = pathname === child.href;
          return (
            <li key={child.href}>
              <Link
                href={child.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  isActive
                    ? "font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:text-sidebar-foreground",
                )}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
                {child.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        <BarChart3 className="h-6 w-6 text-sidebar-primary" />
        <span className="font-semibold text-sidebar-foreground">Data Board</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-auto p-3">
        {navConfig.map((item) =>
          "href" in item ? (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={pathname === item.href}
            />
          ) : (
            <NavGroup
              key={item.label}
              label={item.label}
              icon={item.icon}
              children={item.children}
              pathname={pathname}
            />
          ),
        )}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          Update Data
        </button>
      </div>
    </aside>
  );
}
