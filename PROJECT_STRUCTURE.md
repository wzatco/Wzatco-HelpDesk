# Project File Structure

## Root Directory Files
```
.gitignore
.env.production
package.json
package-lock.json
next.config.js
postcss.config.js
tailwind.config.js
tsconfig.json
jsconfig.json
jest.config.js
server.js
README.md
```

## Configuration Files
```
.env.production                    # Production environment variables
.gitignore                         # Git ignore rules
next.config.js                     # Next.js configuration
postcss.config.js                  # PostCSS configuration
tailwind.config.js                 # Tailwind CSS configuration
tsconfig.json                      # TypeScript configuration
jsconfig.json                      # JavaScript configuration
jest.config.js                     # Jest testing configuration
```

## Documentation Files
```
README.md                          # Main project documentation
SERVER_REQUIREMENTS.md            # Server setup requirements
HOSTINGER_ENV_SETUP_GUIDE.md      # Environment setup guide
PRODUCTION_ENV_VARIABLES.md       # Production environment reference
ENV_PRODUCTION_REFERENCE.txt      # Environment variables reference
PRODUCTION_ENV_IMPORT.env         # Environment import file
QUICK_IMPORT_REFERENCE.txt        # Quick import reference
ROLE_ACCESS_IMPLEMENTATION_GUIDE.md # Role access guide
SLA Guide.md                      # SLA guide
SLA_IMPLEMENTATION_GUIDE.md       # SLA implementation guide
SLA_QUICKSTART.md                 # SLA quick start
SLA_WORKFLOW_SYSTEM.md            # SLA workflow system
Workflow.md                       # Workflow documentation
WORKFLOW_SYSTEM_README.md         # Workflow system guide
WORKFLOW_QUICK_START.md           # Workflow quick start
```

## Source Code Structure

### Pages (`pages/`)
```
pages/
├── _app.js                       # Next.js app wrapper
├── index.js                      # Home page
│
├── admin/                        # Admin panel pages
│   ├── login.js
│   ├── index.js                  # Admin dashboard
│   ├── agents/
│   │   ├── index.js
│   │   ├── new.js
│   │   └── [id].js
│   ├── tickets/
│   │   ├── index.js
│   │   ├── new.js
│   │   └── [id].js
│   ├── settings/
│   │   ├── index.js
│   │   ├── basic.js
│   │   ├── email.js
│   │   ├── ai.js
│   │   └── ...
│   └── ...
│
├── agent/                        # Agent panel pages
│   ├── login.js
│   ├── index.js
│   ├── tickets/
│   │   ├── index.js
│   │   └── [id].js
│   └── ...
│
├── api/                          # API routes
│   ├── admin/                    # Admin API endpoints
│   │   ├── auth/
│   │   ├── tickets/
│   │   ├── agents/
│   │   ├── settings/
│   │   └── ...
│   ├── agent/                    # Agent API endpoints
│   │   ├── auth/
│   │   ├── tickets/
│   │   └── ...
│   ├── widget/                   # Widget API endpoints
│   │   ├── tickets/
│   │   ├── chat/
│   │   ├── auth/
│   │   └── ...
│   ├── auth/                     # Authentication
│   │   └── [...nextauth].js     # NextAuth configuration
│   └── ...
│
└── widget/                       # Widget pages
    └── index.js
```

### Components (`components/`)
```
components/
├── ErrorDisplay.js               # Error display component
├── ui/                           # UI components
│   └── StyledSelect.js
├── widget/                       # Widget components
│   └── chat/
│       ├── ChatInterface.js
│       ├── TicketsView.js
│       └── ...
├── admin/                        # Admin components
└── agent/                        # Agent components
```

### Libraries (`lib/`)
```
lib/
├── prisma.js                     # Prisma client
├── auth.js                       # Authentication utilities
├── server-auth.js                # Server-side auth
├── error-handler.js              # Error handling
├── crypto-utils.js               # Cryptographic utilities
├── email/                        # Email configuration
│   └── config.js
├── utils/                        # Utility functions
│   ├── agent-auth.js
│   └── notifications.js
└── chat-service.js               # Chat service
```

### Contexts (`contexts/`)
```
contexts/
└── AgentAuthContext.js           # Agent authentication context
```

### Utils (`utils/`)
```
utils/
├── blockRenderer.js              # Block content renderer
└── textFormatting.js             # Text formatting utilities
```

### Prisma (`prisma/`)
```
prisma/
├── schema.prisma                 # Database schema
├── seed.js                       # Database seed script
├── seed-sla.js                   # SLA seed script
└── seed-users.js                 # Users seed script
```

### Scripts (`scripts/`)
```
scripts/
├── create-admin.js               # Create admin user
├── create-production-env.js     # Create production env file
├── verify-production-env.js     # Verify production env
├── migrate-data.js               # Data migration scripts
└── ...
```

### Public Assets (`public/`)
```
public/
├── notification.mp3              # Notification sound
├── notification.wav              # Notification sound
├── widget_sparkel.svg            # Widget icon
└── uploads/                      # Uploaded files
    ├── tickets/                  # Ticket uploads
    └── ...
```

### Styles (`styles/`)
```
styles/
├── globals.css                   # Global styles
└── reactflow-custom.css          # React Flow custom styles
```

### Hooks (`src/hooks/`)
```
src/hooks/
└── useSocket.js                  # Socket.IO hook
```

### Uploads (`uploads/`)
```
uploads/
├── tickets/                      # Ticket file uploads
├── avatars/                      # User avatars
├── product/                      # Product images
└── accessory/                    # Accessory images
```

## Key Files

### Server Configuration
- `server.js` - Custom Next.js server with Socket.IO support

### Environment
- `.env.production` - Production environment variables (tracked in git)

### Database
- `prisma/schema.prisma` - Prisma database schema
- `prisma/dev.db` - SQLite development database

### Main Application Files
- `pages/_app.js` - Next.js app component
- `pages/index.js` - Home page
- `server.js` - Custom server entry point

