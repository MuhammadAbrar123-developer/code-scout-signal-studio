import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function UserAvatar({ className }: { className?: string }) {
  const { data } = useProfile();
  const initials = (data?.displayName ?? "?")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <Avatar className={cn("h-8 w-8 border border-border", className)}>
      {data?.avatarSrc && <AvatarImage src={data.avatarSrc} alt="" />}
      <AvatarFallback className="bg-secondary font-display text-primary">{initials}</AvatarFallback>
    </Avatar>
  );
}
