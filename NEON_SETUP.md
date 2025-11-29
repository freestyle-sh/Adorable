# Neon PostgreSQL Setup Guide

## Step 1: Create Neon Account & Project

### 1.1 Sign Up
1. Go to https://neon.tech
2. Click "Sign Up" (top right)
3. Sign up with:
   - Email: farhanmahee@gmail.com (or your email)
   - Password: Create strong password
   - Or use GitHub sign-in

### 1.2 Create First Project
After signing up, you'll be prompted to create a project:
1. **Project Name**: `adorable-erp` (or similar)
2. **Region**: Choose closest to your users
   - For Bangladesh: `ap-southeast-1` (Singapore) or `ap-south-1` (India)
3. **PostgreSQL Version**: Latest (15 or 16)
4. Click **Create Project**

### 1.3 Wait for Database Creation
- Neon creates your database (takes ~1-2 minutes)
- You'll see "Your database is ready" message
- Database name: `neondb` (default)

---

## Step 2: Get Connection String

### 2.1 Copy Connection String
1. In Neon dashboard, click your project
2. Look for **Connection String** or **Quick Start**
3. Click the **copy icon** next to the connection string
4. Format will be:
   ```
   postgresql://user:password@host/neondb?sslmode=require
   ```

### 2.2 Verify Connection Details
The string contains:
- **User**: `neon_user_xxx` (auto-generated)
- **Password**: Strong random password (auto-generated)
- **Host**: `ep-xxx.us-east-1.neon.tech` (your endpoint)
- **Database**: `neondb`
- **SSL Mode**: `require` (secure connection)

---

## Step 3: Update Environment Variables

### 3.1 Edit `.env` File
```bash
cd /workspaces/Adorable
nano .env
```

### 3.2 Update DATABASE_URL
Find this line:
```
DATABASE_URL=postgresql://localhost/adorable_erp
```

Replace with your Neon connection string:
```
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.neon.tech/neondb?sslmode=require
```

### 3.3 Save and Exit
- Press `Ctrl + O` → Enter (save)
- Press `Ctrl + X` (exit nano)

### 3.4 Verify Update
```bash
grep DATABASE_URL .env
```

---

## Step 4: Test Connection

### 4.1 Install PostgreSQL Client (if needed)
```bash
apt-get update && apt-get install -y postgresql-client
```

### 4.2 Test Connection
```bash
psql "postgresql://user:password@ep-xxx.us-east-1.neon.tech/neondb?sslmode=require" -c "SELECT 1"
```

**Success Output**:
```
 ?column?
----------
        1
(1 row)
```

**If Error**:
- Check connection string spelling
- Verify password is correct
- Check SSL mode is `require`
- Wait 1-2 minutes if just created

---

## Step 5: Run Drizzle Migrations

### 5.1 Push Schema to Database
```bash
cd /workspaces/Adorable
npx drizzle-kit push
```

**Output Example**:
```
✓ 1 schema change(s) detected
✓ Tables created:
  • organizations
  • users
  • customers
  • suppliers
  • products
  • cylinder_inventory
  • stock_balance
  • [... 25 more tables ...]
✓ Migration complete
```

### 5.2 Verify Tables Created
```bash
psql "postgresql://user:password@ep-xxx.us-east-1.neon.tech/neondb?sslmode=require" -c "\dt"
```

**Success Output** - Should list all 31 tables:
```
Schema |                 Name                  | Type  | Owner
--------+---------------------------------------+-------+----------
public | organizations                        | table | neon_user_xxx
public | branches                             | table | neon_user_xxx
public | warehouses                           | table | neon_user_xxx
public | users                                | table | neon_user_xxx
...
(31 rows)
```

---

## Step 6: Verify Schema in Neon Dashboard

