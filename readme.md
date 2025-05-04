# 3D Character Animation App - Assignment Submission

## Project Introduction

This is a 3D interactive application developed using Three.js for my 3D App assignment. The application showcases 3D models with animation capabilities and interactive features, allowing users to manipulate the models in 3D space. It combines multiple 3D models, animation control, and an intuitive user interface.

![Game Screenshot](screenshots/game.png)

## Assignment Requirements Met

### Models and Interactivity
- **Multiple 3D Models**: Includes three distinct models (Eva character, Car, and Nigiri food items)
- **Model Refinement**: Enhanced geometry, materials, and textures on all models
- **Wireframe Viewing**: Toggle button to switch between wireframe and solid rendering
- **Lighting Control**: Interface to adjust scene lighting and effects
- **Animation System**: Character animations that can be triggered through the UI
- **Interactive Control**: Keyboard-based movement system (Arrow keys/WASD)

### User Interface & Layout
- **Responsive Design**: Adapts to different screen sizes using modern CSS
- **Header with Logo**: Custom-designed header with application title
- **Model Selection**: Interface to switch between different 3D models
- **User Controls**: Buttons for animation control, rendering options, and game functions
- **Information Section**: Details about controls and application features

### Technical Implementation
- **JavaScript Interactivity**: Advanced event handling and model manipulation
- **Content Swapping**: Dynamic content updates without page reloading
- **Camera Control**: Orbit controls for viewing models from different angles
- **Performance Optimization**: Techniques applied to ensure smooth rendering

## Features

- Interactive 3D model viewer with three distinct models
- Animation system with multiple character animations (idle, walk, run)
- Dynamic lighting system with adjustable parameters
- Responsive user interface for model interaction
- Game mode demonstrating practical application of 3D models
- Wireframe rendering toggle for examining model structure
- Camera controls for examining models from all angles
- Food collection system with speed boost mechanics
- Collision detection and boundary checking
- Background music and sound effects system
- Particle effects and skybox for enhanced visuals

## Quick Start

### Local Setup

1. **Clone the project**
   ```bash
   git clone https://github.com/yourusername/3d-character-animation-app.git
   cd 3d-character-animation-app
   ```

2. **Prepare the required 3D models**
   
   Place the following models in the `models/` directory:
   ```
   models/
   ├── car.glb              # Car model
   ├── eva-animated.glb     # Eva character model with animations
   ├── eva-texture.png      # Eva texture file
   ├── ground.glb           # Ground/environment model
   └── nigiri.glb           # Sushi food item model
   ```
   These models are required for the application to function properly.

3. **Start a local server**

   Method 1: Using Node.js http-server
   ```bash
   # Install http-server
   npm install -g http-server
   
   # Start server
   http-server
   ```
   Method 2: Using Python built-in server (recommended)
   Python environment required
   ```bash
   # Python 3
   python -m http.server
   
   # Python 2
   python -m SimpleHTTPServer
   ```
   Then open http://127.0.0.1:8080 in your browser
   

4. **Access the application**
   Open your browser and visit `http://localhost:8080` or the port specified by your server

## Technology Stack

- Three.js (v0.128.0) for 3D rendering and animation
- GLTFLoader for 3D model loading
- Native JavaScript for interactivity and game logic
- HTML5 and CSS3 for responsive layout
- Custom shaders for skybox and visual effects
- Audio system with dynamic sound management

## Usage Guide

### Controls

#### Model Viewing
- **Left mouse button drag**: Rotate camera around model
- **Right mouse button drag**: Pan camera
- **Mouse wheel**: Zoom in/out
- **Double-click**: Switch between animations (when using character model)

#### Character Movement (in game mode)
- **Arrow keys/WASD**: Control character movement
- **Shift + Arrow keys**: Run (faster movement)
- **Space bar**: Start/Restart game
- **P key**: Pause/Resume

#### Interface Controls
- **Toggle Wireframe**: Switch between solid and wireframe rendering
- **Play/Pause Animation**: Control animation playback
- **Toggle Lighting**: Adjust scene lighting effects
- **Model selection buttons**: Switch between different 3D models

### Game Mode Instructions

