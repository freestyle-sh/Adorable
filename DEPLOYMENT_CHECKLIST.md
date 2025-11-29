# Adorable ERP - Deployment Checklist

## Pre-Deployment Verification ✅

### 1. Database Setup ⬜

- [ ] Create Neon PostgreSQL account at https://neon.tech
- [ ] Create new project in Neon console
- [ ] Copy connection string (DATABASE_URL)
- [ ] Update `.env` file with DATABASE_URL
- [ ] Test connection: `psql <DATABASE_URL>`
- [ ] Run migrations:
  ```bash
  npx drizzle-kit push
  ```
- [ ] Verify all 31 tables created
- [ ] Verify enums created properly

### 2. Authentication Setup ⬜

- [ ] Create Stack Auth account at https://stack-auth.com
- [ ] Create new application
- [ ] Get `NEXT_PUBLIC_STACK_PROJECT_ID`
- [ ] Get `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`
- [ ] Get `STACK_SECRET_SERVER_KEY`
- [ ] Enable localhost callbacks in Stack Auth dashboard
- [ ] Add credentials to `.env`

### 3. API Keys ⬜

- [ ] Get Anthropic API key from https://console.anthropic.com
- [ ] Get Freestyle API key from https://admin.freestyle.sh
- [ ] Update `.env` with both keys

### 4. Environment Variables ⬜

Verify `.env` contains:
- [ ] DATABASE_URL=postgresql://...
- [ ] ANTHROPIC_API_KEY=sk-...
- [ ] FREESTYLE_API_KEY=...
- [ ] NEXT_PUBLIC_STACK_PROJECT_ID=...
- [ ] NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=...
- [ ] STACK_SECRET_SERVER_KEY=...
- [ ] REDIS_URL=redis://... (optional, for production)

### 5. Code Quality ⬜

- [ ] No TypeScript errors: `npm run build`
- [ ] No linting errors: `npm run lint`
- [ ] All API routes functional
- [ ] Dashboard loads without errors
- [ ] No console errors in browser

### 6. Testing ⬜

- [ ] Development server runs: `npm run dev`
- [ ] Dashboard accessible at localhost:3000
- [ ] Language toggle works
- [ ] Sample API call successful:
  ```bash
  curl http://localhost:3000/api/organizations
  ```

---

## GitHub Preparation ✅

### 1. Repository Setup ⬜

- [ ] GitHub account created
- [ ] Repository created (farhanmahee/Adorable)
- [ ] Repository is public or private (as needed)

### 2. Code Commit ⬜

```bash
git config --global user.email "you@example.com"
git config --global user.name "Your Name"
git add .
git commit -m "Complete ERP system implementation v1.0.0"
git push origin main
```

- [ ] All files committed
- [ ] No uncommitted changes
- [ ] Push successful
- [ ] GitHub reflects latest code

### 3. .gitignore Verification ⬜

```
.env
.env.local
node_modules/
.next/
*.log
.DS_Store
```

- [ ] Sensitive files not in repository
- [ ] `.env` is in `.gitignore`
- [ ] No API keys in repo

---

## Vercel Deployment ✅

### 1. Vercel Account ⬜

- [ ] Create account at https://vercel.com
- [ ] Connect GitHub account
- [ ] Grant repository access

### 2. Import Project ⬜

- [ ] Click "Import Project" in Vercel dashboard
- [ ] Select "farhanmahee/Adorable" repository
- [ ] Project name: "adorable-erp" (or similar)
- [ ] Framework preset: Next.js (should auto-detect)

### 3. Environment Variables ⬜

Add in Vercel project settings:

```
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-...
FREESTYLE_API_KEY=...
NEXT_PUBLIC_STACK_PROJECT_ID=...
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=...
STACK_SECRET_SERVER_KEY=...
NODE_ENV=production
```

- [ ] All variables added
- [ ] No typos in variable names
- [ ] Sensitive values encrypted by Vercel

### 4. Deployment Configuration ⬜

- [ ] Build command: `npm run build` (default)
- [ ] Output directory: `.next` (default)
- [ ] Install command: `npm install` (default)
- [ ] Production branch: `main` (default)

### 5. Deploy ⬜

- [ ] Click "Deploy" button
- [ ] Monitor deployment logs
- [ ] Build completes successfully
- [ ] No build errors

---

## Post-Deployment Verification ✅

### 1. Vercel URL ⬜

- [ ] Deployment URL generated
- [ ] URL format: `https://<project-name>.vercel.app`
- [ ] Copy deployment URL
- [ ] Add to `VERCEL_URL` in environment

### 2. Live Site Testing ⬜

- [ ] Access deployment URL in browser
- [ ] Dashboard loads successfully
- [ ] No console errors (DevTools F12)
- [ ] Language toggle works
- [ ] Metrics display correctly

### 3. API Testing ⬜

```bash
curl https://<project-name>.vercel.app/api/organizations
```

- [ ] API endpoints respond with correct data
- [ ] Status codes are appropriate
- [ ] No authentication errors (unless protected)

### 4. Database Connection ⬜

