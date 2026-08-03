# 🔐 ENVIRONMENT VARIABLES TEMPLATE

## Backend/.env.production
```env
# DATABASE
DATABASE_URL=postgresql://user:password@host.neon.tech:5432/dbname?sslmode=require

# SERVER
PORT=5000
NODE_ENV=production

# JWT AUTHENTICATION
# Generate with: openssl rand -base64 32
JWT_SECRET=generate-random-string-with-openssl-command

# CLOUDINARY IMAGE STORAGE
# Get from: https://cloudinary.com/console
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# OPTIONAL: FRONTEND URL (for CORS)
FRONTEND_URL=https://aquasphere-xxxxx.vercel.app
```

## Frontend/.env.production
```env
# BACKEND API URL
VITE_API_URL=https://aquasphere-backend-xxxxx.onrender.com/api/v1
```

---

## HOW TO GET EACH SECRET:

### DATABASE_URL (from Neon)
```
1. Go to: https://neon.tech
2. Dashboard → Your Project → Connection String
3. Copy entire string: postgresql://user:password@...
4. Paste in DATABASE_URL
```

### JWT_SECRET (Generate Random)
```bash
# Linux/Mac:
openssl rand -base64 32

# Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Max 256) }))

# Result: Use this 44-character string as JWT_SECRET
```

### CLOUDINARY Credentials
```
1. Go to: https://cloudinary.com
2. Sign Up → Verify Email
3. Dashboard → Settings → API Keys
4. Copy:
   - Cloud Name
   - API Key
   - API Secret (keep private!)
```

### VITE_API_URL (from Render Backend)
```
1. Deploy backend to Render first
2. Go to: https://render.com
3. Select your service
4. Copy URL from top: https://aquasphere-backend-xxxxx.onrender.com
5. Add /api/v1 to it
6. Paste in Frontend/.env.production
```

---

## SECURITY NOTES:

⚠️  NEVER commit .env files to GitHub
✅  Files are already in .gitignore

⚠️  NEVER share JWT_SECRET
✅  Keep it private and rotate regularly

⚠️  NEVER expose Cloudinary API_SECRET
✅  Store only in environment variables

✅  All secrets are encrypted in Render/Vercel dashboards
✅  Use strong random values

---

## EXAMPLE FILLED VALUES:

```env
# Backend/.env.production EXAMPLE:
DATABASE_URL=postgresql://neon_user:abc123def456@ep-xyz-123.neon.tech:5432/aquasphere?sslmode=require
PORT=5000
NODE_ENV=production
JWT_SECRET=dXJhbmRvbVN0cmluZ3RoYXRpc2JhY2UxXQw==
CLOUDINARY_CLOUD_NAME=my_water_company
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xyz_secret_api_key_here
FRONTEND_URL=https://aquasphere-app.vercel.app
```

```env
# Frontend/.env.production EXAMPLE:
VITE_API_URL=https://aquasphere-backend-app.onrender.com/api/v1
```

---

## VERIFICATION STEPS:

After adding all secrets:

```bash
# Test Backend connection:
1. In Render dashboard, view logs
2. Should show: "✓ Database connected"
3. Should show: "Server running on port 5000"

# Test Frontend connection:
1. Visit: https://your-frontend-url
2. Should load login page
3. Try login - should work if backend is connected
```

---

## ROTATING SECRETS:

To rotate JWT_SECRET safely:
```bash
1. Generate new JWT_SECRET: openssl rand -base64 32
2. Update in Render environment variables
3. Render auto-redeploys backend
4. Old tokens become invalid (users need to re-login)
5. That's OK - security upgrade is worth it
```

---

## EMERGENCY: SECRETS COMPROMISED?

If anyone sees your secrets:
```
1. IMMEDIATELY rotate JWT_SECRET
2. Regenerate Cloudinary API keys
3. Create new Neon database if DATABASE_URL exposed
4. In Render, update all environment variables
5. Render auto-redeploys
6. All old tokens invalidated
```

✅ You're safe - cloud platforms handle redeployment instantly!
