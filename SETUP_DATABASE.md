# Database Setup Guide

Your PostgreSQL is installed but needs authentication configuration. Here are your options:

## Option 1: Use Render.com FREE PostgreSQL (Recommended - Easiest)

1. **Go to Render.com:**
   - Visit: https://render.com/
   - Click "Get Started for Free"
   - Sign up with GitHub/Google

2. **Create PostgreSQL Database:**
   - Click "New +" → "PostgreSQL"
   - Name: `checkout-db`
   - Database: `checkout_db`
   - User: (auto-generated)
   - Region: Oregon (or closest to you)
   - Instance Type: **Free**
   - Click "Create Database"

3. **Get Connection String:**
   - Wait 1-2 minutes for database to provision
   - Copy the "Internal Database URL" (starts with `postgresql://`)
   - Example: `postgresql://checkout_user:xxxxx@dpg-xxxxx.oregon-postgres.render.com/checkout_db`

4. **Update .env file:**
   ```bash
   cd /Users/mac/Downloads/files\ \(4\)/server
   nano .env
   ```
   
   Replace the DATABASE_URL line with your Render URL:
   ```
   DATABASE_URL=postgresql://checkout_user:xxxxx@dpg-xxxxx.oregon-postgres.render.com/checkout_db
   ```

5. **Restart the server:**
   ```bash
   npm start
   ```

✅ **Benefits:**
- Free forever (up to 90 days of inactivity)
- No local setup needed
- Same database for production
- Automatic backups
- SSL enabled

---

## Option 2: Fix Local PostgreSQL Authentication

If you want to use local PostgreSQL, fix the authentication:

### Step 1: Find pg_hba.conf
```bash
psql postgres -c "SHOW hba_file;" -U postgres
```

### Step 2: Edit pg_hba.conf
```bash
sudo nano /opt/homebrew/var/postgresql@18/pg_hba.conf
```

### Step 3: Change authentication method
Find this line:
```
# IPv4 local connections:
host    all             all             127.0.0.1/32            scram-sha-256
```

Change to:
```
# IPv4 local connections:
host    all             all             127.0.0.1/32            trust
```

Also change:
```
local   all             all                                     trust
```

### Step 4: Restart PostgreSQL
```bash
brew services restart postgresql@18
```

### Step 5: Create database without password
```bash
createdb checkout_db
```

### Step 6: Update .env
```bash
DATABASE_URL=postgresql://mac@localhost:5432/checkout_db
```

### Step 7: Start server
```bash
cd server && npm start
```

---

## Current Status

✅ PostgreSQL 18.4 installed
✅ Database `checkout_db` created
✅ Server code ready
❌ Authentication configuration needed

**Choose Option 1 (Render.com) for fastest setup!**

---

## Test Connection

After setup, test with:
```bash
cd server && npm start
```

You should see:
```
🚀 Universal Checkout API running on port 3001
📡 Environment: development
💾 Database: PostgreSQL connected
✅ Database tables initialized
```

Then test the API:
```bash
curl http://localhost:3001/api/health
```

Should return:
```json
{"status":"ok","database":"connected"}
```
