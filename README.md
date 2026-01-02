# Aether Dashboard - Production Setup Guide

A simple and beginner-friendly dashboard for managing Pterodactyl servers. Users can earn coins by completing Linkvertise links and use those coins to purchase server resources (RAM, CPU, Storage).

**Version:** 1.0.0  
**Status:** Production Ready ✅

---

## 🎯 What is This?

This is a web application (like a website) that lets you:
- Create an account and log in (with Discord OAuth support)
- Earn coins by completing Linkvertise links
- Use coins to buy server resources (RAM, CPU, Storage)
- Create and manage game servers via Pterodactyl panel
- Admin panel to control everything (users, servers, coins, pricing)

**Perfect for beginners!** No complex setup needed.

---

## 📋 Prerequisites

Before installing, make sure you have:

1. **A Computer** (Windows, Mac, or Linux)
2. **Internet Connection**
3. **Node.js Installed** (version 16 or higher)

### Installing Node.js (Step-by-Step)

1. **Go to**: https://nodejs.org/
2. **Download** the "LTS" version (the green button)
3. **Run the installer** and click "Next" through all steps
4. **Restart your computer** after installation
5. **Verify it worked**: 
   - Open Command Prompt (Windows) or Terminal (Mac/Linux)
   - Type: `node --version`
   - If you see a version number (like v18.17.0 or higher), you're good! ✅

---

## 🚀 Quick Start (5 Minutes)

Follow these steps in order:

### Step 1: Download/Extract the Project

- If you downloaded a ZIP file, **extract it** to a folder (like `C:\AETHER_PANEL` or `~/AETHER_PANEL`)
- Remember where you put it!

### Step 2: Open Terminal/Command Prompt

**Windows:**
- Press `Windows Key + R`
- Type `cmd` and press Enter
- Or search "Command Prompt" in Start Menu

**Mac:**
- Press `Cmd + Space`
- Type "Terminal" and press Enter

**Linux:**
- Press `Ctrl + Alt + T`

### Step 3: Go to Your Project Folder

In the terminal, type:
```bash
cd path/to/your/AETHER_PANEL
```

**Example for Windows:**
```bash
cd C:\AETHER_PANEL
```

**Example for Mac/Linux:**
```bash
cd ~/AETHER_PANEL
```

💡 **Tip**: You can also drag the folder into the terminal window to auto-fill the path!

### Step 4: Install Dependencies

This downloads all the code libraries needed to run the dashboard.

```bash
npm install
```

⏳ **Wait for it to finish** (may take 1-2 minutes). You'll see lots of text scrolling - that's normal!

### Step 5: Create the Configuration File

1. **Create a new file** called `.env` in your project folder
   - You can use Notepad (Windows) or TextEdit (Mac)
   - Make sure it's named exactly `.env` (with the dot at the start!)

2. **Copy and paste this** into the `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
SESSION_SECRET=change-this-to-any-random-text-12345-very-secure-key

# Discord OAuth (optional - leave empty if you don't have Discord setup)
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_CALLBACK_URL=http://localhost:3000/auth/discord/callback

# Pterodactyl Panel (optional - leave empty if you don't have Pterodactyl)
# You can also configure this via Admin Panel after installation
PTERODACTYL_URL=
PTERODACTYL_API_KEY=
```

3. **Change the SESSION_SECRET** to any random text (like `my-super-secret-key-abc123xyz789`)
   - ⚠️ **IMPORTANT**: Make this at least 32 characters long for production!

4. **Save the file**

### Step 6: Start the Server

```bash
npm start
```

You should see:
```
✅ Database initialized
Server running on http://localhost:3000
```

🎉 **Success!** Your dashboard is now running!

### Step 7: Open in Browser

1. Open your web browser (Chrome, Firefox, Edge, etc.)
2. Go to: `http://localhost:3000`
3. You should see the login page!

### Step 8: Login as Admin

The dashboard creates a default admin account for you:

- **Username**: `admin`
- **Password**: `admin123`

⚠️ **IMPORTANT**: Change this password immediately after first login!

