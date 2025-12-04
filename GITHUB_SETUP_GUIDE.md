# 🚀 GitHub Setup Guide for AdminNAgent

This guide will help you upload your project to GitHub step by step.

## 📋 Prerequisites

### Step 1: Install Git (if not already installed)

1. **Download Git for Windows:**
   - Go to: https://git-scm.com/download/win
   - Download the installer
   - Run the installer with default settings

2. **Verify Installation:**
   - Open PowerShell or Command Prompt
   - Run: `git --version`
   - You should see something like: `git version 2.x.x`

### Step 2: Create a GitHub Account (if you don't have one)

1. Go to: https://github.com
2. Click "Sign up"
3. Follow the registration process

---

## 🔧 Setup Your Project

### Step 3: Initialize Git Repository

Open PowerShell in your project folder (`C:\Rohan\AdminNAgent`) and run:

```bash
# Initialize git repository
git init

# Check status
git status
```

### Step 4: Add All Files

```bash
# Add all files to staging
git add .

# Check what will be committed
git status
```

### Step 5: Create Your First Commit

```bash
# Commit all files
git commit -m "Initial commit: AdminNAgent project"

# Verify commit
git log
```

---

## 🌐 Create GitHub Repository

### Step 6: Create Repository on GitHub

1. **Go to GitHub:**
   - Visit: https://github.com
   - Click the **"+"** icon in the top right
   - Select **"New repository"**

2. **Repository Settings:**
   - **Repository name:** `AdminNAgent` (or your preferred name)
   - **Description:** "Admin Panel and Agent Management System"
   - **Visibility:** Choose **Private** (recommended) or **Public**
   - **DO NOT** check "Initialize with README" (we already have files)
   - Click **"Create repository"**

3. **Copy the Repository URL:**
   - GitHub will show you commands
   - Copy the URL (looks like: `https://github.com/yourusername/AdminNAgent.git`)

---

## 📤 Push to GitHub

### Step 7: Connect Local Repository to GitHub

Back in PowerShell, run:

```bash
# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/AdminNAgent.git

# Verify remote was added
git remote -v
```

### Step 8: Push Your Code

```bash
# Push to GitHub (first time)
git branch -M main
git push -u origin main
```

**Note:** GitHub will ask for your credentials:
- **Username:** Your GitHub username
- **Password:** Use a **Personal Access Token** (not your password)

### Step 9: Create Personal Access Token (if needed)

If GitHub asks for a token:

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. **Note:** "AdminNAgent Access"
4. **Expiration:** Choose duration (90 days recommended)
5. **Select scopes:** Check `repo` (all repo permissions)
6. Click **"Generate token"**
7. **Copy the token** (you won't see it again!)
8. Use this token as your password when pushing

---

## ✅ Verify Upload

1. **Check GitHub:**
   - Go to: `https://github.com/YOUR_USERNAME/AdminNAgent`
   - You should see all your files!

2. **Verify locally:**
   ```bash
   git status
   git log
   ```

---

## 🔄 Future Updates

After making changes to your code:

```bash
# Check what changed
git status

# Add changed files
git add .

# Commit changes
git commit -m "Description of your changes"

# Push to GitHub
git push
```

---

## 📝 Common Commands

```bash
# Check status
git status

# See what files changed
git diff

# View commit history
git log

# Pull latest changes from GitHub
git pull

# Create a new branch
git checkout -b feature-name

# Switch branches
git checkout main
```

---

## ⚠️ Important Notes

1. **Never commit sensitive data:**
   - `.env` files are already in `.gitignore`
   - Database files (`dev.db`) are ignored
   - Never commit API keys or passwords

2. **Private vs Public:**
   - **Private:** Only you can see it (recommended for projects with sensitive code)
   - **Public:** Everyone can see it (good for open-source projects)

3. **Large Files:**
   - GitHub has a 100MB file size limit
   - Large files in `uploads/` folder are ignored by default

---

## 🆘 Troubleshooting

### "Git is not recognized"
- Install Git: https://git-scm.com/download/win
- Restart PowerShell after installation

### "Authentication failed"
- Use Personal Access Token instead of password
- Make sure token has `repo` permissions

### "Repository not found"
- Check the repository URL is correct
- Make sure you have access to the repository

### "Large file error"
- Remove large files from commit: `git rm --cached large-file.ext`
- Add to `.gitignore` if needed

---

## 📞 Need Help?

If you encounter any issues:
1. Check the error message carefully
2. Search for the error on Google/Stack Overflow
3. Make sure Git is properly installed
4. Verify your GitHub credentials

---

**Good luck! 🎉**

