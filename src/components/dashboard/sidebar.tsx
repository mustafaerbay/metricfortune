"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Star, TrendingUp, Users, Settings, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Recommendations", href: "/dashboard/recommendations", icon: Star },
  {
    name: "Journey Insights",
    href: "/dashboard/journey-insights",
    icon: TrendingUp,
  },
  {
    name: "Peer Benchmarks",
    href: "/dashboard/peer-benchmarks",
    icon: Users,
  },
];

interface SidebarProps {
  businessName?: string;
  userEmail?: string;
}

export function Sidebar({ businessName, userEmail }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <aside className="group flex h-screen w-[80px] flex-col border-r border-[#d1d5db] bg-white transition-all duration-300 hover:w-[260px] lg:w-[260px]">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-[#d1d5db] px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed]">
            <span className="text-lg font-bold text-white">M</span>
          </div>
          <span className="hidden text-lg font-bold text-[#1f2937] group-hover:block lg:block">
            MetricFortune
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#7c3aed] text-white"
                  : "text-[#4b5563] hover:bg-[#faf5ff] hover:text-[#7c3aed]"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden group-hover:block lg:block">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Menu */}
      <div className="border-t border-[#d1d5db] p-4">
        <DropdownMenu
          trigger={
            <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[#faf5ff]">
              <Avatar
                fallback={businessName?.charAt(0) || userEmail?.charAt(0) || "?"}
              />
              <div className="hidden flex-1 text-left group-hover:block lg:block">
                <div className="text-sm font-medium text-[#1f2937]">
                  {businessName || "Business"}
                </div>
                <div className="truncate text-xs text-[#6b7280]">
                  {userEmail || "user@example.com"}
                </div>
              </div>
            </button>
          }
        >
          <Link href="/dashboard/settings">
            <DropdownMenuItem>
              <Settings className="mr-2 inline h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </Link>
          <Link href="/dashboard/business-profile">
            <DropdownMenuItem>
              <Users className="mr-2 inline h-4 w-4" />
              Business Profile
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} destructive>
            <LogOut className="mr-2 inline h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </aside>
  );
}
