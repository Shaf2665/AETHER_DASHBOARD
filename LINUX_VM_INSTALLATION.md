# Installing Aether Dashboard on a Linux VM

This guide will help you install the Aether Dashboard on a fresh Linux virtual machine (VM).

---

## 📋 Prerequisites

- A Linux VM (Ubuntu, Debian, CentOS, or RHEL)
- SSH access to your VM (or console access)
- Basic terminal/command line knowledge

---

## Step 1: Connect to Your Linux VM

### If Using SSH:

```bash
ssh username@your-vm-ip-address
```

Replace `username` with your VM username and `your-vm-ip-address` with your VM's IP.

### If Using VM Console:

- Open the VM console in your virtualization software (VirtualBox, VMware, etc.)

---

## Step 2: Update Your System

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt upgrade -y
```

**CentOS/RHEL:**
```bash
sudo yum update -y
```

---

## Step 3: Install Node.js

### Option A: Using NodeSource (Recommended - Gets Latest LTS)

**For Ubuntu/Debian:**
```bash
# Install curl if not already installed
sudo apt install curl -y

# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

**For CentOS/RHEL:**
```bash
# Install curl if not already installed
sudo yum install curl -y

# Add NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Install Node.js
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

### Option B: Using Package Manager (Simpler, but May Be Older Version)

**For Ubuntu/Debian:**
```bash
sudo apt install nodejs npm -y
node --version
npm --version
```

**For CentOS/RHEL:**
```bash
sudo yum install nodejs npm -y
node --version
npm --version
```

✅ **You should see version numbers** (like `v20.x.x` for Node.js and `10.x.x` for npm). If you see errors, Node.js isn't installed correctly.

---

## Step 4: Get the Dashboard Code on Your VM

### Option A: Clone from GitHub (If You Have It on GitHub)

```bash
# Install git if not already installed
sudo apt install git -y  # Ubuntu/Debian
# OR
sudo yum install git -y  # CentOS/RHEL

# Clone your repository
git clone https://github.com/your-username/AETHER_PANEL.git
cd AETHER_PANEL
```

### Option B: Transfer Files from Your Computer

**Using SCP (from your Windows computer):**
```powershell
# In PowerShell on Windows
scp -r D:\AETHER_PANEL username@your-vm-ip:/home/username/
```

**Using SFTP (FileZilla or WinSCP):**
1. Download FileZilla or WinSCP on Windows
2. Connect to your VM using SFTP
3. Upload the `AETHER_PANEL` folder to your VM

**Using USB/Shared Folder:**
- If your VM supports USB passthrough or shared folders, copy the folder that way

---

## Step 5: Navigate to the Project Folder

```bash
cd AETHER_PANEL
# Or wherever you placed the files
```

---

## Step 6: Install Dependencies

```bash
npm install
```

⏳ **Wait for it to finish** (may take 1-2 minutes). You'll see lots of text scrolling - that's normal!

---

## Step 7: Create the `.env` File

```bash
# Create .env file
nano .env
```

**Or using vi:**
```bash
vi .env
```

**Paste this content:**
```env
# Server Configuration
PORT=3000
NODE_ENV=production
SESSION_SECRET=change-this-to-any-random-text-12345-very-secure-key

# Discord OAuth (optional - leave empty if you don't have Discord setup)
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_CALLBACK_URL=http://your-vm-ip:3000/auth/discord/callback

# Pterodactyl Panel (optional - leave empty if you don't have Pterodactyl)
PTERODACTYL_URL=
PTERODACTYL_API_KEY=
```

**Important Changes:**
- Change `SESSION_SECRET` to a long random string (at least 32 characters)
- Replace `your-vm-ip` with your actual VM IP address in the Discord callback URL

**To Save in nano:**
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

**To Save in vi:**
- Press `Esc`
- Type `:wq` and press `Enter`

---

## Step 8: Start the Dashboard

### For Testing (Temporary):

```bash
npm start
```

You should see:
```
✅ Database initialized
Server running on http://0.0.0.0:3000
```

**To stop:** Press `Ctrl + C`

---

## Step 9: Access the Dashboard

**From your Windows computer:**
1. Open a web browser
2. Go to: `http://your-vm-ip-address:3000`
3. You should see the login page!

**If you can't access it:**
- Check the VM's firewall (see Step 10)
- Make sure the VM's network is accessible from your computer

---

## Step 10: Configure Firewall (If Needed)

### Ubuntu/Debian (UFW):