- [ ] Database operations work on production
- [ ] Stock calculations functioning
- [ ] Ledger posting working
- [ ] Reports generating correctly

### 5. Performance ⬜

- [ ] Page load time acceptable (<3s)
- [ ] No 5xx errors in logs
- [ ] Network requests complete
- [ ] Images and assets load

---

## Custom Domain Setup ⬜ (Optional)

### 1. Domain Registration ⬜

- [ ] Register domain (GoDaddy, Namecheap, etc.)
- [ ] Note domain name

### 2. Connect to Vercel ⬜

In Vercel project settings:
- [ ] Go to "Domains"
- [ ] Click "Add"
- [ ] Enter domain name
- [ ] Follow Vercel's DNS setup instructions

### 3. DNS Configuration ⬜

- [ ] Update DNS records in domain registrar
- [ ] Add Vercel nameservers or CNAME
- [ ] Wait for DNS propagation (5-48 hours)
- [ ] Verify domain connects to Vercel

### 4. SSL Certificate ⬜

- [ ] Vercel auto-generates SSL
- [ ] Certificate auto-renews
- [ ] HTTPS enabled by default
- [ ] Test with https://yourdomain.com

---

## Security Checklist ✅

- [ ] No API keys in code
- [ ] No credentials in GitHub
- [ ] `.env` file in `.gitignore`
- [ ] Environment variables set in Vercel
- [ ] Database password is strong
- [ ] HTTPS enabled on domain
- [ ] Stack Auth configured for production
- [ ] CORS properly configured
- [ ] Input validation implemented
- [ ] SQL injection prevention (Drizzle ORM handles)

---

## Monitoring & Maintenance ⬜

### 1. Error Tracking ⬜

- [ ] Set up error logging (optional: Sentry)
- [ ] Configure alerts for failures
- [ ] Monitor error rate

### 2. Performance Monitoring ⬜

- [ ] Enable Vercel analytics
- [ ] Monitor page load times
- [ ] Track API response times
- [ ] Monitor database performance

### 3. Backup Strategy ⬜

- [ ] Schedule database backups
- [ ] Test backup restore
- [ ] Store backups securely
- [ ] Document recovery process

### 4. Updates & Patches ⬜

- [ ] Monitor dependency updates
- [ ] Review security advisories
- [ ] Test updates in staging
- [ ] Deploy to production

---

## Documentation ⬜

- [ ] README.md complete
- [ ] Setup guide available (ERP_SETUP_GUIDE.md)
- [ ] API reference available (API_QUICK_REFERENCE.md)
- [ ] Database schema documented
- [ ] Deployment process documented

---

## Team Communication ⬜

- [ ] Share deployment URL with team
- [ ] Provide access credentials
- [ ] Document user roles and permissions
- [ ] Create user guide for main features
- [ ] Establish support process

---

## Post-Launch Tasks ⬜

### Phase 1: Stability (First Week)
- [ ] Monitor error logs daily
- [ ] Fix critical bugs immediately
- [ ] Test all user workflows
- [ ] Gather user feedback

### Phase 2: Enhancement (Weeks 2-4)
- [ ] Implement frontend module pages
- [ ] Add pagination and filtering
- [ ] Optimize database queries
- [ ] Enhance UI/UX

### Phase 3: Features (Month 2+)
- [ ] Add payment gateway integration
- [ ] Implement export to PDF/Excel
- [ ] Add scheduled reports
- [ ] Implement SMS/Email notifications

---

## Troubleshooting Guide

### Build Fails
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Error
```bash
# Test connection
psql $DATABASE_URL
# Check DATABASE_URL format
# Verify Neon project is active
```

### API Returns 404
```bash
# Verify route exists
# Check URL format matches /api/organizations/{orgId}
# Verify orgId exists in database
```

### Environment Variables Not Working
```bash
# Redeploy after adding variables
# In Vercel: Settings → Environment Variables
# Restart deployment
```

---

## Success Criteria ✅

- ✅ Application deployed to Vercel
- ✅ All pages load without errors
- ✅ Database operations working
- ✅ API endpoints responding correctly
- ✅ Authentication functional
- ✅ Multi-language support active
- ✅ Performance acceptable
- ✅ Security measures in place
- ✅ Team trained and ready
- ✅ Monitoring and alerts configured

---

## Support Contacts

**Technical Issues**:
- GitHub Issues: https://github.com/farhanmahee/Adorable/issues
- Email: support@adorable-erp.com

**Vercel Support**: https://vercel.com/support

**Neon Support**: https://neon.tech/docs/support

**Stack Auth Support**: https://stack-auth.com/docs

---

## Deployment Sign-Off

- [ ] Reviewed and approved by DevOps/Lead
- [ ] All stakeholders notified
- [ ] Deployment date/time scheduled
- [ ] Rollback plan documented
- [ ] Go/No-go decision made

**Approved By**: ____________________  
**Date**: __________________  
**Time**: __________________

---

**Version**: 1.0.0  
**Last Updated**: November 19, 2025  
**Status**: Ready for Deployment
