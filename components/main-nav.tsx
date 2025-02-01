"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Terminal, Settings, HelpCircle, Home, MessageSquare, Bell } from "lucide-react"

export function MainNav() {
  const pathname = usePathname()

  return (
    <div className="mr-4 hidden md:flex">
      <Link href="/" className="mr-6 flex items-center space-x-2">
        <Terminal className="h-6 w-6" />
        <span className="hidden font-bold sm:inline-block">
          Node Speak
        </span>
      </Link>
      <nav className="flex items-center space-x-6 text-sm font-medium">
        <Link
          href="/dashboard"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname === "/dashboard" ? "text-foreground" : "text-foreground/60"
          )}
        >
          <div className="flex items-center space-x-2">
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </div>
        </Link>
        <Link
          href="/discussions"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname === "/discussions" ? "text-foreground" : "text-foreground/60"
          )}
        >
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Discussions</span>
          </div>
        </Link>
        <Link
          href="/notifications"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname === "/notifications" ? "text-foreground" : "text-foreground/60"
          )}
        >
          <div className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </div>
        </Link>
        <Link
          href="/settings"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname === "/settings" ? "text-foreground" : "text-foreground/60"
          )}
        >
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </div>
        </Link>
        <Link
          href="/help"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname === "/help" ? "text-foreground" : "text-foreground/60"
          )}
        >
          <div className="flex items-center space-x-2">
            <HelpCircle className="h-4 w-4" />
            <span>Help</span>
          </div>
        </Link>
      </nav>
    </div>
  )
}