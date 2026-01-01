# Issue Categories CRUD Implementation Plan

## Overview
Implement a complete CRUD system for Issue Categories that allows admins to manage categories, which will be used in:
1. Admin ticket creation form
2. Customer widget ticket creation
3. Issue Analytics reports
4. All ticket views (admin/agent)

## Current State Analysis

### Database Schema
- **Conversation model** has:
  - `category` field (String?, default: "WZATCO") - used for ticket category
  - `issueType` field (String?) - used for issue type in widget ticket creation
- Currently, categories are hardcoded in multiple places:
  - Admin ticket creation: `['WZATCO', 'Technical', 'Billing', 'General', 'Other']`
  - Widget ticket creation: `['Technical', 'Billing', 'Warranty', 'Product Issue', 'Other']`
  - Admin ticket view: `['WZATCO', 'Technical', 'Billing', 'Support', 'Other']`

### Current Usage Locations
1. **Admin Ticket Creation** (`pages/admin/tickets/new.js`):
   - Line 912-924: Hardcoded category dropdown
   - Uses `formData.category` field

2. **Widget Ticket Creation** (`components/widget/chat/TicketCreationFlow.js`):
   - Line 57: Uses `issueTypes` prop (hardcoded fallback)
   - `components/widget/chat/ChatInterface.js` line 39: Hardcoded `['Technical', 'Billing', 'Warranty', 'Product Issue', 'Other']`

3. **Admin Ticket View** (`pages/admin/tickets/[id].js`):
   - Line 3459-3464: Hardcoded category dropdown for editing

4. **Reports - Issue Analytics** (`pages/api/admin/reports/issues.js`):
   - Currently groups by ticket subject/message, not by category
   - Should group by `issueType` or `category` field

## Implementation Steps

### Step 1: Database Schema
**File**: `prisma/schema.prisma`

Create new `IssueCategory` model:
```prisma
model IssueCategory {
  id          String         @id @default(cuid())
  name        String         @unique
  description String?
  isActive    Boolean        @default(true)
  order       Int            @default(0)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  conversations Conversation[]
  
  @@index([isActive])
  @@index([order])
}
```

Update `Conversation` model:
- Add relation: `issueCategoryId String?` and `issueCategory IssueCategory? @relation(...)`
- Keep `category` and `issueType` fields for backward compatibility (migration path)

### Step 2: Database Migration
- Create migration file
- Run migration
- Seed initial categories if needed

### Step 3: API Endpoints - Admin CRUD
**File**: `pages/api/admin/issue-categories/index.js`
- GET: List all categories (with optional `activeOnly` filter)
- POST: Create new category

**File**: `pages/api/admin/issue-categories/[id].js`
- GET: Get single category
- PATCH: Update category
- DELETE: Soft delete (set isActive=false) or hard delete

### Step 4: Widget API Endpoint
**File**: `pages/api/widget/issue-categories.js`
- GET: List active categories only
- Public endpoint (no auth required)

### Step 5: Admin Settings Page - CRUD Interface
**File**: `pages/admin/settings/ticket.js`

Add new section for Issue Categories management:
- Table/list view of all categories
- Add new category form
- Edit category (inline or modal)
- Delete/Deactivate category
- Reorder categories (drag & drop or up/down buttons)
- Match existing UI theme (dark/light mode compatible)

### Step 6: Update Admin Ticket Creation
**File**: `pages/admin/tickets/new.js`
- Fetch categories from API: `/api/admin/issue-categories?activeOnly=true`
- Replace hardcoded dropdown with dynamic categories
- Map `formData.category` to selected category name

### Step 7: Update Widget Ticket Creation
**Files**: 
- `components/widget/chat/ChatInterface.js`
- `components/widget/chat/TicketCreationFlow.js`

- Fetch categories from `/api/widget/issue-categories` on mount
- Update `issueTypes` state with fetched categories
- Pass categories to `TicketCreationFlow` component

### Step 8: Update Admin/Agent Ticket Views
**Files**:
- `pages/admin/tickets/[id].js`
- `pages/agent/tickets/[id].js`

- Fetch categories for edit dropdown
- Replace hardcoded category options

### Step 9: Update Reports - Issue Analytics
**File**: `pages/api/admin/reports/issues.js`

- Group tickets by `issueType` or `issueCategory` instead of subject
- Show category name in analytics
- Filter by category if needed

**File**: `pages/admin/reports/index.js`
- Update `IssueAnalytics` component to display categories properly

### Step 10: Update Ticket Creation API
**Files**:
- `pages/api/admin/tickets/create.js` (if exists)
- `pages/api/widget/tickets/create.js`

- Ensure `issueType` field is saved correctly
- Optionally link to `IssueCategory` if using relation

## File Structure

```
prisma/
  schema.prisma (update)
  migrations/ (new migration)

pages/
  api/
    admin/
      issue-categories/
        index.js (new)
        [id].js (new)
    widget/
      issue-categories.js (new)
    admin/
      reports/
        issues.js (update)
  admin/
    settings/
      ticket.js (update - add categories section)
    tickets/
      new.js (update - use dynamic categories)
      [id].js (update - use dynamic categories)
  agent/
    tickets/
      [id].js (update - use dynamic categories)

components/
  widget/
    chat/
      ChatInterface.js (update - fetch categories)
      TicketCreationFlow.js (update - use dynamic categories)
```

## UI/UX Considerations

1. **Admin Settings Page**:
   - Add new card section: "Issue Categories"
   - Table with columns: Name, Description, Status, Order, Actions
   - Add button to create new category
   - Edit/Delete actions per row
   - Drag handle for reordering (optional)
   - Match existing checkbox styling (dark/light mode)

2. **Category Form**:
   - Name (required, unique)
   - Description (optional)
   - Active toggle (checkbox)
   - Order field (number)

3. **Validation**:
   - Category name must be unique
   - Cannot delete category if used in tickets (soft delete instead)
   - Show usage count before deletion

## Testing Checklist

- [ ] Create new category via admin settings
- [ ] Edit existing category
- [ ] Deactivate category (should not appear in dropdowns)
- [ ] Delete category (soft delete)
- [ ] Reorder categories
- [ ] Admin ticket creation shows categories
- [ ] Widget ticket creation shows categories
- [ ] Reports show categories correctly
- [ ] Dark/light mode compatibility
- [ ] Checkbox styling matches theme

## Migration Strategy

1. Create `IssueCategory` table
2. Seed with existing hardcoded categories
3. Update all forms to use dynamic categories
4. Keep `category` and `issueType` fields for backward compatibility
5. Optionally migrate existing ticket data to use new categories

## Notes

- The `category` field in Conversation is different from `issueType`
- `category` seems to be for general categorization (WZATCO, Technical, etc.)
- `issueType` is used in widget for "What type of issue is this?"
- We should clarify if these should be unified or kept separate
- For now, we'll use `issueType` for the new Issue Categories system
- Consider adding `issueCategoryId` relation for better data integrity

