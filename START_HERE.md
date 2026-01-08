# 🚀 START HERE - Local Development Setup

## Important: Always Run Commands from Project Root

⚠️ **CRITICAL**: All npm commands must be run from the project root (`C:\Users\PC\Documents\VSCode Projects\HandyCall`), NOT from individual package directories.

## Quick Start (3 Steps)

### Step 1: Build Shared Package (One-time, or when shared types change)

```powershell
# Make sure you're in the project root
cd "C:\Users\PC\Documents\VSCode Projects\HandyCall"

# Build shared package
npm run shared:build
```

### Step 2: Start Backend (Terminal 1)

```powershell
# From project root
npm run backend:dev
```

Wait until you see: `🚀 HandyCall API is running on: http://localhost:3000/api/v1`

### Step 3: Start Frontend (Terminal 2 - New Terminal)

```powershell
# From project root (open a new terminal window)
npm run web:dev
```

Wait until you see: `- Local: http://localhost:3001`

## Access Your Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api/v1
- **Health Check**: http://localhost:3000/api/v1/health

## ✅ What's Already Configured

- ✅ Environment files created (`packages/backend/.env` and `packages/web/.env.local`)
- ✅ All AWS environment variables configured
- ✅ CORS set up for localhost:3001
- ✅ Next.js config fixed (middleware issue resolved)

## Common Commands

All commands run from **project root**:

```powershell
# Build shared types (do this first, or when shared types change)
npm run shared:build

# Start backend only
npm run backend:dev

# Start frontend only  
npm run web:dev

# Start both (if configured)
npm run dev

# Install dependencies (if needed)
npm install
```

## Troubleshooting

### "Missing script" errors
- ❌ Don't run npm commands from `packages/backend/` or `packages/web/`
- ✅ Always run from project root

### Backend won't start
1. Make sure you ran `npm run shared:build` first
2. Check that `packages/backend/.env` exists
3. Verify AWS credentials: `aws sts get-caller-identity`

### Frontend shows "Failed to fetch"
1. Make sure backend is running first (check http://localhost:3000/api/v1/health)
2. Verify both services are running
3. Check browser console for detailed error

## Need More Help?

- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed solutions
- See [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for full documentation