---

## 🌐 Production Deployment

For production use (making it accessible to others online), follow these additional steps:

### Option 1: Using PM2 (Recommended for VPS/Dedicated Server)

PM2 keeps your application running even if it crashes and automatically restarts it.

#### Install PM2:
```bash
npm install -g pm2
```

#### Start the Dashboard with PM2:
```bash
pm2 start server.js --name aether-dashboard
```

#### Useful PM2 Commands:
```bash
pm2 list              # View all running apps
pm2 logs aether-dashboard  # View logs
pm2 restart aether-dashboard  # Restart the app
pm2 stop aether-dashboard     # Stop the app
pm2 delete aether-dashboard  # Remove from PM2
pm2 save              # Save current process list
pm2 startup           # Auto-start on server reboot
```

### Option 2: Using Systemd (Linux)

Create a systemd service file:

1. Create file: `/etc/systemd/system/aether-dashboard.service`
2. Add this content:

```ini
[Unit]
Description=Aether Dashboard
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/AETHER_PANEL
ExecStart=/usr/bin/node /path/to/AETHER_PANEL/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

3. Enable and start:
```bash
sudo systemctl enable aether-dashboard
sudo systemctl start aether-dashboard
sudo systemctl status aether-dashboard
```

### Production Environment Variables

Update your `.env` file for production:

```env
# Server Configuration
PORT=3000
NODE_ENV=production
SESSION_SECRET=your-very-long-random-secret-key-at-least-32-characters

# Discord OAuth (if using)
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_CALLBACK_URL=https://yourdomain.com/auth/discord/callback

# Pterodactyl Panel (if using)
PTERODACTYL_URL=https://panel.yoursite.com
PTERODACTYL_API_KEY=ptlc_xxxxxxxxxxxxx
```

### Setting Up Reverse Proxy (Nginx)

If you want to use a domain name and HTTPS, set up Nginx:

1. **Install Nginx** (if not already installed):
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

2. **Create Nginx configuration** at `/etc/nginx/sites-available/aether-dashboard`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **Enable the site**:
```bash
sudo ln -s /etc/nginx/sites-available/aether-dashboard /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

4. **Set up SSL with Let's Encrypt** (for HTTPS):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Security Checklist for Production

- [ ] Changed default admin password
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Used a strong `SESSION_SECRET` (32+ characters, random)
- [ ] Set up HTTPS/SSL certificate
- [ ] Configured firewall (only allow ports 80, 443, and SSH)
- [ ] Set up regular backups of `database.db`
- [ ] Updated Node.js to latest LTS version
- [ ] Using PM2 or systemd to keep app running
- [ ] Set up monitoring/logging
- [ ] Restricted admin panel access (if possible)

---

## 📖 Detailed Setup Guide

### Understanding the Files

Don't worry - you don't need to understand everything! But here's what the main files do:

- **`server.js`** - The main program that runs everything
- **`package.json`** - Lists all the code libraries needed
- **`.env`** - Your settings file (passwords, API keys, etc.)
- **`database.db`** - Where all your data is stored (created automatically)
- **`views/`** folder - The HTML pages users see
- **`routes/`** folder - The code that handles different pages
- **`public/`** folder - CSS and JavaScript files
- **`config/`** folder - Configuration files (database, Pterodactyl)

### What is `.env` File?

The `.env` file stores your secret settings. Think of it like a settings menu:

- **PORT**: Which port number to use (3000 is fine, change if needed)
- **NODE_ENV**: Set to `production` for production, `development` for testing
- **SESSION_SECRET**: A password to keep sessions secure (make it random and long!)
- **Discord settings**: Only needed if you want Discord login
- **Pterodactyl settings**: Only needed if you have a Pterodactyl panel

### What is SQLite Database?

SQLite is a simple database (like an Excel file). It stores:
- User accounts
- Server information
- Coin balances
- Link completion history
- Resource purchases
- Admin settings

**You don't need to do anything** - it's created automatically as `database.db`!

**Backup Tip**: Just copy the `database.db` file to backup all your data!

---

