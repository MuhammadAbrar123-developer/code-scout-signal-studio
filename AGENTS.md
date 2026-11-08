<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Shared site header/footer live in `src/components/site-header.tsx` and wrap `<Outlet />` in `src/routes/__root.tsx`; each content section is its own route file so it gets its own head metadata.
- All colors, gradients and glows are tokens/utilities in `src/styles.css`; components use only those, never raw color classes.
- AI calls live only in `src/lib/ai/*.server.ts` (Lovable AI Gateway, Responses API, structured output); `src/lib/*.functions.ts` server functions wrap them with `requireSupabaseAuth`, input limits and consent checks, and load server modules via dynamic import inside the handler — keeps keys and prompts off the client.
- Submitted code is untrusted: it is wrapped in `<untrusted_code>` tags with line numbers, AI output is rendered as plain text only and never executed.
- Rate limits are enforced server-side by counting rows in `ai_usage_logs`, which users can insert into but never update or delete — so deleting reports can't reset the limit.
- Signed-in pages live under `src/routes/_authenticated/` (client-only gate redirecting to `/auth`); browser reads use the RLS-scoped client, every user table has owner-only RLS.
- Avatars live in a private `avatars` bucket under `<user_id>/`; display via short-lived signed URLs (public buckets are blocked in this workspace).
