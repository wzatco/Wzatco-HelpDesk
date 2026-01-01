# Prisma Singleton Fix - Batch Script Guide

## Files Fixed So Far (5/126):
1. ✅ pages/api/public/knowledge-base/categories.js
2. ✅ pages/api/public/knowledge-base/articles.js (was already correct)
3. ✅ pages/api/widget/knowledge-base/articles/index.js
4. ✅ pages/api/widget/knowledge-base/articles/[id].js
5. ✅ pages/api/widget/knowledge-base/categories.js

## Pattern to Replace:

### FROM (Wrong Pattern):
```javascript
import { PrismaClient } from '@prisma/client';

// Prisma singleton pattern to prevent connection leaks
let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}
```

### TO (Correct Pattern):
```javascript
import prisma, { ensurePrismaConnected } from '@/lib/prisma';
```

### ALSO ADD in handler function:
```javascript
export default async function handler(req, res) {
  // ... other code ...
  try {
    await ensurePrismaConnected(); // ADD THIS LINE
    // ... rest of code
  }
}
```

## Remaining Files to Fix (121):

### Priority 1: Widget APIs (Most User-Facing)
- pages/api/widget/tickets/create.js
- pages/api/widget/tickets/[id].js
- pages/api/widget/tickets/[id]/messages.js
- pages/api/widget/tickets/[id]/feedback.js
- pages/api/widget/tickets/[id]/upload.js
- pages/api/widget/tickets.js
- pages/api/widget/tickets/check.js
- pages/api/widget/tickets/check-existing.js
- pages/api/widget/schedule-callback.js
- pages/api/widget/otp/send.js
- pages/api/widget/otp/verify.js
- pages/api/widget/issue-categories.js
- pages/api/widget/accessories.js
- pages/api/widget/products.js
- pages/api/widget/tutorials.js
- pages/api/widget/chats/[id].js
- pages/api/widget/chats/index.js
- pages/api/widget/callbacks/[id].js
- pages/api/widget/callbacks/[id]/reschedule-response.js
- pages/api/widget/chat/openai.js
- pages/api/widget/chat/festival.js
- pages/api/widget/chat/feedback.js

### Priority 2: Admin Auth & Dashboard
- pages/api/admin/auth/login.js
- pages/api/admin/dashboard/metrics.js
- pages/api/admin/dashboard/critical-alerts.js
- pages/api/admin/dashboard/ticket-volume.js
- pages/api/admin/dashboard/top-issues.js

### Priority 3: Admin Tickets
- pages/api/admin/tickets/index.js
- pages/api/admin/tickets/[id].js
- pages/api/admin/tickets/[id]/messages.js
- pages/api/admin/tickets/[id]/notes.js
- pages/api/admin/tickets/counts.js
- pages/api/admin/tickets/auto-close.js

### Priority 4: Rest of Admin APIs (~80 files)
- All other admin/* endpoints

## Progress Tracking:
- Fixed: 5/126 (4%)
- Remaining: 121/126 (96%)

## Estimated Time:
- Manual fix per file: ~30 seconds
- Total time remaining: ~60 minutes

## Next Batch Target:
Fix Priority 1 (Widget APIs) - 22 files