```bash
# Allow port 3000
sudo ufw allow 3000/tcp

# If using Nginx later, allow ports 80 and 443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### CentOS/RHEL (firewalld):

```bash
# Allow port 3000
sudo firewall-cmd --permanent --add-port=3000/tcp

# If using Nginx later, allow ports 80 and 443
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp

# Reload firewall
sudo firewall-cmd --reload
```

---

## Step 11: Run in Production Mode (PM2 - Recommended)

PM2 keeps your application running even if it crashes and automatically restarts it.

### Install PM2:

```bash
sudo npm install -g pm2
```

### Start the Dashboard:

```bash
pm2 start server.js --name aether-dashboard
```

### Useful PM2 Commands:

```bash
pm2 list                    # View all running apps
pm2 logs aether-dashboard   # View logs
pm2 restart aether-dashboard  # Restart
pm2 stop aether-dashboard     # Stop
pm2 delete aether-dashboard  # Remove from PM2
pm2 save                    # Save current process list
pm2 startup                 # Auto-start on server reboot
```

### Auto-Start on Reboot:

```bash
pm2 startup
# Follow the instructions it gives you (usually run a sudo command)
pm2 save
```

Now your dashboard will automatically start when your VM reboots! 🎉

---

## Step 12: Login

1. Go to `http://your-vm-ip:3000`
2. Login with:
   - **Username**: `admin`
   - **Password**: `admin123`
3. ⚠️ **Change the password immediately!**

---

## 🔧 Quick Reference for Linux VM

### Common Commands:

```bash
# Navigate to project
cd ~/AETHER_PANEL

# Start with PM2
pm2 start server.js --name aether-dashboard

# View logs
pm2 logs aether-dashboard

# Restart
pm2 restart aether-dashboard

# Stop
pm2 stop aether-dashboard
```

### Check if It's Running:

```bash
pm2 list
# OR
curl http://localhost:3000
```

---

## ❓ Troubleshooting

### "node: command not found"

**Problem**: Node.js isn't installed or not in PATH.

**Solution**: 
- Reinstall Node.js (see Step 3)
- Make sure you restarted your terminal after installation

### "Permission denied"

**Problem**: You don't have permission to run commands or access files.

**Solution**:
- Use `sudo` for system commands
- For project files, check ownership: `sudo chown -R $USER:$USER ~/AETHER_PANEL`

### "Port 3000 already in use"

**Problem**: Another program is using port 3000.

**Solution**:
- Change `PORT=3001` in `.env` file
- Or find and stop the process using port 3000: `sudo lsof -i :3000`

### "Cannot access from browser"

**Problem**: Can't reach the dashboard from your computer.

**Checklist**:
- ✅ Check firewall (Step 10)
- ✅ Check VM network settings (NAT vs Bridged)
- ✅ Try accessing from the VM itself: `curl http://localhost:3000`
- ✅ Make sure the dashboard is running: `pm2 list`
- ✅ Check if your VM's IP is correct: `ip addr` or `ifconfig`

### "npm install fails"

**Problem**: Dependencies won't install.

**Solution**:
- Make sure you have internet connection
- Try: `npm cache clean --force`
- Try: `npm install --verbose` to see detailed errors
- Make sure Node.js and npm are properly installed

### "PM2 command not found"

**Problem**: PM2 isn't installed globally.

**Solution**:
```bash
sudo npm install -g pm2
```

---

## 🔒 Security Tips for VM

1. **Change default admin password** immediately after first login
2. **Use a strong SESSION_SECRET** (random text, at least 32 characters)
3. **Set up firewall** to only allow necessary ports
4. **Keep system updated**: `sudo apt update && sudo apt upgrade` regularly
5. **Use SSH keys** instead of passwords for SSH access
6. **Set up regular backups** of `database.db` file

---

## 📝 Next Steps

After installation, you may want to:

1. **Set up Nginx reverse proxy** (see main README.md)
2. **Set up SSL certificate** with Let's Encrypt (see main README.md)
3. **Configure Pterodactyl panel** (see main README.md)
4. **Set up Discord OAuth** (see main README.md)
5. **Configure Linkvertise** (see main README.md)

---

## 🆘 Need Help?

1. Check the main [README.md](README.md) for general troubleshooting
2. Check server logs: `pm2 logs aether-dashboard`
3. Check system logs: `journalctl -u aether-dashboard` (if using systemd)
4. Verify Node.js version: `node --version` (should be v16 or higher)

---

**That's it!** Your dashboard should now be running on your Linux VM! 🎉

