# Troubleshooting Local Development

## Backend Not Starting

If the backend fails to start with a `MODULE_NOT_FOUND` error, try these steps:

### 1. Ensure Dependencies are Installed

```powershell
# From project root
npm install

# Build shared package
npm run shared:build
```

### 2. Check Environment File

Make sure `packages/backend/.env` exists and contains all required variables. You can verify by:

```powershell
Test-Path packages\backend\.env
Get-Content packages\backend\.env | Select-Object -First 10
```

### 3. Try Starting Backend Manually

```powershell
cd packages\backend
npm run dev
```

Look for the specific error message. Common issues:
- **MODULE_NOT_FOUND**: Usually means a dependency is missing or shared package isn't built
- **Port already in use**: Another process is using port 3000
- **Environment variable error**: Check .env file format

### 4. Check if Port 3000 is Available

```powershell
netstat -ano | Select-String ":3000"
```

If something is using port 3000, either stop it or change the PORT in `.env`.

### 5. Verify AWS Credentials

```powershell
aws sts get-caller-identity
```

The backend needs AWS credentials to connect to DynamoDB, S3, Cognito, and Bedrock.

## Frontend Not Connecting to Backend

If you see "Failed to fetch" error:

### 1. Verify Backend is Running

Open http://localhost:3000/api/v1/health in your browser. You should see a JSON response.

### 2. Check Environment Variable

Make sure `packages/web/.env.local` contains:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### 3. Check CORS Configuration

The backend `.env` file should include `http://localhost:3001` in CORS_ORIGINS:
```
CORS_ORIGINS=http://localhost:3001,http://localhost:3000,...
```

### 4. Restart Both Services

Stop both processes and restart:
1. Stop backend (Ctrl+C in backend terminal)
2. Stop frontend (Ctrl+C in frontend terminal)
3. Start backend: `npm run backend:dev`
4. Start frontend: `npm run web:dev`

## Common Issues

### Next.js Middleware Warning

If you see: "Middleware cannot be used with 'output: export'"

This has been fixed by commenting out `output: 'export'` in `next.config.js` for local development. The warning should no longer appear.

### Shared Package Not Found

If you get errors about `@handycall/shared`:

```powershell
# Build the shared package
npm run shared:build

# Verify it exists
Test-Path packages\shared\dist\index.js
```

### TypeScript Path Resolution

The backend uses TypeScript path mapping. If imports fail, check `packages/backend/tsconfig.json` has:
```json
"paths": {
  "@handycall/shared": ["../shared/src"],
  "@/*": ["src/*"]
}
```

## Quick Reset

If nothing works, try a clean reset:

```powershell
# Stop all Node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Reinstall dependencies
npm install

# Build shared package
npm run shared:build

# Start backend
npm run backend:dev

# In another terminal, start frontend
npm run web:dev
```




