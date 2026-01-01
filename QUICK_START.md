# Quick Start - Local Development

⚠️ **IMPORTANT**: All commands must be run from the **project root** directory, NOT from package subdirectories!

## One-Time Setup

1. **Make sure you're in the project root:**
   ```powershell
   cd "C:\Users\PC\Documents\VSCode Projects\HandyCall"
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Build shared package:**
   ```powershell
   npm run shared:build
   ```

4. **Verify environment files exist:**
   - `packages/backend/.env` ✅ (already created)
   - `packages/web/.env.local` ✅ (already created)

## Starting Development

**Option 1: Use npm scripts (Recommended)**

Open two terminals. **Both must be in the project root:**

**Terminal 1 - Backend (from project root):**
```powershell
cd "C:\Users\PC\Documents\VSCode Projects\HandyCall"
npm run backend:dev
```

Wait for: `🚀 HandyCall API is running on: http://localhost:3000/api/v1`

**Terminal 2 - Frontend:**
```powershell
npm run web:dev
```

Wait for: `- Local: http://localhost:3001`

**Option 2: Use the verification script**

```powershell
.\start-local.ps1
```

Then follow the instructions it provides.

## Accessing the Application

- **Frontend UI**: http://localhost:3001
- **Backend API**: http://localhost:3000/api/v1
- **Health Check**: http://localhost:3000/api/v1/health

## What's Configured

✅ All environment variables from AWS Elastic Beanstalk  
✅ CORS configured for localhost:3001  
✅ AWS credentials (uses your local AWS CLI config)  
✅ Next.js middleware issue fixed (removed `output: 'export'` for dev)  
✅ Shared package built and linked  

## Making Changes

- **UI Changes**: Edit files in `packages/web/src/` - changes hot-reload automatically
- **API Changes**: Edit files in `packages/backend/src/` - changes hot-reload automatically
- **Type Changes**: Edit `packages/shared/src/`, then run `npm run shared:build`

## Need Help?

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

