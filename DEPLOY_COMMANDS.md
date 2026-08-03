# 🔧 DEPLOYMENT COMMANDS - COPY & PASTE

## BEFORE YOU START
```bash
# Make sure you have:
- GitHub account (to push your code)
- Git installed locally
- Node.js installed (v16+)
```

---

## STEP 1: PREPARE BACKEND FOR DEPLOYMENT

```bash
# 1. Navigate to Backend folder
cd Backend

# 2. Create production environment file
cat > .env.production << 'EOF'
DATABASE_URL=postgresql://your_user:your_password@your_host/your_db
PORT=5000
JWT_SECRET=your-random-secret-key-change-this-123456789
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NODE_ENV=production
EOF

# 3. Test build locally
npm install
npm start
# Should show: "Server running on port 5000"
# Press Ctrl+C to stop
```

---

## STEP 2: PREPARE FRONTEND FOR DEPLOYMENT

```bash
# 1. Navigate to Frontend folder
cd ../Frontend

# 2. Create production environment file
cat > .env.production << 'EOF'
VITE_API_URL=https://aquasphere-backend-xxxxx.onrender.com/api/v1
EOF

# 3. Test build locally
npm install
npm run build
# Should create dist/ folder with no errors

# Preview production build (optional)
npm run preview
```

---

## STEP 3: PUSH TO GITHUB

```bash
# 1. From root folder
cd ../

# 2. Initialize git (if not already done)
git init

# 3. Add all files
git add .

# 4. Commit
git commit -m "Initial AquaSphere deployment"

# 5. Create GitHub repo manually at https://github.com/new
# Then run:
git remote add origin https://github.com/YOUR_USERNAME/aquasphere.git
git branch -M main
git push -u origin main
```

---

## STEP 4: DEPLOY DATABASE (NEON)

```bash
# 1. Go to https://neon.tech
# 2. Sign up with GitHub
# 3. Create new project (name: aquasphere)
# 4. Copy connection string from dashboard
# 5. In terminal, run:

npx prisma db push --skip-generate

# When prompted, paste your Neon connection string
# This will create all tables in your PostgreSQL database
```

---

## STEP 5: DEPLOY BACKEND (RENDER)

```bash
# Manual steps (no commands needed):
# 1. Go to https://render.com
# 2. Sign up with GitHub
# 3. Click "New" → "Web Service"
# 4. Connect your GitHub repository
# 5. Fill in form:
#    - Name: aquasphere-backend
#    - Root Directory: Backend
#    - Runtime: Node
#    - Build Command: npm install
#    - Start Command: npm start
# 6. Click "Advanced" and add environment variables:
#    DATABASE_URL=your_neon_connection_string
#    JWT_SECRET=your_secret
#    CLOUDINARY_CLOUD_NAME=your_cloud_name
#    CLOUDINARY_API_KEY=your_api_key
#    CLOUDINARY_API_SECRET=your_api_secret
# 7. Click "Create Web Service"
# 8. Wait 2-3 minutes for deploy
# 9. Copy your backend URL (will be shown in Render dashboard)
```

---

## STEP 6: UPDATE FRONTEND WITH BACKEND URL

```bash
# 1. Edit Frontend/.env.production
nano Frontend/.env.production

# Change:
VITE_API_URL=https://aquasphere-backend-xxxxx.onrender.com/api/v1
# (Replace xxxxx with your actual Render URL)

# 2. Save and exit (Ctrl+X, Y, Enter if using nano)

# 3. Commit the change
git add Frontend/.env.production
git commit -m "Update backend URL for production"
git push
```

---

## STEP 7: DEPLOY FRONTEND (VERCEL)

```bash
# Manual steps (no commands needed):
# 1. Go to https://vercel.com
# 2. Sign up with GitHub
# 3. Click "Add New" → "Project"
# 4. Select your aquasphere repository
# 5. Fill in form:
#    - Framework: React
#    - Root Directory: Frontend
#    - Build Command: npm run build
#    - Output Directory: dist
# 6. Click "Environment Variables"
# 7. Add: VITE_API_URL = https://your-backend-url.onrender.com/api/v1
# 8. Click "Deploy"
# 9. Wait 1-2 minutes
# 10. Copy your frontend URL (will show after deploy)
```

---

## STEP 8: UPDATE BACKEND CORS

```bash
# 1. Edit Backend/src/index.js
nano Backend/src/index.js

# 2. Find CORS configuration (around line 40-50)
# 3. Update origin array to include your frontend:
app.use(cors({
  origin: [
    'http://localhost:5174',
    'http://localhost:3000',
    'https://aquasphere-xxxxx.vercel.app'  // Add your Vercel URL
  ],
  credentials: true
}));

# 4. Save and commit
git add Backend/src/index.js
git commit -m "Update CORS for production"
git push

# This will auto-redeploy on Render!
```

---

## STEP 9: VERIFY DEPLOYMENT

```bash
# Test backend health (in browser or curl)
curl https://aquasphere-backend-xxxxx.onrender.com/health

# Or visit in browser:
https://aquasphere-backend-xxxxx.onrender.com/health
# Should return: {"success": true}

# Test frontend
Visit: https://aquasphere-xxxxx.vercel.app
# Should show login page
# Try logging in
```

---

## STEP 10: MONITOR & DEBUG

```bash
# Check Backend Logs (Render)
# 1. Go to https://render.com
# 2. Select your service
# 3. Click "Logs"
# 4. Look for: "Server running on port"

# Check Frontend Logs (Vercel)
# 1. Go to https://vercel.com
# 2. Select your project
# 3. Click "Logs"
# 4. Look for deployment status

# Check Database (Neon)
# 1. Go to https://neon.tech
# 2. Click your project
# 3. Click "Tables"
# 4. Verify all tables exist
```

---

## 🚨 TROUBLESHOOTING COMMANDS

```bash
# If backend won't start, check logs
# In Render dashboard, go to Logs tab

# If database won't connect
npx prisma db push --skip-generate

# If build fails on frontend
cd Frontend
npm install
npm run build
# Check for errors in output

# Clear npm cache if issues persist
npm cache clean --force
```

---

## ✅ DEPLOYMENT VERIFICATION

```bash
After all steps complete, verify:

1. Frontend loads:
   https://aquasphere-xxxxx.vercel.app
   
2. Backend is running:
   curl https://aquasphere-backend-xxxxx.onrender.com/health
   
3. Database is connected:
   Check Neon dashboard for tables
   
4. Can login:
   Use your test credentials
   
5. Dashboard shows data:
   Production data should load
   
6. All roles work:
   Test Owner/Admin/PM/MM/Accountant
```

---

## 📊 FINAL URLS (Save These!)

```
Frontend: https://aquasphere-xxxxx.vercel.app
Backend:  https://aquasphere-backend-xxxxx.onrender.com
Database: Neon Console (https://console.neon.tech)

Share frontend URL with users!
```

---

**🎉 DEPLOYMENT COMPLETE! YOUR SYSTEM IS LIVE!**