1. Press the "Start Game" button or Space bar to begin
2. Use arrow keys to move the character and avoid the pursuing car
3. Collect sushi items to gain temporary speed boosts
4. Stay within the circular boundary to avoid falling off
5. Your score increases the longer you survive
6. Game ends if you collide with the car or fall off the edge
7. Press Space to restart after game over

```
+------------------------------------------------------+
|                                                      |
|  +------------------+        3D Interactive Display  |
|  | Game Status:     |                                |
|  | Press SPACE      |        +-----------------+     |
|  | to start         |        | Toggle Wireframe|     |
|  +------------------+        +-----------------+     |
|                                                      |
|  +------------------+        +-----------------+     |
|  | Score: 0         |        | Play/Pause Anim |     |
|  +------------------+        +-----------------+     |
|                                                      |
|  +------------------+        +-----------------+     |
|  | Time: 0s         |        | Toggle Lighting |     |
|  +------------------+        +-----------------+     |
|                                                      |
|  +--------------+                                    |
|  | Start Game   |                                    |
|  +--------------+                                    |
|                                                      |
|           +-----------------------+                  |
|           |                       |                  |
|           |    Circular Boundary  |                  |
|           |         +---+         |                  |
|           |         | E |         |                  |
|           |         +---+         |                  |
|           |        Character      |                  |
|           |                       |                  |
|           |      🍣               |                  |
|           |    Food Item          |                  |
|           |                       |                  |
|           |         +---+         |                  |
|           |         | C |         |                  |
|           |         +---+         |                  |
|           |          Car          |                  |
|           |                       |                  |
|           +-----------------------+                  |
|                                                      |
|                                                      |
|                                                      |
|                                                      |
+------------------------------------------------------+
```

The game logic flow is illustrated below:

```
+------------------+     +-------------------+     +---------------+
| Start            |---->| Game State Check  |---->| Game Over     |
+------------------+     +-------------------+     +---------------+
                          |               ^          |
                          v               |          v
 +-----------------------+|               |  +------------------+
 | Not Started:          ||               |  | Display Game Over|
 | "Press SPACE to start"||               |  | and Score        |
 +-----------------------+|               |  +------------------+
                          v               |          |
                    +---------------+     |          |
                    | Initialize    |<----+          |
                    | Game          |<-----------------
                    +---------------+
                          |
                          v
                    +---------------+                          
                    | Game Main Loop|<-------------------+    
                    |               |                    |    
                          |                              |
                          v                              |
        +-----------------------------------+            |
        |                                   |            |
        v                v                  v            |
 +-------------+  +---------------+  +---------------+   |
 | Update      |  | Check         |  | Check Food &  |   |
 | Positions   |  | Collisions    |  | Boundaries    |   |
 +-------------+  +---------------+  +---------------+   |
                          |                  |           |
                          v                  v           |
                  +----------------+  +---------------+  |
                  | Game Over      |  | Speed Boost   |  |
                  | if Collision   |  | if Food       |  |
                  +----------------+  +---------------+  |
                          |                  |           |
                          |                  +----------+
                          v
                  +----------------+
                  | Stop Music     |
                  | Play Fail Sound|
                  +----------------+
```

## Project Structure

```
threejs-animation-workflow/
├── index.html          # Main HTML file with responsive layout
├── js/
│   └── main.js         # Main application logic and Three.js initialization
├── models/             # 3D model files
│   ├── car.glb         # Car model
│   ├── eva-animated.glb # Eva character model with animations
│   ├── eva-texture.png # Character texture
│   ├── ground.glb      # Environment model
│   └── nigiri.glb      # Food model
├── music/              # Audio files for game sounds
│   ├── game-reward-317318.mp3    # Reward sound
│   ├── level-fail-6416.mp3       # Fail sound
│   ├── happy-mood-126767.mp3     # Menu music
│   └── happy-xmas-happy-new-year-2025-271088.mp3  # Game music
└── textures/           # Additional texture files
```

## Technical Implementation Details

### Model Handling
- Custom loading system for GLTF/GLB models
- Material refinement with proper transparency and lighting
- Animation mixer for character movement and actions
- Texture management with proper UV mapping

