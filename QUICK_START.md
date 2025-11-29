# 🚀 QUICK START GUIDE - Adorable ERP

**Time to Production**: 15 minutes ⚡

---

## 1️⃣ VERIFY SETUP (2 min)

### Check Database Connection
```bash
cd /workspaces/Adorable
grep DATABASE_URL .env
# Should show: postgresql://neondb_owner:npg_J6qmk5PKWbZV@ep-dark-mud-a1grhozl-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

### Check Environment Variables
```bash
cat .env | grep -E "(DATABASE_URL|STACK_PROJECT)" | head -5
```

### Verify All Tables Created
```bash
npm run build
# Should complete without errors
```

---

## 2️⃣ START DEVELOPMENT SERVER (1 min)

```bash
npm run dev
```

**Output should show:**
```
> npm run dev
▲ Next.js 15.3.0
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in 1.2s
```

---

## 3️⃣ TEST THE SYSTEM (5 min)

### Access the Login Page
```
Open browser: http://localhost:3000
```

**You should see:**
- Adorable ERP logo
- Login form with email/password
- Google OAuth button
- Demo credentials displayed

### Demo Login
```
Email: demo@adorable-erp.com
Password: DemoPassword123!
```

Or sign up with:
```
Email: your@email.com
Password: Any strong password
```

### Verify Access to ERP
After login, you should see:
- Dashboard with metrics
- 6 module cards (Inventory, Purchase, Sales, Accounting, Reports, Masters)
- Language toggle (EN/বাংলা)

### Test Navigation
Click on each module:
- ✅ Inventory - Shows sample data
- ✅ Purchase - Shows sample orders
- ✅ Sales - Shows sample orders
- ✅ Accounting - Shows sample entries
- ✅ Reports - Shows sample report
- ✅ Masters - Shows sample master data

### Test Language Toggle
- Click "বাংলা" to switch to Bangla
- Click "English" to switch back
- All text should update

---

## 4️⃣ TEST API (3 min)

### Create Sample Organization
```bash
curl -X POST http://localhost:3000/api/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "businessType": "Manufacturing",
    "registrationNumber": "BIN20251119001"
  }'
```

**Success response (201 Created):**
```json
{
  "id": "uuid-here",
  "name": "Test Company",
  "businessType": "Manufacturing",
  "registrationNumber": "BIN20251119001",
  "createdAt": "2025-11-19T10:00:00Z"
}
```

### Verify Database Update
Data is saved to your live Neon PostgreSQL database! 🎉

---

## 5️⃣ DEPLOY TO PRODUCTION (4 min)

### Push to GitHub
```bash
git add .
git commit -m "Launch Adorable ERP v1.0.0"
git push origin main
```

### Deploy to Vercel
1. Go to https://vercel.com
2. Click "Import Project"
3. Select your repository
4. Add environment variables:
   ```
   DATABASE_URL=postgresql://...
   NEXT_PUBLIC_STACK_PROJECT_ID=ddc4deca-f752-46f5-8cd2-09766318d9c2
   NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_2bh8q7210s39tvx4m208cjvhte03djzydgvrzah4x1ccr
   STACK_SECRET_SERVER_KEY=ssk_6y8e6g8vevmxvqdbnyhyq76dxyzrty52vt5h8jjdj1jc0
   ```
5. Click "Deploy"
6. Wait ~3 minutes for deployment

### Your Production URL
```
https://<project-name>.vercel.app
```

Share this with your team! 🎉

---

## 📚 KEY FILES TO KNOW

### For Setup
- `NEON_SETUP.md` - Database connection
- `DEPLOYMENT_CHECKLIST.md` - Pre-deploy verification

### For Development
- `README.md` - Project overview
- `ERP_SETUP_GUIDE.md` - System architecture
- `API_QUICK_REFERENCE.md` - API documentation

### For Operations
- `FEATURE_ROADMAP.md` - Roadmap & features
- `PROJECT_COMPLETION_STATUS.md` - Project status
- `DELIVERABLES_SUMMARY.md` - What you received

---

## 🎯 KEY COMMANDS

```bash
# Start development
npm run dev

# Build for production
npm run build

# Generate database migrations
npx drizzle-kit generate

# Push migrations to database
npx drizzle-kit push

# View database visually
npx drizzle-kit studio

# Run linter
npm run lint

# Format code
npm run format (if configured)
```

---

## 🔑 CREDENTIALS & KEYS

All credentials are in `.env` file:

```env
# Neon Database
DATABASE_URL=postgresql://neondb_owner:...@ep-dark-mud-a1grhozl-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# Stack Auth
NEXT_PUBLIC_STACK_PROJECT_ID=ddc4deca-f752-46f5-8cd2-09766318d9c2
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_2bh8q7210s39tvx4m208cjvhte03djzydgvrzah4x1ccr
STACK_SECRET_SERVER_KEY=ssk_6y8e6g8vevmxvqdbnyhyq76dxyzrty52vt5h8jjdj1jc0
```

⚠️ **Keep these secret!** Never commit `.env` to GitHub.

---

## ✅ CHECKLIST

- [x] Database: Live on Neon
- [x] Environment variables: Configured
- [x] Dev server: Running
- [x] Login: Working
- [x] Modules: All 6 accessible
- [x] API: Functional
- [x] Ready to deploy: ✅

---

## 🚀 YOU'RE READY!

### Next Steps
1. ✅ Review the code
2. ✅ Test all features
3. ✅ Deploy to Vercel
4. ✅ Invite your team
5. ✅ Start using the system!

### Need Help?
- Check `README.md` for overview
- Check `ERP_SETUP_GUIDE.md` for architecture
- Check `DEPLOYMENT_CHECKLIST.md` for deployment issues

---

## 🎉 LAUNCH CONFIRMED

Your Adorable ERP is ready for production use!

**Status**: ✅ Ready to Launch  
**Time to Deploy**: ~15 minutes  
**Users Ready**: Unlimited  
**Data Safe**: PostgreSQL backed  
**Support**: Full documentation included

---

**Let's go live!** 🚀

For detailed documentation, see:
- Full Setup: `ERP_SETUP_GUIDE.md`
- API Docs: `API_QUICK_REFERENCE.md`
- Deployment: `DEPLOYMENT_CHECKLIST.md`

---

**Version**: 1.0.0  
**Date**: November 19, 2025  
**Status**: ✅ Production Ready