## 🔧 Optional: Setting Up Discord Login

If you want users to log in with Discord:

### Step 1: Create Discord Application

1. Go to: https://discord.com/developers/applications
2. Click **"New Application"**
3. Give it a name (like "Aether Dashboard")
4. Click **"Create"**

### Step 2: Get Your Credentials

1. In the left sidebar, click **"OAuth2"**
2. Under **"Redirects"**, click **"Add Redirect"**
3. Add this URL: 
   - Development: `http://localhost:3000/auth/discord/callback`
   - Production: `https://yourdomain.com/auth/discord/callback`
4. Click **"Save Changes"**
5. Copy the **"Client ID"** (looks like: `123456789012345678`)
6. Click **"Reset Secret"** and copy the **"Client Secret"** (looks like: `abc123xyz789...`)

### Step 3: Add to `.env` File

Open your `.env` file and add:

```env
DISCORD_CLIENT_ID=your-client-id-here
DISCORD_CLIENT_SECRET=your-client-secret-here
DISCORD_CALLBACK_URL=http://localhost:3000/auth/discord/callback
```

Replace `your-client-id-here` and `your-client-secret-here` with the values you copied.

### Step 4: Restart Server

Stop the server (press `Ctrl + C`) and start it again:

```bash
npm start
```

✅ Discord login should now work!

---

## 🎮 Optional: Setting Up Pterodactyl Panel

**Note**: This is only needed if you want to create real game servers. You can use the dashboard without this!

### What is Pterodactyl?

Pterodactyl is a game server management panel. It lets you create and manage Minecraft, CS:GO, and other game servers.

### Getting Pterodactyl API Key

