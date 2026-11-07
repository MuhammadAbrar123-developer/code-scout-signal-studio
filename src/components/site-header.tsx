import { Link } from "@tanstack/react-router";
import { History, LogOut, ShieldCheck, UserRound } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useProfile, useSignOut } from "@/hooks/use-auth";

const navLink =
  "rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground";

export function SiteHeader() {
  const { session, ready } = useAuth();
  const profile = useProfile();
  const signOut = useSignOut();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal text-primary-foreground">
            <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2.5} />
          </span>
          <span className="hidden font-display text-lg font-semibold tracking-tight sm:inline">
            CodeGuard <span className="text-primary">AI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 font-mono text-sm">
          <Link to="/about" className={`${navLink} hidden sm:inline`} activeProps={{ className: "text-foreground" }}>
            ./why
          </Link>
          {session ? (
            <>
              <Link to="/analyze" className={navLink} activeProps={{ className: "text-foreground" }}>
                ./analyze
              </Link>
              <Link to="/history" className={navLink} activeProps={{ className: "text-foreground" }}>
                ./history
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="ml-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <UserAvatar />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="truncate text-sm font-medium">{profile.data?.displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <UserRound /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/history">
                      <History /> Scan history
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => signOut()}>
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            ready && (
              <Button asChild size="sm" variant="hero" className="ml-2 font-sans">
                <Link to="/auth" search={{}}>
                  Sign in
                </Link>
              </Button>
            )
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-8 font-mono text-xs text-muted-foreground sm:flex-row sm:items-center">
        <span>© {new Date().getFullYear()} CodeGuard AI · built by Muhammad Abrar</span>
        <span>
          <span className="text-success">●</span> better, safer, more reliable software
        </span>
      </div>
    </footer>
  );
}
