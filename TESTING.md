# Template Feature V1 - Manual Testing Checklist

## Prerequisites
- [ ] Supabase migration has been applied
- [ ] User is logged in with an organization

## 1. Template List Page (`/templates`)

### Empty State
- [ ] Shows "No templates yet" message when no templates exist
- [ ] "Create Your First Template" button links to `/templates/new`

### With Templates
- [ ] Templates are displayed in a grid
- [ ] Each template shows: name, version badge, milestone count
- [ ] Each template shows: last used date (or "Never used")
- [ ] Clicking a template navigates to detail page

### Navigation
- [ ] "Templates" link appears in sidebar
- [ ] "Create Template" button visible

## 2. Create Template Page (`/templates/new`)

### AI Generation
- [ ] Description textarea accepts input
- [ ] "Generate Milestones" button disabled without description
- [ ] AI generates milestones after clicking button
- [ ] Generated milestones appear in editable list
- [ ] Template name is auto-suggested from AI response

### Manual Editing
- [ ] Can add milestone manually via "Add Milestone" button
- [ ] Can edit milestone title, category, days before event
- [ ] Can remove milestone via trash icon
- [ ] Category dropdown shows all valid categories

### Validation
- [ ] Cannot save without template name
- [ ] Cannot save with 0 milestones
- [ ] Shows error for duplicate template name

### Save Flow
- [ ] "Create Template" button creates template
- [ ] Redirects to template detail page after save
- [ ] Toast notification confirms creation

## 3. Template Detail Page (`/templates/:id`)

### Display
- [ ] Shows template name and version badge
- [ ] Lists all milestones with categories
- [ ] Shows days before event for each milestone
- [ ] Shows estimated hours if available

### Actions
- [ ] "Edit" button links to edit page (placeholder for V1)
- [ ] "Delete" button shows confirmation dialog
- [ ] Delete soft-deletes (sets is_active: false)
- [ ] "Create Event" link includes template ID in URL

### Navigation
- [ ] "Back" button returns to template list

## 4. Event Creation with Template (`/events/new`)

### Template Selection
- [ ] Shows list of available templates
- [ ] Each template shows: name, version, milestone count
- [ ] Selected template is highlighted
- [ ] "Skip template" option available

### Pre-selection via URL
- [ ] `/events/new?template=:id` pre-selects template
- [ ] Skips to details step if template pre-selected

### Milestone Loading
- [ ] Milestones load from selected template
- [ ] Can deselect individual milestones
- [ ] Due dates calculated from event date

### Event Creation
- [ ] Event is created with template_version_id
- [ ] Selected milestones are copied to event
- [ ] Redirects to event detail page

## 5. Update Template from Event (`/events/:id`)

### Button Visibility
- [ ] "Update Template" button visible if event has template
- [ ] Button hidden if event has no template

### Diff Display
- [ ] Dialog shows milestones added to event
- [ ] Dialog shows milestones removed from template
- [ ] No changes message if milestones match

### Selection
- [ ] Checkboxes to select which changes to apply
- [ ] Added milestones default to selected
- [ ] Removed milestones default to unselected

### Save Flow
- [ ] Creates new template version
- [ ] Changelog generated from selected changes
- [ ] Template version number increments
- [ ] Toast confirms update

## 6. Edge Cases

### Empty Template
- [ ] Error if trying to save template with 0 milestones

### Duplicate Name
- [ ] Error if template name already exists in org

### AI Failure
- [ ] Graceful error message if AI generation fails
- [ ] Can still add milestones manually

### Network Errors
- [ ] Toast notifications for failed operations
- [ ] Loading states while operations in progress

## 7. Automated Tests

Run with: `npm test` or `npx vitest run`

- [ ] All 56 tests pass
- [ ] No TypeScript errors (`npx tsc --noEmit`)
