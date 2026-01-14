# Discovery Audit - Template Feature V1

## Data Model Status
- [x] Organization model exists: yes
- [x] EventType model exists: yes (needs `current_version`, `is_active` fields)
- [x] MilestoneTemplate model exists: yes (needs `template_version_id` field)
- [x] Event model exists: yes (needs `template_version_id` field)
- [x] Milestone model exists: yes (already has `completed_at` for future learning)
- [x] LearnedPattern model exists: yes (can use for future learning)
- [x] AgentAction model exists: yes (includes TEMPLATE_UPDATE action type)
- [ ] Template versioning exists: no (need to add `template_versions` table)

## AI Integration Status
- [x] AI helper function exists: yes (path: `/src/lib/ai.ts`)
- [x] Supabase Edge Function `ai-generate` exists: yes
- [x] Existing AI usage examples: `/src/pages/AITest.tsx`, `/src/components/AITestComponent.tsx`

## Existing Patterns (USE THESE)
- UI Framework: Vite + React 18 + TypeScript
- Component library: shadcn/ui (Radix primitives + Tailwind)
- Routing: React Router v6 (`/src/pages/*.tsx`, routes in `/src/App.tsx`)
- State management: TanStack React Query v5
- Settings page pattern: none exists yet (will create)
- List component pattern: `/src/pages/Events.tsx` (grid of cards)
- Detail page pattern: `/src/pages/EventDetail.tsx`
- Modal/dialog pattern: `/src/components/events/EditEventDialog.tsx`
- Form pattern: `/src/pages/NewEvent.tsx`
- Chat UI pattern: none (will create simple pattern)
- AI integration pattern: `/src/lib/ai.ts` + `/src/components/AITestComponent.tsx`
- Button styles: `/src/components/ui/button.tsx`
- Card components: `/src/components/ui/card.tsx`
- Loading states: `Loader2` from lucide-react with `animate-spin`

## Key File Locations
- Database schema: `/supabase/migrations/*.sql`
- Database types (auto-generated): `/src/integrations/supabase/types.ts`
- Database types (manual): `/src/types/database.ts`
- API: Direct Supabase client calls (no API routes)
- UI components: `/src/components/`
- Pages/routes: `/src/pages/`, routes defined in `/src/App.tsx`
- AI helper: `/src/lib/ai.ts`
- Supabase client: `/src/integrations/supabase/client.ts`
- Hooks: `/src/hooks/`
- Auth context: `/src/contexts/AuthContext.tsx`
- Sidebar navigation: `/src/components/layout/AppSidebar.tsx`

## Architecture Decisions for V1

### Data Operations
- Use direct Supabase client calls (not API routes)
- Follow existing hook patterns (React Query)
- Example: see `useEvents.ts`, `useEventTypes.ts`

### Schema Changes
- Add `template_versions` table for versioning
- Add `current_version` and `is_active` to `event_types`
- Add `template_version_id` to `milestone_templates` and `events`
- Write SQL migrations (not Prisma)

### Testing
- Framework: Vitest with jsdom
- Setup: `/src/test/setup.ts`
- Pattern: `/src/test/example.test.ts`

## V1 Simplified Scope

### What We're Building
1. Template list page (`/templates`)
2. Template detail page (`/templates/:id`)
3. Template creation with single-shot AI generation
4. Event creation from template (copy milestones)
5. Manual "Update template from event" button

### What We're NOT Building (V2)
- Multi-turn chat refinement
- AI adjustment during event creation
- Automated post-event analysis
- Version history UI
- System templates
- Confidence scoring

## Assumptions
1. All org members can view/create/edit templates (no role restrictions for V1)
2. Template names must be unique per organization
3. Deleting a template soft-deletes (sets `is_active: false`)
4. Events keep reference to template version even after template changes
5. No concurrent editing protection for V1
