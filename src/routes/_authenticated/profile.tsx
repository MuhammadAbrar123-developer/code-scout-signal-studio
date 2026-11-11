import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileQueryKey, useAuth, useProfile } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — CodeGuard AI" },
      { name: "description", content: "Update your CodeGuard AI display name and avatar." },
      { property: "og:title", content: "Your profile — CodeGuard AI" },
      { property: "og:description", content: "Update your display name and avatar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function ProfilePage() {
  const { session } = useAuth();
  const profile = useProfile();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const userId = session?.user.id;

  useEffect(() => {
    if (profile.data) setName(profile.data.displayName);
  }, [profile.data]);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const trimmed = name.trim().slice(0, 60);
    if (!trimmed) { toast.error("Display name can't be empty."); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ id: userId, display_name: trimmed });
    setSaving(false);
    if (error) { toast.error("Couldn't save your name."); return; }
    queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
    toast.success("Profile saved.");
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    if (!ALLOWED.includes(file.type)) { toast.error("Use a PNG, JPG, WebP or GIF image."); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2 MB."); return; }

    setUploading(true);
    const ext = file.type.split("/")[1];
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setUploading(false);
      { toast.error("Upload failed."); return; }
    }
    const old = profile.data?.avatarPath;
    const { error } = await supabase.from("profiles").upsert({ id: userId, avatar_url: path });
    if (!error && old && !/^https?:\/\//.test(old)) {
      await supabase.storage.from("avatars").remove([old]);
    }
    setUploading(false);
    if (error) { toast.error("Couldn't update your avatar."); return; }
    queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
    toast.success("Avatar updated.");
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-12">
      <PageHeader eyebrow="Account" title="Your profile" description="How you appear in CodeGuard AI." />

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <UserAvatar className="h-20 w-20 text-2xl" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Change avatar"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-foreground hover:bg-surface"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={fileRef} type="file" accept={ALLOWED.join(",")} className="hidden" onChange={onFile} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold">{profile.data?.displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{session?.user.email}</p>
          </div>
        </div>

        <form onSubmit={saveName} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button type="submit" variant="hero" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </div>
    </section>
  );
}
