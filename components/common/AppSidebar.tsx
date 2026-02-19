"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  PieChart,
  Target,
  Settings,
  ChevronDown,
  BarChart3,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataUpdateModalStore } from "@/stores/data-update-modal-store";

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

function getGroupContainingPath(pathname: string): string | null {
  for (const item of navConfig) {
    if ("children" in item) {
      if (item.children.some((c) => c.href === pathname)) return item.label;
    }
  }
  return null;
}

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
        "group/link relative flex items-center gap-3.5 overflow-hidden rounded-2xl px-4 py-3 text-[15px] font-medium transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "border border-transparent",
        isActive
          ? "bg-sidebar-item-glass text-sidebar-accent-foreground shadow-sidebar-item [border-color:var(--sidebar-item-border)] scale-[1.02]"
          : "text-sidebar-foreground/90 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground hover:scale-[1.01]",
      )}
    >
      <span
        className={cn(
          "absolute inset-0 -z-10 opacity-0 transition-opacity duration-300",
          "bg-gradient-to-r from-primary/5 to-transparent",
          isActive && "opacity-100",
        )}
      />
      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-all duration-300",
          isActive
            ? "scale-110 text-primary"
            : "opacity-80 group-hover/link:scale-105 group-hover/link:opacity-100",
        )}
      />
      <span className="relative">
        {label}
        <span
          className={cn(
            "absolute -bottom-0.5 left-0 h-px bg-gradient-to-r from-primary/60 to-transparent transition-all duration-300",
            isActive ? "w-full" : "w-0 group-hover/link:w-full",
          )}
        />
      </span>
    </Link>
  );
}

function NavGroup({
  label,
  icon: Icon,
  children: childLinks,
  pathname,
  isExpanded,
  onToggle,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: readonly { href: string; label: string }[];
  pathname: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isGroupActive = childLinks.some((c) => pathname === c.href);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "group/group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl px-4 py-3 text-left text-[15px] font-medium transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "border border-transparent",
          isGroupActive
            ? "bg-sidebar-item-glass text-sidebar-accent-foreground shadow-sidebar-item [border-color:var(--sidebar-item-border)] scale-[1.02]"
            : "text-sidebar-foreground/90 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground hover:scale-[1.01]",
        )}
      >
        <span
          className={cn(
            "absolute inset-0 -z-10 opacity-0 transition-opacity duration-300",
            "bg-gradient-to-r from-primary/5 to-transparent",
            isGroupActive && "opacity-100",
          )}
        />
        <Icon
          className={cn(
            "h-5 w-5 shrink-0 transition-all duration-300",
            isGroupActive
              ? "scale-110 text-primary"
              : "opacity-80 group-hover/group:scale-105 group-hover/group:opacity-100",
          )}
        />
        <span className="relative flex-1">
          {label}
          <span
            className={cn(
              "absolute -bottom-0.5 left-0 h-px bg-gradient-to-r from-primary/60 to-transparent transition-all duration-300",
              isGroupActive ? "w-full" : "w-0 group-hover/group:w-full",
            )}
          />
        </span>
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            isExpanded && "rotate-180",
            isGroupActive && "text-primary",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <ul className="ml-6 space-y-0.5 border-l border-sidebar-border/40 pl-4 pt-2 pb-2">
            {childLinks.map((child) => {
              const isActive = pathname === child.href;
              return (
                <li key={child.href} className="relative">
                  <Link
                    href={child.href}
                    className={cn(
                      "group/sublink relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] transition-all duration-200",
                      isActive
                        ? "font-semibold text-sidebar-accent-foreground"
                        : "font-medium text-sidebar-foreground/75 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/30",
                    )}
                  >
                    <span
                      className={cn(
                        "relative h-2 w-2 shrink-0 rounded-full transition-all duration-200",
                        isActive
                          ? "bg-primary scale-125 shadow-[0_0_8px_rgba(var(--color-primary),0.5)]"
                          : "bg-current opacity-30 scale-100 group-hover/sublink:opacity-60 group-hover/sublink:scale-110",
                      )}
                    >
                      {isActive && (
                        <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-75" />
                      )}
                    </span>
                    <span className="relative">
                      {child.label}
                      {isActive && (
                        <span className="absolute -bottom-0.5 left-0 h-px w-full bg-gradient-to-r from-primary/50 to-transparent" />
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const openDataUpdateModal = useDataUpdateModalStore((s) => s.openModal);

  const [expandedGroup, setExpandedGroup] = useState<string | null>(() =>
    getGroupContainingPath(pathname),
  );

  useEffect(() => {
    const group = getGroupContainingPath(pathname);
    if (group) setExpandedGroup(group);
  }, [pathname]);

  const toggleGroup = useCallback((label: string) => {
    setExpandedGroup((prev) => (prev === label ? null : label));
  }, []);

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-sidebar-border/50",
        "bg-sidebar-glass backdrop-blur-2xl backdrop-saturate-[1.3]",
        "transition-[width,background] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.1)]",
      )}
    >
      <div className="relative flex h-20 shrink-0 items-center gap-3.5 border-b border-sidebar-border/50 px-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
          <BarChart3 className="h-6 w-6 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-sidebar-foreground">
            Ads Dashboard
          </span>
          <span className="text-xs font-medium text-sidebar-foreground/50">
            Data Analytics
          </span>
        </div>
      </div>
      <nav className="flex-1 space-y-1.5 overflow-auto p-4">
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
              isExpanded={expandedGroup === item.label}
              onToggle={() => toggleGroup(item.label)}
            />
          ),
        )}
      </nav>
      <div className="border-t border-sidebar-border/50 p-4">
        <button
          type="button"
          onClick={openDataUpdateModal}
          className="group/update relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-sidebar-border/60 bg-gradient-to-br from-sidebar to-sidebar/80 px-4 py-3.5 text-[15px] font-semibold text-sidebar-foreground shadow-lg shadow-sidebar-border/10 transition-all duration-300 hover:scale-[1.02] hover:border-primary/30 hover:bg-gradient-to-br hover:from-primary/10 hover:to-primary/5 hover:text-primary hover:shadow-xl hover:shadow-primary/10"
        >
          <span className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover/update:opacity-100" />
          <Database className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover/update:scale-110" />
          <span>Update Data</span>
        </button>
      </div>
    </aside>
  );
}
