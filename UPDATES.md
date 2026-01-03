# Aether Dashboard - Update Guide

**How to update your dashboard to the latest version without losing data!**

---

## 📋 Before You Start

**⚠️ IMPORTANT:** Always backup your data before updating!

### What to Backup:

1. **Your database file** (`database.db`) - Contains all your users, servers, and settings
2. **Your configuration file** (`.env`) - Contains your API keys and settings

### How to Backup:

```bash
# Connect to your VPS via SSH
cd AETHER_PANEL

# Create a backup folder
mkdir -p backups

# Backup database
cp database.db backups/database-$(date +%Y%m%d-%H%M%S).db

# Backup .env file
cp .env backups/.env-$(date +%Y%m%d-%H%M%S)
```

**✅ Now you're safe to update!**

---

## 🔄 How to Update

**Choose the method based on how you installed the dashboard:**

### Method 1: If You Installed via GitHub (Git Clone)

**This is the easiest method!**

**Step 1: Connect to your VPS via SSH**

**Step 2: Go to your dashboard folder:**
```bash
cd AETHER_PANEL
```

**Step 3: Stop the dashboard (optional, but recommended):**
```bash
pm2 stop aether-dashboard
```

**Step 4: Pull the latest updates:**
```bash
git pull origin main
```

**What this does:** Downloads the latest version from GitHub

**Step 5: Install any new dependencies:**
```bash
npm install
```

**What this does:** Installs any new packages that were added in the update

**Step 6: Restart the dashboard:**
```bash
pm2 restart aether-dashboard
```

**✅ Done!** Your dashboard is now updated!

---

### Method 2: If You Installed via SFTP (File Upload)

**If you uploaded files manually, follow these steps:**

**Step 1: Connect to your VPS via SSH**

**Step 2: Go to your dashboard folder:**
```bash
cd AETHER_PANEL
```

**Step 3: Stop the dashboard:**
```bash
pm2 stop aether-dashboard
```

**Step 4: Download the latest version:**
- Go to the GitHub repository
- Download the latest version (ZIP file or clone)
- Extract the files on your computer

**Step 5: Upload new files via SFTP:**
- Connect using FileZilla (or similar)
- **IMPORTANT:** Only replace these files/folders:
  - `public/` folder
  - `routes/` folder
  - `views/` folder
  - `config/` folder
  - `middleware/` folder
  - `server.js`
  - `package.json`
  - Any new files (like `reset-admin-password.js`)

**⚠️ DO NOT DELETE OR REPLACE:**
- `database.db` - Your data!
- `.env` - Your configuration!

**Step 6: Install any new dependencies:**
```bash
npm install
```

**Step 7: Restart the dashboard:**
```bash
pm2 restart aether-dashboard
```

**✅ Done!** Your dashboard is now updated!

---

## ✅ Update Checklist

**Use this checklist every time you update:**

- [ ] **Backed up `database.db`** - Your data is safe!
- [ ] **Backed up `.env` file** - Your settings are safe!
- [ ] **Stopped the dashboard** - `pm2 stop aether-dashboard`
- [ ] **Updated the files** - Using git pull or SFTP
- [ ] **Installed dependencies** - `npm install`
- [ ] **Restarted the dashboard** - `pm2 restart aether-dashboard`
- [ ] **Tested the dashboard** - Logged in and checked everything works
- [ ] **Verified data is intact** - Users, servers, and settings are still there

**✅ If all checked, your update was successful!**

---

## 📝 Version Changelog

### Version 1.2 (Latest)

**Release Date:** Current

**New Features:**
- ✅ **Logo Shape Customization** - Choose from 6 different logo shapes!
  - Available shapes: Square, Circle, Rounded, Triangle, Hexagon, Diamond
  - Live preview in Admin Settings
  - Applies to all logos across the dashboard
  - Accessible via Admin Settings → Branding Settings → Logo Shape dropdown

- ✅ **Branding Assets Reorganization** - Better file organization
  - Default assets moved to `public/assets/defaults/`
  - User-uploaded assets stored in `public/assets/branding/`
  - Cleaner separation between default and custom branding

- ✅ **Admin Watermark** - "Powered by Aether Dashboard" watermark
  - Appears on Admin Panel and Admin Settings pages
  - Fixed position in bottom-right corner
  - Subtle, non-intrusive design
  - Responsive for mobile devices

**Improvements:**
- 🎨 **Branding Flexibility** - More customization options for dashboard appearance
- 🐛 **Bug Fixes** - Fixed Admin Settings link disappearing when navigating between pages
- 📱 **Mobile Support** - Watermark adapts to mobile screen sizes
- 🔧 **Code Optimization** - Improved multer configuration for file uploads

**How to Update:**
- If using GitHub: `git pull origin main && npm install && pm2 restart aether-dashboard`
- If using SFTP: Download latest version, replace files (keep database.db and .env), run `npm install`, restart dashboard

**Note:** The database will automatically add the `logo_shape` column on first run. No manual migration needed!

---

### Version 1.0.4

**Release Date:** Previous

