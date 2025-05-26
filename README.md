# 🐕 Dog Cleanup Battle

A hilarious multiplayer 3D game where players control dogs competing to color the most grass area with their... unique cleanup style! Built with Three.js and WebSockets for real-time multiplayer action.

## 🎮 Game Description

In Dog Cleanup Battle, you control a cute low-poly dog in a third-person 3D environment. Your goal is simple but amusing: clean up around the grass field and color as much territory as possible with your dog's "cleanup" actions. The player who colors the most grass tiles wins!

### Features

- **Real-time Multiplayer**: 2-player online battles via WebSockets
- **Low-poly 3D Graphics**: Beautiful, performant Three.js rendering
- **Animated Dogs**: Cute dog models with walking, idle, and cleanup animations
- **Dynamic Grass Coloring**: Visual feedback as players claim territory
- **Third-person Camera**: Smooth camera controls with mouse look
- **Production Ready**: Optimized build system with Vite
- **Responsive UI**: Modern, beautiful interface that works on all devices

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dog-cleanup-game
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install server dependencies
   cd server && npm install && cd ..
   
   # Install client dependencies
   cd client && npm install && cd ..
   ```

3. **Start the game**
   ```bash
   # Start both server and client (recommended for development)
   npm run dev
   
   # Or start them separately:
   # Terminal 1: npm run server
   # Terminal 2: npm run client
   ```

4. **Play the game**
   - Open your browser to `http://localhost:3000`
   - Enter your dog's name
   - Wait for another player to join
   - Start playing!

## 🎯 How to Play

### Controls
- **WASD** or **Arrow Keys**: Move your dog
- **Mouse**: Look around (click to enable mouse look)
- **Space**: Perform cleanup action (color grass)

### Objective
- Move your dog around the grass field
- Press Space to "clean up" and color grass tiles with your dog's color
- Color more tiles than your opponent to win!
- Game lasts 2 minutes

### Scoring
- Each grass tile you color gives you 1 point
- If you color a tile that's already colored by your opponent, you steal it!
- The player with the most colored tiles at the end wins

## 🏗️ Project Structure

```
dog-cleanup-game/
├── client/                 # Frontend (Three.js + Vite)
│   ├── src/
│   │   └── js/
│   │       ├── main.js     # Main game application
│   │       ├── Game.js     # Three.js game engine
│   │       ├── NetworkManager.js  # WebSocket client
│   │       ├── DogModel.js # 3D dog model and animations
│   │       └── GrassField.js # Grass field and coloring system
│   ├── index.html          # Game UI
│   ├── vite.config.js      # Vite configuration
│   └── package.json
├── server/                 # Backend (Node.js + WebSockets)
│   ├── src/
│   │   ├── index.js        # WebSocket server
│   │   └── GameRoom.js     # Game room management
│   └── package.json
├── shared/                 # Shared utilities (future use)
├── package.json            # Root package.json
└── README.md
```

## 🛠️ Technical Details

### Frontend Stack
- **Three.js**: 3D graphics and rendering
- **Vite**: Fast build tool and dev server
- **Vanilla JavaScript**: ES6+ modules
- **WebSockets**: Real-time communication

### Backend Stack
- **Node.js**: Server runtime
- **Express**: HTTP server for health checks
- **ws**: WebSocket library
- **UUID**: Unique ID generation

### Key Features
- **Low-poly Art Style**: Optimized 3D models for performance
- **Real-time Synchronization**: Player positions and actions sync instantly
- **Graceful Disconnection Handling**: Robust connection management
- **Responsive Design**: Works on desktop and mobile devices
- **Production Optimizations**: Minified builds, code splitting

## 🎨 Game Assets

All 3D models are procedurally generated using Three.js geometry:
- **Dogs**: Low-poly box-based models with animations
- **Environment**: Procedural grass textures and decorative elements
- **UI**: Modern CSS with gradients and animations

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start both client and server in dev mode
npm run client:dev   # Start only client dev server
npm run server:dev   # Start only server with nodemon

# Production
npm run build        # Build client for production
npm start           # Start both client and server
npm run client      # Start client production server
npm run server      # Start server

# Code Quality
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
npm test           # Run tests
```

### Environment Variables

Create a `.env` file in the server directory:

```env
PORT=3001
NODE_ENV=production
```

## 🚀 Deployment

### Client Deployment
The client builds to a static site that can be deployed to:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting service

### Server Deployment
The server can be deployed to:
- Heroku
- Railway
- DigitalOcean
- AWS EC2
- Any Node.js hosting service

### Docker Support (Future)
Docker configurations will be added for easy containerized deployment.

## 🎮 Game Design

### Core Mechanics
1. **Territory Control**: Players compete to color the most grass tiles
2. **Real-time Competition**: Immediate feedback and live scoring
3. **Simple Controls**: Easy to learn, fun to master
4. **Short Rounds**: 2-minute games for quick entertainment

### Visual Design
- **Low-poly Aesthetic**: Clean, modern 3D graphics
- **Bright Colors**: Cheerful and engaging color palette
- **Smooth Animations**: Fluid dog movements and grass coloring effects
- **Particle Effects**: Visual feedback for actions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎉 Credits

- Built with ❤️ using Three.js
- Inspired by territory control games
- Dog animations and models created with Three.js primitives

## 🐛 Known Issues

- Mobile touch controls need improvement
- Audio system not yet implemented
- Spectator mode not available

## 🔮 Future Features

- [ ] Sound effects and background music
- [ ] Power-ups and special abilities
- [ ] Tournament mode
- [ ] Custom dog skins
- [ ] Mobile app versions
- [ ] AI opponents
- [ ] Replay system

---

**Have fun playing Dog Cleanup Battle! 🐕💩🎮** 