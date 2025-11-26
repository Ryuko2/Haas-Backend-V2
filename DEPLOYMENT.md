# 🚀 Deployment Guide - Haas Backend V2

Complete guide to deploy your Haas CNC monitoring backend to production.

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure you have:

- ✅ GitHub account
- ✅ Render account (free tier works!)
- ✅ All files in your project
- ✅ Git installed locally

---

## 🌐 Deploy to Render (Recommended)

### **Why Render?**
- ✅ FREE tier available
- ✅ Auto-deploy from GitHub
- ✅ HTTPS included
- ✅ Easy WebSocket support
- ✅ No credit card required for free tier

---

## 📝 Step-by-Step Deployment

### **Step 1: Prepare Your Repository**

#### **1.1 Initialize Git (if not already done)**

```bash
cd haas-backend-v2
git init
```

#### **1.2 Add all files**

```bash
git add .
```

#### **1.3 Commit**

```bash
git commit -m "Initial commit - Haas Backend V2 with model-specific dashboards"
```

#### **1.4 Create GitHub Repository**

1. Go to https://github.com/new
2. Repository name: `Haas-Backend-V2`
3. **Public** or **Private** (your choice)
4. **DO NOT** initialize with README (we already have one)
5. Click **"Create repository"**

#### **1.5 Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/Haas-Backend-V2.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username!

---

### **Step 2: Deploy on Render**

#### **2.1 Create Render Account**

1. Go to https://render.com
2. Click **"Get Started"**
3. Sign up with GitHub (easiest way)

#### **2.2 Create New Web Service**

1. Click **"New +"** (top right)
2. Select **"Web Service"**
3. Click **"Connect a repository"**
4. Find and select **"Haas-Backend-V2"**
5. Click **"Connect"**

#### **2.3 Configure Service**

Fill in the settings:

**Basic Settings:**
```
Name: haas-backend-v2
Region: Oregon (US West) or closest to you
Branch: main
Root Directory: (leave EMPTY)
```

**Build & Deploy:**
```
Runtime: Node
Build Command: npm install
Start Command: node server.js
```

**Instance Type:**
```
Free (or paid if you prefer)
```

**Advanced Settings (optional):**
```
Auto-Deploy: Yes (recommended)
```

#### **2.4 Click "Create Web Service"**

Render will now:
1. Clone your repo ✅
2. Install dependencies ✅
3. Start your server ✅

**This takes 2-3 minutes** ⏱️

---

### **Step 3: Verify Deployment**

#### **3.1 Check Logs**

In Render dashboard, you should see:

```
==> Running 'npm install'
added 57 packages

==> Running 'node server.js'
============================================================
🏭  HAAS CNC FLEET MONITOR - V2.0
============================================================
📡 Server running on port 10000
🌐 API: http://localhost:10000
🔌 WebSocket: ws://localhost:10000

🤖 Fleet:
   - Haas VF-2 (VF-2) - CNC_MILL
   - Haas VF-4 (VF-4) - CNC_MILL
   - Toyoda HMC (HMC) - CNC_MILL
   - CNC Lathe (LATHE) - LATHE
   - Durma Press Brake (PRESS) - PRESS_BRAKE
   - Fiber Laser (LASER) - LASER
============================================================
```

If you see this = **SUCCESS!** ✅

#### **3.2 Get Your URL**

Render will give you a URL like:
```
https://haas-backend-v2.onrender.com
```

Copy this URL - you'll need it for the mobile app!

#### **3.3 Test Your API**

Open in browser or use curl:

```bash
curl https://haas-backend-v2.onrender.com/api/machines
```

You should see JSON with all 6 machines! 🎉

---

## 🔧 Post-Deployment Configuration

### **Update Mobile App Config**

In your React Native app, update `config.js`:

```javascript
// config.js
export const API_URL = 'https://haas-backend-v2.onrender.com';
```

### **Test All Endpoints**

```bash
# Base URL
curl https://haas-backend-v2.onrender.com/

# All machines
curl https://haas-backend-v2.onrender.com/api/machines

# Specific machine
curl https://haas-backend-v2.onrender.com/api/machines/haas_vf2

# Dashboard (NEW!)
curl https://haas-backend-v2.onrender.com/api/machines/haas_vf2/dashboard

# Plant status
curl https://haas-backend-v2.onrender.com/api/plant/status

# Active alarms
curl https://haas-backend-v2.onrender.com/api/plant/alarms
```

---

## ⚠️ Important: Render Free Tier Limitations

### **Sleep After 15 Minutes**

Render free tier **sleeps after 15 minutes of inactivity**.

**Symptoms:**
- First request takes 30-60 seconds
- App shows "Network request failed"
- Then works normally

**Solutions:**

#### **Option 1: UptimeRobot (FREE - Recommended)**

