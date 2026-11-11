import { Link } from "@tanstack/react-router";
import { Activity, History, KeyRound, LogOut, Lock, ShieldCheck, UserRound } from "lucide-react";

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
  "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
const navActive = { className: "bg-secondary text-foreground" };

export function SiteHeader() {
  const { session, ready } = useAuth();
  const profile = useProfile();
  const signOut = useSignOut();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal text-primary-foreground shadow-glow">
            <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="hidden font-display text-lg font-semibold tracking-tight sm:inline">
            CodeGuard <span className="text-primary">AI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/about" className={`${navLink} hidden md:inline-flex`} activeProps={navActive}>
            Our story
          </Link>
          {session ? (
            <>
              <Link to="/analyze" className={navLink} activeProps={navActive}>
                Analyze
              </Link>
              <Link to="/history" className={navLink} activeProps={navActive}>
                History
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Account menu"
                  className="ml-2 rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <UserAvatar className="h-9 w-9" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
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
                  <DropdownMenuItem asChild>
                    <Link to="/settings/providers">
                      <KeyRound /> AI Providers
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/privacy">
                      <Lock /> Privacy &amp; data
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/security">
                      <Activity /> Security activity
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
              <Button asChild size="sm" variant="hero" className="ml-2 h-9 px-4">
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
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <span>© {new Date().getFullYear()} CodeGuard AI · Built by Muhammad Abrar</span>
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Better, safer, more reliable software
        </span>
      </div>
    </footer>
  );
}
