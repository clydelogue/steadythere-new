# SteadyThere Project Context

## Overview
SteadyThere is an event planning SaaS application built with React, TypeScript, Vite, and Supabase.

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **State**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Backend**: Supabase (auth, database, edge functions)
- **Deployment**: Vercel (auto-deploy from main branch)

## Routing Structure
Standard SaaS routing pattern:

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Public landing page | No |
| `/login` | Sign in page | No |
| `/signup` | Sign up page | No |
| `/onboarding` | New user onboarding | Yes |
| `/join/:token` | Invitation acceptance | No (creates account) |
| `/app` | Dashboard (home) | Yes |
| `/app/events` | Events list | Yes |
| `/app/events/new` | Create event | Yes |
| `/app/events/:id` | Event detail | Yes |
| `/app/templates` | Templates list | Yes |
| `/app/templates/new` | Create template | Yes |
| `/app/templates/:id` | Template detail | Yes |
| `/app/templates/:id/edit` | Edit template | Yes |
| `/app/settings/*` | Settings pages | Yes |

## Key Directories
- `src/pages/` - Page components (route destinations)
- `src/components/` - Reusable UI components
- `src/components/ui/` - shadcn/ui primitives
- `src/hooks/` - Custom React hooks (data fetching, etc.)
- `src/contexts/` - React contexts (AuthContext, etc.)
- `src/lib/` - Utilities, Supabase client, permissions
- `src/types/` - TypeScript type definitions
- `supabase/` - Migrations and edge functions

## Commands
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm test` - Run tests
- `npm run lint` - ESLint

## Vercel
- Project: `steadythere-new`
- Auto-deploys from `main` branch
- Environment variables configured in Vercel dashboard
