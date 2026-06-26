# Kanban Task Manager

A Next.js full-stack Kanban app with authentication, board/list/card CRUD, drag-and-drop card movement, and persistent ordering. It runs against Supabase when credentials are provided, and falls back to local demo persistence when they are not.

## Features

- Email/password authentication via Supabase Auth, with a no-credential demo mode for hosted portfolio previews.
- Multiple user boards with default `To do`, `Doing`, and `Done` columns.
- Column create, rename, and delete.
- Card create, edit, delete, labels, descriptions, and due dates.
- Cross-column drag and drop with `@dnd-kit`, optimistic UI, and saved `position` values.
- Supabase Postgres schema with RLS policies that scope boards, lists, and cards to the signed-in user.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- Supabase Auth and Postgres
- dnd-kit
- lucide-react

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Without Supabase environment variables, the app uses localStorage so the complete Kanban flow works in a public demo.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Set:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. Restart the dev server.

## Database Model

```text
auth.users
  └─ boards.user_id
       └─ lists.board_id
            └─ cards.list_id
```

`boards`, `lists`, and `cards` all have RLS enabled. Boards are owned directly by `user_id`; list and card policies resolve ownership through the parent board. `lists.position` and `cards.position` preserve ordering.

## Deployment

Deploy to Vercel or another Next.js host. For a real multi-user deployment, configure the two public Supabase variables in the hosting environment. The portfolio demo can be deployed without them and still demonstrates the full workflow with browser-local persistence.
