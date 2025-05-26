# 🚀 Deployment Guide

Deploy your Dog Cleanup Game online for free so you can play with friends!

## Option 1: Railway (Recommended - Easiest)

### Step 1: Prepare Your Code
1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

### Step 2: Deploy the Server
1. Go to [Railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. **Important**: Set the root directory to `server`
5. Railway will auto-detect it's a Node.js project
6. Set these environment variables in Railway:
   - `PORT`: `3001`
   - `NODE_ENV`: `production`
7. Deploy and copy the server URL (e.g., `https://your-server.railway.app`)

### Step 3: Deploy the Client
1. Create another Railway service for the client
2. **Important**: Set the root directory to `client`
3. In the client service settings:
   - Build command: `npm run build`
   - Start command: `npm start`
4. Set environment variable:
   - `VITE_SERVER_URL`: `wss://your-server-url.railway.app` (replace with your server URL)
5. Deploy the client

### Step 4: Play!
- Share the client URL with your friend
- Both open the game and join with different dog names
- Enjoy playing together!

## Option 2: Vercel + Railway

### Deploy Server on Railway (same as above)

### Deploy Client on Vercel
1. Go to [Vercel.com](https://vercel.com) and sign up
2. Import your GitHub repository
3. Set framework preset to "Vite"
4. Set environment variable:
   - `VITE_SERVER_URL`: `wss://your-server-url.railway.app`
5. Deploy

## Option 3: Render

### Deploy Server
1. Go to [Render.com](https://render.com) and sign up
2. Create a "Web Service"
3. Connect your GitHub repo
4. Set:
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - Environment: `NODE_ENV=production`

### Deploy Client
1. Create a "Static Site" on Render
2. Set:
   - Build Command: `cd client && npm install && npm run build`
   - Publish Directory: `client/dist`
3. Set environment variable:
   - `VITE_SERVER_URL`: `wss://your-server-url.onrender.com`

## Troubleshooting

### Common Issues:
1. **Build fails with "vite: not found"**: Make sure you set the root directory correctly:
   - Server: Set root directory to `server`
   - Client: Set root directory to `client`
2. **WebSocket connection fails**: Make sure you're using `wss://` (not `ws://`) for HTTPS sites
3. **Server not starting**: Check that `PORT` environment variable is set
4. **Client can't connect**: Verify the `VITE_SERVER_URL` is correct

### Testing Locally Before Deployment:
```bash
# Test the production build locally
cd client
npm run build
npm run preview

# Test server in production mode
cd server
NODE_ENV=production npm start
```

## Free Tier Limits:
- **Railway**: 500 hours/month (enough for casual gaming)
- **Vercel**: Unlimited for static sites
- **Render**: 750 hours/month

## Cost-Free Tips:
1. Use Railway's sleep feature to save hours when not playing
2. Deploy only when you want to play with friends
3. Use Vercel for client (unlimited) + Railway for server (limited hours)

Happy gaming! 🐕🎮 