**New Features:**
- ✅ **Admin Password Reset Script** - Reset your admin password without losing data!
  - New file: `reset-admin-password.js`
  - Use: `node reset-admin-password.js "your-new-password"`
  - Safe: Does NOT delete any data

**Improvements:**
- 📚 **Updated Documentation** - Better password recovery instructions
- 🔧 **Better Troubleshooting** - Clearer steps for password recovery

**How to Update:**
- If using GitHub: `git pull origin main && npm install && pm2 restart aether-dashboard`
- If using SFTP: Download latest version, replace files (keep database.db and .env), run `npm install`, restart dashboard

---

### Version 1.0.3

**Release Date:** Previous

**New Features:**
- ✅ **Mobile-Responsive Design** - Full mobile support!
  - Hamburger menu for mobile navigation
  - Scrollable admin tables on mobile
  - Scrollable tab navigation on mobile
  - Touch-friendly buttons and forms
  - Responsive layout for all screen sizes

**Improvements:**
- 📱 **Mobile UI** - Dashboard now works perfectly on phones and tablets
- 🎨 **Better UX** - Improved user experience on mobile devices
- 📊 **Scrollable Tables** - Admin panel tables scroll horizontally on mobile
- 🧭 **Scrollable Tabs** - Tab navigation scrolls on mobile

**How to Update:**
- If using GitHub: `git pull origin main && npm install && pm2 restart aether-dashboard`
- If using SFTP: Download latest version, replace files (keep database.db and .env), run `npm install`, restart dashboard

---

### Version 1.0.2

**Release Date:** Previous

**New Features:**
- ✅ **Production Stability** - Better support for production environments
  - Reverse proxy support (Nginx)
  - HTTPS/SSL support
  - Session cookie improvements
  - Server binding improvements

**Improvements:**
- 🔒 **Security** - Better session handling
- 🌐 **Production Ready** - Works behind reverse proxies
- 📝 **Documentation** - Comprehensive production setup guide

**How to Update:**
- If using GitHub: `git pull origin main && npm install && pm2 restart aether-dashboard`
- If using SFTP: Download latest version, replace files (keep database.db and .env), run `npm install`, restart dashboard

---

### Version 1.0.1

**Release Date:** Previous

**New Features:**
- ✅ **Production Stability Fixes** - Fixed issues with reverse proxy
- ✅ **Session Improvements** - Better cookie handling for HTTPS

**Improvements:**
- 🔧 **Bug Fixes** - Fixed login redirect issues
- 📚 **Documentation** - Updated README for Linux VPS

**How to Update:**
- If using GitHub: `git pull origin main && npm install && pm2 restart aether-dashboard`
- If using SFTP: Download latest version, replace files (keep database.db and .env), run `npm install`, restart dashboard

---

### Version 1.0.0

**Release Date:** Initial Release

**Features:**
- ✅ **Core Dashboard** - Complete dashboard functionality
- ✅ **User Management** - User registration and management
- ✅ **Server Management** - Create and manage game servers
- ✅ **Linkvertise Integration** - Revenue generation via Linkvertise
- ✅ **Resource Store** - Purchase RAM, CPU, Storage with coins
- ✅ **Admin Panel** - Full admin control panel
- ✅ **Pterodactyl Integration** - Connect to Pterodactyl panel

**Initial Release:**
- Production-ready dashboard
- Complete documentation
- Linux VPS installation guide

---

## ❓ Troubleshooting Updates

### "Update failed" or "Git pull doesn't work"

**If you get errors when updating:**

1. **Check if you're in the right folder:**
   ```bash
   pwd
   ```
   Should show: `/root/AETHER_PANEL` or similar

2. **If using GitHub, check your connection:**
   ```bash
   git status
   ```
   This shows if you have a git repository

3. **If files are modified, you might need to stash changes:**
   ```bash
   git stash
   git pull origin main
   ```

### "Dashboard won't start after update"

1. **Check the logs:**
   ```bash
   pm2 logs aether-dashboard
   ```

2. **Reinstall dependencies:**
   ```bash
   npm install
   ```

3. **Restart the dashboard:**
   ```bash
   pm2 restart aether-dashboard
   ```

### "I lost my data after updating"

**If you accidentally deleted your database:**

1. **Check your backups:**
   ```bash
   ls -la backups/
   ```

2. **Restore from backup:**
   ```bash
   cp backups/database-YYYYMMDD-HHMMSS.db database.db
   ```

3. **Restart the dashboard:**
   ```bash
   pm2 restart aether-dashboard
   ```

**💡 Always backup before updating!**

---

## 📞 Need Help?

If you encounter issues during updates:

1. **Check the logs:** `pm2 logs aether-dashboard`
2. **Review this guide** - Most issues are covered here
3. **Check the main README** - Installation and troubleshooting guide
4. **Restore from backup** - If something goes wrong, restore your backup

---

## 💡 Tips for Smooth Updates

1. **Always backup first** - Never skip this step!
2. **Update during low traffic** - Less disruption for users
3. **Test after updating** - Make sure everything works
4. **Keep backups** - Don't delete old backups immediately
5. **Read changelog** - Know what changed in each version

---

**Last Updated:** Version 1.2

**Made with ❤️ for free hosting providers**