### Lighting System
- Dynamic lighting with multiple light sources:
  - Ambient light for global illumination
  - Directional light for sun-like effects
  - Point lights for local illumination
  - Spotlight focused on the car model
- Hemisphere light for realistic sky reflection
- Adjustable lighting parameters through the UI

### Animation System
- Character animations include:
  - Idle stance
  - Walking movement
  - Running movement
- Animation blending for smooth transitions
- Animation speed adjustments based on gameplay
- Animation triggers through user interface

### Interaction Techniques
- Real-time model manipulation
- Event-based controls for both desktop and mobile
- Physics-based movement and collision detection
- Camera system with smooth transitions
- Object picking and selection

### Game Mechanics
- AI-controlled car that pursues the player
- Collectible items that provide speed boosts
- Score system based on survival time
- Collision detection between characters and objects
- Circular boundary system with visibility checks

### Visual Effects
- Particle system for atmospheric effects
- Skybox with gradient shading
- Material enhancements for car windows and reflections
- Ground texture adjustments for proper lighting
- Camera positioning for optimal viewing

### Performance Optimization
- Adaptive rendering quality based on device capabilities
- Efficient asset loading and memory management
- Optimized draw calls and shader complexity
- LOD (Level of Detail) considerations
- Console logging reduction in production mode

## Development Process

The development followed these key steps:
1. Creation and refinement of 3D models in Blender
2. Export and optimization for web display
3. Implementation of Three.js rendering pipeline
4. Development of animation and interaction systems
5. Creation of responsive UI elements
6. Integration of all components into a cohesive application
7. Game mechanics implementation
8. Audio system integration
9. Visual effects enhancement
10. Testing and performance optimization

![Development Workflow](screenshots/development-workflow.png)

## Statement of Originality

This project has been developed specifically for this assignment. While it utilizes standard Three.js techniques and components, the implementation, model selection, and user interface design are original work. Where external resources have been used (such as model inspiration or code references), they have been properly acknowledged in the comments and references section.

## Testing Notes

The application has been tested on multiple browsers (Chrome, Firefox, Safari, Edge) and devices to ensure compatibility and performance. A formal testing session was conducted in week 11 as required by the assignment brief.

### Test Results
| Browser/Device | Performance | Rendering | Controls | Notes |
|----------------|-------------|-----------|----------|-------|
| Chrome (Windows) | Excellent | Complete | Responsive | Recommended platform |
| Firefox (Windows) | Good | Complete | Responsive | Minor framerate issues with particles |
| Safari (MacOS) | Good | Complete | Responsive | Audio may require user interaction first |
| Edge (Windows) | Excellent | Complete | Responsive | Works well |


## Browser Compatibility

- Chrome 75+
- Firefox 67+
- Safari 12.1+
- Edge 79+

WebGL and ES6 features support required.

## Troubleshooting

1. **Models not displaying**
   - Check console for errors
   - Confirm model paths are correct
   - Check if model format is compatible
   - Ensure WebGL is enabled in your browser

2. **Game lagging**
   - Reduce browser tabs and background applications
   - Lower rendering resolution
   - Simplify model complexity
   - Reduce lighting and shadow calculations

3. **Controls not responding**
   - Check keyboard event listeners
   - Confirm game loop is running normally
   - Verify game state (paused/ended)
   - Try clicking on the game window to ensure focus

4. **Audio not playing**
   - Check browser audio permissions
   - Interact with the page first (many browsers require user interaction)
   - Verify audio files are correctly loaded
   - Check volume settings

## References and Resources

- Three.js documentation and examples (https://threejs.org/)
- GLTF 2.0 specification (https://github.com/KhronosGroup/glTF)
- W3Schools for HTML/CSS references (https://www.w3schools.com/)
- MDN Web Docs for JavaScript references (https://developer.mozilla.org/)
- Sound effects from Pixabay (https://pixabay.com/sound-effects/)
- WebGL fundamentals (https://webglfundamentals.org/)

## Future Enhancements

- Additional character models and animations
- More complex game mechanics and objectives
- Mobile-optimized controls
- Level progression system
- Multiplayer capabilities
- Enhanced visual effects and post-processing

---

This project demonstrates the practical application of web-based 3D graphics techniques learned throughout the course, showcasing both technical implementation skills and creative design application.
