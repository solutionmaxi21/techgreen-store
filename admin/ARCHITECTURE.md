# Admin Panel Architecture

## Overview

The Admin Panel is a desktop application built with Vite, React, and Electron that provides management capabilities for the e-commerce platform.

## Tech Stack

- **Framework**: React 19 + Vite
- **Desktop**: Electron (for packaging as desktop app)
- **Styling**: Vanilla CSS with CSS Modules
- **Language**: JavaScript (not TypeScript)
- **State Management**: React hooks + React Query
- **API Client**: Custom fetch wrapper (`apiService.js`)

## Data Flow

```
┌─────────────────────────────────────────┐
│         Admin Panel Pages               │
│  (ProductsListPage, OrdersListPage...)  │
└──────────────┬──────────────────────────┘
               │ imports
               ↓
┌─────────────────────────────────────────┐
│     apiService.js (HTTP Client)         │
│  - Token refresh logic                  │
│  - Error handling                       │
│  - Electron integration                 │
└──────────────┬──────────────────────────┘
               │ HTTP requests
               ↓
┌─────────────────────────────────────────┐
│    Backend API (localhost:3001)         │
│  - Express + Prisma                     │
│  - PostgreSQL database                  │
└─────────────────────────────────────────┘
```

## Key Files

### API Layer
- `src/services/apiService.js` - Main API client with authentication
- `src/services/mockAdminApi.js` - Re-export wrapper (legacy, being phased out)
- `src/services/dbAdapter.js` - Transforms database JSON for compatibility

### Authentication
- Uses HttpOnly cookies for session management
- Automatic token refresh on 401 errors
- Electron secure storage integration via `electronAPI`

### Data Transformation
The Admin panel uses a data transformation layer:
- JSON fixtures in `../database/` folder
- `dbAdapter.js` transforms them to match UI expectations
- Provides backward compatibility during migration

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run as Electron app
npm run electron:dev

# Build Electron app
npm run electron:build
```

## Important Notes

1. **Not TypeScript**: Unlike the Storefront, this uses JavaScript
2. **Not Tailwind**: Uses vanilla CSS, not Tailwind CSS
3. **Electron Integration**: Can run as desktop app with secure token storage
4. **Cookie-Based Auth**: Relies on HttpOnly cookies, not localStorage tokens
