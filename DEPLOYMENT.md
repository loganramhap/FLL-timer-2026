# Deployment Guide

## Option 1: Railway.app (Recommended - Easiest)

1. Create account at https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account and select this repository
4. Railway will auto-detect and deploy
5. Your app will be live at a railway.app URL
6. **Free tier**: 500 hours/month, plenty for events

**Pros**: Easiest setup, automatic deployments, free tier
**Cons**: Free tier has usage limits

## Option 2: Render.com

1. Create account at https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Render will detect the `render.yaml` config
5. Click "Create Web Service"
6. Your app will be live at a onrender.com URL
7. **Free tier**: Always-on with some limitations

**Pros**: Good free tier, reliable
**Cons**: Free tier may spin down after inactivity (takes ~30s to wake up)

## Option 3: Fly.io

1. Install Fly CLI: `brew install flyctl` (macOS)
2. Create account: `fly auth signup`
3. Login: `fly auth login`
4. Deploy: `fly launch` (follow prompts)
5. Your app will be live at a fly.dev URL
6. **Free tier**: 3 shared VMs

**Pros**: Good performance, global edge network
**Cons**: Requires CLI installation

## Option 4: DigitalOcean App Platform

1. Create account at https://www.digitalocean.com
2. Go to "Apps" → "Create App"
3. Connect GitHub repository
4. Select this repo and branch
5. DigitalOcean will auto-detect Node.js
6. Deploy (starts at $5/month, no free tier)

**Pros**: Very reliable, good for production
**Cons**: Costs money ($5/month minimum)

## Recommended for Robotics Events:

**Railway.app** - Best balance of ease and reliability for your use case.

### Quick Railway Setup:
```bash
# 1. Push your code to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main

# 2. Go to railway.app and deploy from GitHub
# 3. Share the URL with your event team
```

## After Deployment:

1. Test the timer with a room code
2. Share the URL with all operators/displays
3. Everyone uses the same room code to sync
4. Timer state persists across all connected devices

## Environment Considerations:

- All platforms provide HTTPS automatically (required for some browsers)
- WebSocket connections work on all platforms
- No environment variables needed for basic setup
- Room codes keep different events separate on the same deployment