### 6.1 SQL Editor
1. In Neon dashboard, click **SQL Editor**
2. Run this query:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   ```
3. Should return 31 tables

### 6.2 Check Specific Table
```sql
SELECT * FROM organizations LIMIT 1;
```

Should return empty result (no data yet - that's okay)

---

## Step 7: Test with Development Server

### 7.1 Start Development Server
```bash
cd /workspaces/Adorable
npm run dev
```

### 7.2 Create Sample Organization (via API)
```bash
curl -X POST http://localhost:3000/api/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "businessType": "Manufacturing",
    "registrationNumber": "BIN123456"
  }'
```

**Success Response**:
```json
{
  "id": "uuid-here",
  "name": "Test Company",
  "businessType": "Manufacturing",
  "registrationNumber": "BIN123456",
  "createdAt": "2025-11-19T10:00:00Z"
}
```

### 7.3 Verify Data in Neon
```bash
psql "postgresql://user:password@ep-xxx.us-east-1.neon.tech/neondb?sslmode=require" \
  -c "SELECT * FROM organizations;"
```

Should show your test company

---

## Step 8: Common Issues & Fixes

### Issue: "Connection refused"
**Cause**: Database URL is incorrect
**Fix**:
1. Copy fresh connection string from Neon dashboard
2. Paste into `.env`
3. Restart dev server: `npm run dev`

### Issue: "FATAL: Ident authentication failed"
**Cause**: Password contains special characters
**Fix**:
1. URL-encode special characters
2. Example: `@` → `%40`, `#` → `%23`
3. Or regenerate password in Neon dashboard

### Issue: "SSL certificate problem"
**Cause**: SSL mode not set correctly
**Fix**: Ensure connection string has `?sslmode=require`

### Issue: "Could not translate host name"
**Cause**: Network connectivity issue
**Fix**:
1. Check internet connection
2. Verify endpoint hostname is correct
3. Wait 1-2 minutes if recently created

### Issue: "relation does not exist"
**Cause**: Migrations not run yet
**Fix**: Run `npx drizzle-kit push` again

---

## Step 9: Backup & Maintenance

### 9.1 Automatic Backups
Neon provides automatic backups:
- **Free tier**: 7-day backup retention
- **Pro tier**: 30-day backup retention

Check backups in Neon dashboard:
1. Click project
2. Settings → Backups
3. View backup history

### 9.2 Manual Backup
```bash
pg_dump "postgresql://user:password@ep-xxx.us-east-1.neon.tech/neondb" \
  -f adorable_backup_$(date +%Y%m%d_%H%M%S).sql
```

This creates a SQL dump file of your entire database.

### 9.3 Restore from Backup
```bash
psql "postgresql://user:password@ep-xxx.us-east-1.neon.tech/neondb" \
  < adorable_backup_20251119_100000.sql
```

---

## Step 10: Production Checklist

Before deploying to Vercel:

- [ ] Database created in Neon
- [ ] Connection string in `.env`
- [ ] Local connection test successful (`psql` command works)
- [ ] Drizzle migrations pushed (`npx drizzle-kit push`)
- [ ] All 31 tables created
- [ ] Sample data test passed
- [ ] Dev server running with live database
- [ ] `.env` in `.gitignore` (don't commit passwords)
- [ ] Ready for Vercel environment variables setup

---

## Quick Reference

| Task | Command |
|------|---------|
| Test connection | `psql $DATABASE_URL -c "SELECT 1"` |
| List tables | `psql $DATABASE_URL -c "\dt"` |
| Push migrations | `npx drizzle-kit push` |
| Start dev server | `npm run dev` |
| Backup database | `pg_dump $DATABASE_URL > backup.sql` |
| View schema | Open SQL Editor in Neon dashboard |

---

## Support

**Neon Documentation**: https://neon.tech/docs

**Need Help?**
1. Check Neon dashboard for error messages
2. Review connection string format
3. Verify `.env` file syntax
4. Test psql connection independently

---

**Status**: Ready for Setup  
**Next Step**: Follow Steps 1-7 above, then verify with test API call