Keeps your backend awake!

1. Go to https://uptimerobot.com
2. Sign up (free)
3. **Add New Monitor:**
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `Haas Backend`
   - URL: `https://haas-backend-v2.onrender.com`
   - Monitoring Interval: **5 minutes**
4. Click **"Create Monitor"**

**Done!** Your backend stays awake 24/7 ✅

#### **Option 2: Render Paid Plan ($7/month)**

Upgrade to **Starter** plan:
- No sleep
- Better performance
- Priority support

---

## 🔄 Auto-Deploy Updates

### **Make Changes**

```bash
# Edit files locally
nano server.js

# Commit changes
git add .
git commit -m "Updated endpoint logic"

# Push to GitHub
git push
```

**Render automatically deploys!** ⚡

You'll see in Render dashboard:
```
🔄 Deploy triggered by push to main
```

Takes 1-2 minutes.

---

## 🐛 Troubleshooting

### **Problem: "Application failed to respond"**

**Cause:** Server not starting properly

**Fix:**
1. Check Render logs
2. Look for errors
3. Verify `node server.js` works locally

---

### **Problem: "Module not found"**

**Cause:** Dependencies not installed

**Fix:**

Check Build Command is:
```
npm install
```

NOT:
```
npm ci
```

---

### **Problem: "Port already in use"**

**Render uses PORT environment variable automatically.**

Your code already handles this:
```javascript
const PORT = process.env.PORT || 5000;
```

No changes needed! ✅

---

### **Problem: WebSocket not connecting**

**Cause:** Wrong URL or protocol

**Fix:**

Use correct WebSocket URL:
```javascript
// For HTTP
ws://haas-backend-v2.onrender.com

// For HTTPS
wss://haas-backend-v2.onrender.com
```

Render uses **HTTPS**, so use `wss://` ✅

---

## 📊 Monitoring Your Deployment

### **View Logs in Real-Time**

Render Dashboard → Your Service → **"Logs"** tab

### **Check Metrics**

Render Dashboard → Your Service → **"Metrics"** tab

Shows:
- CPU usage
- Memory usage
- Request count
- Response times

### **Set Up Alerts**

Render Dashboard → Your Service → **"Notifications"**

Get notified on:
- Deploy failures
- Service crashes
- High error rates

---

## 🔐 Environment Variables (Optional)

For production secrets:

Render Dashboard → Your Service → **"Environment"** → **"Add Environment Variable"**

Example:
```
API_KEY=your_secret_key
DATABASE_URL=your_database_url
```

Access in code:
```javascript
const apiKey = process.env.API_KEY;
```

---

## 📈 Scaling (When You Grow)

### **Current Setup:**
- Free tier
- Sleeps after 15 min
- Good for testing

### **When to Upgrade:**

Upgrade to **Starter ($7/month)** when:
- ✅ Going to production
- ✅ Need 24/7 availability
- ✅ Multiple users
- ✅ Real machines connected

### **Enterprise Features:**

Consider **Pro plan** ($25/month) for:
- High traffic (1000+ requests/min)
- Multiple regions
- DDoS protection
- Priority support

---

## ✅ Deployment Checklist

Before going live:

- [ ] Backend deployed to Render
- [ ] UptimeRobot configured (if using free tier)
- [ ] All endpoints tested
- [ ] Mobile app updated with production URL
- [ ] WebSocket tested
- [ ] n8n alerts configured
- [ ] Monitoring/alerts set up
- [ ] Team informed of URL

---

## 🎯 Your URLs

After deployment, save these:

```
Backend API:
https://haas-backend-v2.onrender.com

API Documentation:
https://haas-backend-v2.onrender.com/

Machines Endpoint:
https://haas-backend-v2.onrender.com/api/machines

Plant Status:
https://haas-backend-v2.onrender.com/api/plant/status

WebSocket:
wss://haas-backend-v2.onrender.com
```

---

## 🔄 CI/CD Pipeline

Your automatic deployment pipeline:

```
1. Code changes locally
   ↓
2. git push to GitHub
   ↓
3. Render detects push
   ↓
4. Automatic build & deploy
   ↓
5. Live in 2-3 minutes! ✅
```

---

## 📞 Support

**Render Issues:**
- Documentation: https://render.com/docs
- Status: https://status.render.com
- Support: support@render.com

**Backend Issues:**
- Check logs in Render dashboard
- Test endpoints with curl
- Verify GitHub repository

---

## 🎉 Success!

Your Haas monitoring backend is now:

✅ Deployed to production  
✅ Accessible worldwide  
✅ Auto-deploying updates  
✅ Monitoring 6 machines  
✅ Ready for mobile app  
✅ Ready for n8n integration  

**Next:** Build the React Native frontend! 📱

---

**Deployment completed! 🚀**