1. **Log into your Pterodactyl panel**
2. Go to **"Admin"** → **"API Credentials"**
3. Click **"Create New Credentials"**
4. Give it a name (like "Aether Dashboard")
5. Set permissions to **"Read & Write"**
6. Click **"Create"**
7. **Copy the API key** (you'll only see it once!)
8. **Copy your panel URL** (like: `https://panel.yoursite.com`)

### Configure via Admin Panel (Recommended)

1. Log into the dashboard as admin
2. Go to **"Admin Panel"** → **"Panel"** tab
3. Enter your **Panel URL** and **API Key**
4. Click **"Test Connection"** to verify
5. Click **"Connect"** to save

### Or Add to `.env` File

```env
PTERODACTYL_URL=https://panel.yoursite.com
PTERODACTYL_API_KEY=ptlc_xxxxxxxxxxxxx
```

Replace with your actual URL and API key.

### Restart Server

```bash
npm start
```

✅ Pterodactyl integration is now active!

---

## 💰 Setting Up Linkvertise (For Admins)

Linkvertise lets users earn coins by completing links. Here's how to set it up:

### Step 1: Get Your Publisher Link

1. Go to: https://publisher.linkvertise.com/ac/YOUR_ID
   - Replace `YOUR_ID` with your Linkvertise publisher ID
2. Copy your publisher link (looks like: `https://publisher.linkvertise.com/ac/1450748`)

### Step 2: Configure in Admin Panel

1. **Log in** as admin
2. Go to **"Admin Panel"** (shield icon in sidebar)
3. Click the **"Linkvertise"** tab
4. In **"Linkvertise Configuration"**:
   - Paste your **Publisher Link**
   - Publisher ID will be auto-filled
   - Set **Default Coins** (e.g., 10)
   - Set **Cooldown Timer** (seconds between link completions, e.g., 30)
   - Click **"Save Configuration"**

### Step 3: Add Links

1. In the **"Manage Links"** section, click **"Add New Link"**
2. Fill in:
   - **Link Title**: "Complete this link" (or any name)
   - **Linkvertise URL**: The actual Linkvertise link users will complete
     - ⚠️ **NOT** your publisher link!
     - This is the monetized link you create in Linkvertise dashboard
   - **Coins Reward**: How many coins users earn (e.g., 15)
   - **Active**: Check this box to make it visible
3. Click **"Save Link"**

### How to Get Linkvertise URLs

1. Log into your Linkvertise publisher account
2. Create a new monetized link
3. Copy the generated Linkvertise URL (looks like: `https://linkvertise.com/123456/...`)
4. Use that URL when adding links in the admin panel

---

## 🎨 Using the Dashboard

### For Regular Users

1. **Sign Up**: Create account or use Discord login
2. **Earn Coins**: 
   - Go to "Linkvertise" page
   - Click "Complete Link" on any link
   - Complete the Linkvertise steps
   - Earn coins automatically!
   - Wait for cooldown timer before completing again
3. **Buy Resources**:
   - Go to "Resource Store"
   - Choose resource type (RAM, CPU, Storage, or Server Slot)
   - Enter amount and purchase with coins
   - Resources are added to your pool
4. **Create Servers**:
   - Go to "Create Server"
   - Enter server name
   - Select game type (egg)
   - Set resources (RAM, CPU, Storage)
   - Resources are deducted from your pool
5. **Manage Servers**: 
   - Go to "Manage Servers" to see all your servers
   - Click "Open in Panel" to access Pterodactyl panel
   - Click "Delete" to remove a server (resources are returned)

### For Administrators

1. **Admin Panel**: Click the shield icon (🛡️) in sidebar
2. **User Management**: 
   - View all users
   - Edit user details
   - Delete users
3. **Server Management**: 
   - See all servers
   - Delete servers if needed
4. **Coin Management**: 
   - Add or remove coins from any user
   - Search by username
5. **Linkvertise Management**: 
   - Configure publisher settings
   - Add/edit/delete links
   - Set coin rewards and cooldown timer
6. **Store Management**: 
   - Configure resource prices
   - Set pricing for RAM, CPU, Storage, and Server Slots
7. **Panel Configuration**: 
   - Connect to Pterodactyl panel
   - Manage eggs and allocations
   - Sync users to Pterodactyl

---

## ❓ Troubleshooting

### "npm is not recognized" or "node is not recognized"

**Problem**: Node.js is not installed or not in your PATH.

**Solution**:
1. Reinstall Node.js from https://nodejs.org/
2. Make sure to check "Add to PATH" during installation
3. Restart your computer
4. Try again

### "Port 3000 is already in use"

**Problem**: Another program is using port 3000.

**Solution**:
1. Open `.env` file
2. Change `PORT=3000` to `PORT=3001` (or any other number)
3. Restart server
4. Go to `http://localhost:3001` instead

### "Cannot find module" errors

**Problem**: Dependencies not installed.

**Solution**:
```bash
npm install
```

### Database errors

**Problem**: Database file is corrupted.

**Solution**:
1. Stop the server (Ctrl + C)
2. Delete the `database.db` file
3. Start server again (it will recreate it)
4. ⚠️ **Warning**: This will delete all data! Make sure you have a backup!

### Discord login not working

**Checklist**:
- ✅ Redirect URI matches exactly in Discord Developer Portal
- ✅ Client ID and Secret are correct in `.env`
- ✅ No extra spaces in `.env` file
- ✅ Restarted server after adding Discord credentials
- ✅ Using correct callback URL (http vs https, localhost vs domain)

### Can't access dashboard

**Checklist**:
- ✅ Server is running (you see "Server running on...")
- ✅ Using correct URL: `http://localhost:3000` (or your configured port)
- ✅ No firewall blocking the connection
- ✅ Browser is not in offline mode
- ✅ Check server logs for errors

### "Admin password doesn't work"

**Solution**:
1. Delete `database.db` file
2. Restart server (creates new admin account)
3. Login with: `admin` / `admin123`
4. Change password immediately!

### Server creation not working

**Checklist**:
- ✅ Pterodactyl panel is connected (check Admin Panel → Panel tab)
- ✅ Eggs are synced from Pterodactyl
- ✅ Allocations are synced from Pterodactyl
- ✅ Default nest and location are configured
- ✅ User has enough purchased resources
- ✅ User has available server slots

### Linkvertise not giving coins

**Checklist**:
- ✅ Linkvertise configuration is saved in Admin Panel
- ✅ Link is marked as "Active" in Admin Panel
- ✅ Cooldown timer has expired (if applicable)
- ✅ Check server logs for errors

---

## 🔒 Security Tips

### For Development:
1. **Change admin password** immediately after first login
2. **Use a strong SESSION_SECRET** (random text, at least 20 characters)
3. **Don't share your `.env` file** - it contains secrets!

### For Production:
1. **Change admin password** immediately after first login
2. **Use a very strong SESSION_SECRET** (random text, at least 32 characters)
3. **Set `NODE_ENV=production`** in `.env`
4. **Use HTTPS** - Set up SSL certificate (Let's Encrypt is free)
5. **Keep Node.js updated** - Run `npm update` regularly
6. **Set up firewall** - Only allow necessary ports (80, 443, SSH)
7. **Regular backups** - Backup `database.db` regularly
8. **Don't commit `.env`** - Make sure `.env` is in `.gitignore`
9. **Use PM2 or systemd** - Keep app running and auto-restart on crash
10. **Monitor logs** - Check logs regularly for errors or suspicious activity

---

## 📁 Project Structure

```
AETHER_PANEL/
├── server.js              ← Main program (runs everything)
├── package.json           ← Lists required libraries
├── .env                   ← Your settings (passwords, API keys) - NOT in git
├── database.db           ← All your data (auto-created) - NOT in git
│
├── config/                ← Configuration files
│   ├── database.js        ← Database setup
│   ├── pterodactyl.js     ← Pterodactyl connection
│   └── encryption.js      ← Encryption utilities
│
├── routes/                ← Page handlers
│   ├── auth.js            ← Login/signup code
│   ├── dashboard.js       ← Dashboard pages
│   ├── servers.js         ← Server management
│   ├── linkvertise.js     ← Linkvertise system
│   └── admin.js           ← Admin panel
│
├── middleware/            ← Middleware functions
│   ├── auth.js            ← Authentication checks
│   └── validation.js      ← Input validation
│
├── public/                ← Frontend files
│   ├── css/               ← Styling (colors, layout)
│   │   ├── style.css      ← Main styles
│   │   └── dashboard.css  ← Dashboard-specific styles
│   └── js/                ← JavaScript (interactivity)
│       ├── main.js        ← Utility functions
│       └── dashboard.js   ← Dashboard functions
│
└── views/                 ← HTML pages
    ├── login.html         ← Login page
    ├── signup.html        ← Signup page
    ├── dashboard.html     ← Main dashboard
    ├── profile.html       ← User profile
    ├── settings.html      ← User settings
    ├── servers.html       ← Server management
    ├── resource-store.html ← Resource store
    ├── linkvertise.html   ← Linkvertise page
    └── admin.html         ← Admin panel
```

**You don't need to understand all of this!** Just know:
- **`.env`** = Your settings (keep secret!)
- **`database.db`** = Your data (backup regularly!)
- **`views/`** = The pages users see
- Everything else = The code that makes it work

---

## 🚀 Running Modes

### Development Mode

For testing and development:

```bash
npm run dev
```

This uses `nodemon` which automatically restarts the server when you save files. Useful for development!

### Production Mode

For production use:

```bash
npm start
```

Or with PM2:

```bash
pm2 start server.js --name aether-dashboard
```

Make sure `NODE_ENV=production` is set in your `.env` file!

---

## 📚 Technology Stack

This project uses these technologies (don't worry if you don't know them yet!):

- **Node.js**: Runs JavaScript on your computer/server
- **Express.js**: Makes it easy to create web servers
- **SQLite**: Simple database (like Excel, but for apps)
- **Passport.js**: Handles login systems (local and Discord OAuth)
- **bcrypt**: Securely hashes passwords
- **HTML/CSS/JavaScript**: Web page languages
- **Axios**: Makes HTTP requests to Pterodactyl API

**Great for learning!** The code has comments explaining what each part does.

---

## 🎯 Production Checklist

Before going live, make sure you've completed:

### Basic Setup
- [ ] Installed Node.js (v16 or higher)
- [ ] Ran `npm install` successfully
- [ ] Created `.env` file with all required settings
- [ ] Changed default admin password
- [ ] Tested login and basic functionality

### Configuration
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Set strong `SESSION_SECRET` (32+ characters)
- [ ] Configured Discord OAuth (if using)
- [ ] Configured Pterodactyl panel (if using)
- [ ] Set up Linkvertise (if using)

### Security
- [ ] Changed admin password
- [ ] Set up HTTPS/SSL certificate
- [ ] Configured firewall
- [ ] Set up regular backups
- [ ] Verified `.env` is in `.gitignore`

### Deployment
- [ ] Set up PM2 or systemd for process management
- [ ] Configured reverse proxy (Nginx) if using domain
- [ ] Set up monitoring/logging
- [ ] Tested all features in production environment
- [ ] Documented any custom configurations

---

## 💡 Common Questions

**Q: Do I need to know programming?**  
A: No! Just follow the setup steps. Programming knowledge helps if you want to customize it.

**Q: Can I use this without Pterodactyl?**  
A: Yes! The dashboard works without Pterodactyl. Server creation features won't work, but everything else will.

**Q: Is this free?**  
A: Yes! The code is free to use and modify under MIT license.

**Q: Can I host this online?**  
A: Yes! You can deploy it to services like:
- VPS (DigitalOcean, Linode, Vultr)
- Cloud platforms (AWS, Google Cloud, Azure)
- Any server with Node.js support

**Q: How do I backup my data?**  
A: Just copy the `database.db` file! That's your backup. Set up automated backups for production.

**Q: Can I change the design?**  
A: Yes! Edit files in `public/css/` folder. The main files are `style.css` and `dashboard.css`.

**Q: How do I update the dashboard?**  
A: 
1. Backup your `database.db` file
2. Download the new version
3. Replace files (except `.env` and `database.db`)
4. Run `npm install` to update dependencies
5. Restart the server

**Q: Can multiple users use it at the same time?**  
A: Yes! The dashboard supports multiple concurrent users.

**Q: What happens if the server crashes?**  
A: Use PM2 or systemd to automatically restart the application. The database is persistent, so data won't be lost.

---

## 🆘 Need Help?

1. **Check this README** - Most questions are answered here
2. **Check error messages** - They usually tell you what's wrong
3. **Check the console** - Look at the terminal/command prompt for errors
4. **Read the code comments** - The code explains what it does
5. **Check server logs** - PM2 logs: `pm2 logs aether-dashboard`

---

## 📝 Quick Reference

### Default Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`
- ⚠️ **Change immediately after first login!**

### Important Files
- **`.env`** - Configuration (keep secret!)
- **`database.db`** - All data (backup regularly!)

### Important Commands
```bash
npm install          # Install dependencies
npm start            # Start server (production)
npm run dev          # Start server (development with auto-reload)
pm2 start server.js --name aether-dashboard  # Start with PM2
pm2 logs aether-dashboard  # View logs
pm2 restart aether-dashboard  # Restart
```

### Default Ports
- **Dashboard**: `3000` (configurable in `.env`)
- **HTTP**: `80` (for Nginx)
- **HTTPS**: `443` (for Nginx with SSL)

---

## 📝 Summary

**To get started:**
1. Install Node.js (v16+)
2. Run `npm install`
3. Create `.env` file with basic settings
4. Run `npm start`
5. Go to `http://localhost:3000`
6. Login as `admin` / `admin123`
7. Change admin password immediately!

**For production:**
1. Complete all setup steps above
2. Set `NODE_ENV=production` in `.env`
3. Use PM2 or systemd to run the app
4. Set up Nginx reverse proxy (optional)
5. Set up SSL certificate (recommended)
6. Configure firewall
7. Set up regular backups

**That's it!** 🎉

---

## 📄 License

MIT License - Feel free to use, modify, and distribute!

---

**Made with ❤️ for beginners. Happy hosting!** 🚀

**Version 1.0.0** - Production Ready ✅
