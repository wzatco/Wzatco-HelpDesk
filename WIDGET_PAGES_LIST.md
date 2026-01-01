# Widget Pages/Components List

## Main Widget Pages (from WidgetContainer.js)

1. **LoginScreen** (`components/widget/LoginScreen.js`)
   - First screen - User login with name and email
   - Status: ✅ Dark mode optimized

2. **MainMenu** (`components/widget/MainMenu.js`)
   - Support Options menu with 4 cards
   - Status: ⚠️ Dark mode needs fixing (user reported still showing light)

3. **KnowledgeBase** (`components/widget/KnowledgeBase.js`)
   - Knowledge base view (accessed from MainMenu)
   - Status: ❓ Dark mode status unknown

4. **TicketManagement** (`components/widget/TicketManagement.js`)
   - Ticket management view (accessed from MainMenu)
   - Status: ❓ Dark mode status unknown

5. **CallbackScheduler** (`components/widget/CallbackScheduler.js`)
   - Schedule callback view (accessed from MainMenu)
   - Status: ❓ Dark mode status unknown

6. **Tutorials** (`components/widget/Tutorials.js`)
   - Tutorials view (accessed from MainMenu)
   - Status: ❓ Dark mode status unknown

7. **ProfileManagement** (`components/widget/ProfileManagement.js`)
   - User profile management (accessed from MainMenu)
   - Status: ❓ Dark mode status unknown

8. **LiveChat** (`components/widget/LiveChat.js`)
   - Live chat interface
   - Status: ❓ Dark mode status unknown

---

## Chat Widget Pages (from ChatInterface.js and chat folder)

9. **ChatInterface** (`components/widget/chat/ChatInterface.js`)
   - Main chat interface with welcome screen, quick actions, and message history
   - Status: ✅ Dark mode optimized

10. **LoginForm** (`components/widget/chat/LoginForm.js`)
    - Login form for widget (First Name, Last Name, Email)
    - Status: ✅ Dark mode optimized

11. **TicketsView** (`components/widget/chat/TicketsView.js`)
    - Ticket list and detail view with chat
    - Status: ✅ Dark mode optimized (partially - may need review)

12. **KnowledgeBaseView** (`components/widget/chat/KnowledgeBaseView.js`)
    - Knowledge base search and articles view
    - Status: ❓ Dark mode status unknown

13. **TutorialsView** (`components/widget/chat/TutorialsView.js`)
    - Tutorials and guides view
    - Status: ❓ Dark mode status unknown

14. **ScheduleCallbackView** (`components/widget/chat/ScheduleCallbackView.js`)
    - Schedule callback form view
    - Status: ❓ Dark mode status unknown

15. **WidgetMenu** (`components/widget/chat/WidgetMenu.js`)
    - Widget menu component
    - Status: ❓ Dark mode status unknown

---

## Modal Components

16. **OTPModal** (`components/widget/OTPModal.js`)
    - OTP verification modal
    - Status: ❓ Dark mode status unknown

17. **RatingModal** (`components/widget/RatingModal.js`)
    - Rating/feedback modal
    - Status: ❓ Dark mode status unknown

18. **FeedbackModal** (`components/widget/chat/FeedbackModal.js`)
    - Feedback form modal
    - Status: ❓ Dark mode status unknown

19. **LeaveChatModal** (`components/widget/LeaveChatModal.js`)
    - Leave chat confirmation modal
    - Status: ❓ Dark mode status unknown

---

## Container/Orchestration Components

20. **WidgetContainer** (`components/widget/WidgetContainer.js`)
    - Main widget container that routes between pages
    - Status: ❓ Dark mode status unknown (may need container-level dark mode)

21. **ChatWidgetContainer** (`components/widget/chat/ChatWidgetContainer.js`)
    - Chat widget container
    - Status: ❓ Dark mode status unknown

22. **CustomerWidget** (`components/widget/CustomerWidget.js`)
    - Customer widget wrapper
    - Status: ❓ Dark mode status unknown

---

## Summary

**Total Widget Pages/Components: 22**

**Dark Mode Status:**
- ✅ Optimized: 3 (LoginScreen, ChatInterface, LoginForm)
- ⚠️ Needs Fix: 1 (MainMenu - user reported issue)
- ❓ Unknown: 18 (need to check and optimize)

**Priority Pages to Fix:**
1. MainMenu (user reported issue)
2. WidgetContainer (main container - may affect all pages)
3. KnowledgeBase / KnowledgeBaseView
4. TicketManagement / TicketsView
5. Tutorials / TutorialsView
6. ScheduleCallbackView / CallbackScheduler
7. ProfileManagement
8. All modals

