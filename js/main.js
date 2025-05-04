var clock, container, camera, scene, renderer, controls, listener;
var ground, character;
var light, ambientLight, directionalLight, pointLight;
var mixer;
var actions = {};
var activeActionName = 'idle';
var isLoaded = false;
var isAnimationPlaying = true;
var isPaused = false;

var api = { state: 'idle' };

const loader = new THREE.GLTFLoader();

let isWireframe = false;

let walkSpeed = 1.5;
let runSpeed = 4.0;

// 声明全局变量存储不同的模型
var models = {
  eva: null,
  sign: null,
  bottle: null
};

var keyStates = {
  up: false,
  down: false,
  left: false,
  right: false,
  shift: false
};

// 添加游戏相关变量
var gameStarted = false;
var gameOver = false;
var score = 0;
var carSpeed = 1.0; // 汽车速度
var carAcceleration = 0.0002; // 汽车加速度
var carTurningSpeed = 1.5; // 汽车转向速度
var safeDistance = 1.0; // 安全距离，小于这个距离将游戏结束
var gameStartTime = 0;

// 添加食物相关变量
var foods = [];
var maxFoods = 3; // 场景中最多存在的食物数量
var foodSpawnInterval = 5000; // 生成食物的间隔时间(毫秒)
var lastFoodSpawnTime = 0;
var baseWalkSpeed = 1.5; // 保存原始行走速度
var baseRunSpeed = 4.0; // 保存原始奔跑速度
var speedBoostDuration = 8000; // 速度提升持续时间(毫秒)
var speedBoostMultiplier = 1.5; // 速度提升倍数
var speedBoostEndTime = 0; // 速度提升结束时间

// 添加音频相关变量
var sounds = {};
var currentBackgroundMusic = null;
var soundEnabled = true;

init();

function init() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  container = document.getElementById('container');
  container.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  
  // 设置俯视相机
  setupCamera();
  
  ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
  ambientLight.intensity = 0.01;  // 增强环境光
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 0.1);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  pointLight = new THREE.PointLight(0xffaabb, 0.1, 15);
  pointLight.position.set(-3, 3, 3);
  scene.add(pointLight);

  // 添加专门照亮汽车的聚光灯
  const spotLight = new THREE.SpotLight(0xffffff, 1.5);
  spotLight.position.set(0, 5, 2);
  spotLight.angle = Math.PI ;
  spotLight.penumbra = 0.2;
  spotLight.decay = 2;
  spotLight.distance = 500;
  scene.add(spotLight);

  console.log("开始加载汽车模型...");
  loader.load('models/car.glb', function(gltf) {
    console.log('汽车模型加载成功');
    const car = gltf.scene;
    car.scale.set(0.5, 0.5, 0.5); // 调整比例
    car.position.set(0, 0, 0); // 放在场景中心
    car.rotation.y = Math.PI / 4; // 旋转一定角度
    car.castShadow = true;
    car.receiveShadow = true;
    
    // 处理车窗透明效果
    car.traverse((child) => {
      if (child.isMesh) {
        console.log(`检测到mesh: ${child.name}`);
        
        // 查找包含glass或window的部分设置为透明
        if (child.name.toLowerCase().includes('glass') || 
            child.name.toLowerCase().includes('window') || 
            child.name.toLowerCase().includes('windshield')) {
          console.log(`设置透明材质: ${child.name}`);
          
          // 创建新的透明材质
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              mat.transparent = true;
              mat.opacity = 0.6;
              mat.depthWrite = false;
              mat.side = THREE.DoubleSide; // 双面渲染
            });
          } else {
            child.material.transparent = true;
            child.material.opacity = 0.6;
            child.material.depthWrite = false;
            child.material.side = THREE.DoubleSide; // 双面渲染
          }
          child.renderOrder = 1;
        }

        // 增加材质反射率
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            mat.metalness = 0.8;     // 增加金属感
            mat.roughness = 0.2;     // 降低粗糙度，增加光泽
            mat.envMapIntensity = 1.5; // 增强环境反射
          });
        } else if (child.material) {
          child.material.metalness = 0.8;
          child.material.roughness = 0.2;
          child.material.envMapIntensity = 1.5;
        }

        // 确保所有贴图使用第一个UV集
        if (child.material.map) child.material.map.channel = 0;
        if (child.material.normalMap) child.material.normalMap.channel = 0;
        if (child.material.metalnessMap) child.material.metalnessMap.channel = 0;
        if (child.material.roughnessMap) child.material.roughnessMap.channel = 0;
      }
    });
    
    scene.add(car);
    models['car'] = car; // 存储在models对象中
    
    // 如果有需要，可以在这里调整相机位置
    controls.target.set(car.position.x, car.position.y + 0.5, car.position.z);
    
  }, function(xhr) {
    console.log((xhr.loaded / xhr.total * 100) + '% 汽车模型已加载');
  }, function(error) {
    console.error('加载汽车模型时出错:', error);
  });

  console.log("开始加载地面模型...");
  loader.load('models/ground.glb', function(gltf) {
    console.log('地面模型加载成功');
    ground = gltf.scene;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // 调整地面亮度
    adjustGroundMaterial();
    
    // 添加可靠的边界检测
    fixBoundaryDetection();
  }, undefined, function(error) {
    console.error('加载地面模型时出错:', error);
  });

  console.log("开始加载 Eva 模型...");
  loader.load('models/eva-animated.glb', function(gltf) {
    console.log('Eva 模型加载成功');
    character = gltf.scene;
    character.scale.set(1, 1, 1);
    character.position.y = 0.6;
    character.rotation.y = 0;
    character.castShadow = true;
    character.receiveShadow = true;
    scene.add(character);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('models/eva-texture.png', function(texture) {
      console.log('Eva 纹理加载成功');
      texture.flipY = false;
      texture.encoding = THREE.sRGBEncoding;

      character.traverse((child) => {
        if (child.isMesh) {
          if (child.material && (child.material.isMeshStandardMaterial || child.material.isMeshPhongMaterial)) {
            console.log(`为 Mesh "${child.name}" 应用纹理`);
            child.material.map = texture;
            child.material.needsUpdate = true;
          } else {
            console.log(`Mesh "${child.name}" 没有合适的材质或材质类型未知:`, child.material);
          }
        }
      });

      const box = new THREE.Box3().setFromObject(character);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const desiredHeight = 1.6;
      const scale = desiredHeight / size.y;
      character.scale.set(scale, scale, scale);
      character.position.y -= center.y * scale;
      character.position.y += (size.y / 2) * scale;

      mixer = new THREE.AnimationMixer(character);
      actions = {};
      if (gltf.animations && gltf.animations.length > 0) {
        gltf.animations.forEach((clip) => {
          const actionName = clip.name.toLowerCase();
          actions[actionName] = mixer.clipAction(clip);
          actions[actionName].setEffectiveWeight(1);
          actions[actionName].enabled = true;
          actions[actionName].setLoop(THREE.LoopRepeat);
          if (actionName === 'hello' || actionName === 'wave') {
            actions[actionName].setLoop(THREE.LoopOnce);
            actions[actionName].clampWhenFinished = true;
          }
        });
        console.log('可用动画:', Object.keys(actions));

        activeActionName = 'idle';
        if (!actions[activeActionName] && gltf.animations.length > 0) {
          activeActionName = gltf.animations[0].name.toLowerCase();
        }

        if (actions[activeActionName]) {
          actions[activeActionName].play();
          api.state = activeActionName;
          console.log(`播放初始动画: ${activeActionName}`);
        } else {
          console.warn("无法找到可播放的初始动画。");
          activeActionName = '';
        }
        isAnimationPlaying = true;
      } else {
        mixer = null;
        activeActionName = '';
        console.log("Eva 模型没有动画。");
      }

      isLoaded = true;
      controls.target.set(character.position.x, character.position.y + size.y * scale / 2, character.position.z);

      // 在这里调整模型尺寸
      adjustModelScale();
    }, undefined, function(err) {
      console.error('加载 Eva 纹理时出错:', err);
      const box = new THREE.Box3().setFromObject(character);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const desiredHeight = 1.6;
      const scale = desiredHeight / size.y;
      character.scale.set(scale, scale, scale);
      character.position.y -= center.y * scale;
      character.position.y += (size.y / 2) * scale;
      scene.add(character);
      console.log("Eva 模型已添加到场景 (无纹理)。");
      isLoaded = true;

      // 纹理加载失败也要调整尺寸
      adjustModelScale();
    });
  }, undefined, function(error) {
    console.error('加载 Eva 模型时出错:', error);
  });

  // 加载寿司模型
  loadNigiriModel().then(template => {
    window.nigiriTemplate = template;
    console.log("寿司模板准备完成");
  }).catch(error => {
    console.error("寿司模型加载失败:", error);
  });

  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('dblclick', onDoubleClick, false);

  // 监听键盘按下事件
  window.addEventListener('keydown', function(event) {
    switch(event.key) {
      case 'ArrowUp':
        keyStates.up = true;
        break;
      case 'ArrowDown':
        keyStates.down = true;
        break;
      case 'ArrowLeft':
        keyStates.left = true;
        break;
      case 'ArrowRight':
        keyStates.right = true;
        break;
      case 'Shift':
        keyStates.shift = true;
        break;
    }
    updateCharacterState();
  });

  // 监听键盘释放事件
  window.addEventListener('keyup', function(event) {
    switch(event.key) {
      case 'ArrowUp':
        keyStates.up = false;
        break;
      case 'ArrowDown':
        keyStates.down = false;
        break;
      case 'ArrowLeft':
        keyStates.left = false;
        break;
      case 'ArrowRight':
        keyStates.right = false;
        break;
      case 'Shift':
        keyStates.shift = false;
        break;
    }
    updateCharacterState();
  });

  // 监听P键暂停/恢复游戏
  window.addEventListener('keydown', function(event) {
    if (event.key === 'p' || event.key === 'P') {
      togglePause();
    }
  });

  // 添加游戏UI
  addGameUI();

  // 调用新的改进函数
  enhanceLighting();
  setBackgroundColor(); // 基本背景颜色
  addParticleSystem(); // 添加粒子效果
  addSkybox(); // 直接添加渐变背景
  
  // 更新控制按钮样式
  updateControlsStyle();

  animate();

  // 在最后调用性能优化
  optimizePerformance();

  // 在init函数中添加音频系统初始化调用
  initAudioSystem();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  
  const time = Date.now() * 0.001; // 当前时间(秒)
  const dt = clock.getDelta();
  
  // 如果游戏暂停，只更新渲染，不执行逻辑
  if (isPaused) {
    renderer.render(scene, camera);
    return;
  }
  
  // 动画混合器更新
  if (isLoaded && mixer) {
    mixer.update(dt);
  }
  
  // 角色移动逻辑 - 添加实际的移动代码
  if (character && api) {
    let currentSpeed = 0;
    const currentState = api.state ? api.state.toLowerCase() : 'unknown';
    
    if (currentState === 'walk') {
      currentSpeed = walkSpeed;
    } else if (currentState === 'run') {
      currentSpeed = runSpeed;
    }
    
    if (currentSpeed > 0 && dt > 0) {
      const angle = character.rotation.y;
      let deltaX = 0;
      let deltaZ = 0;
      
      // 根据按键决定移动方向
      if (keyStates.up) {
        // 向前移动
        deltaX += Math.sin(angle) * currentSpeed * dt;
        deltaZ += Math.cos(angle) * currentSpeed * dt;
      }
      if (keyStates.down) {
        // 向后移动
        deltaX -= Math.sin(angle) * currentSpeed * dt;
        deltaZ -= Math.cos(angle) * currentSpeed * dt;
      }
      
      character.position.x += deltaX;
      character.position.z += deltaZ;
      
      // 更新相机目标位置
      controls.target.set(character.position.x, character.position.y + 0.8, character.position.z);
    }
    
    // 按键旋转处理
    if (keyStates && (keyStates.left || keyStates.right)) {
      const rotationSpeed = 2.0;
      if (keyStates.left) {
        character.rotation.y += rotationSpeed * dt;
      }
      if (keyStates.right) {
        character.rotation.y -= rotationSpeed * dt;
      }
    }
  }
  
  // 游戏逻辑
  if (gameStarted && !gameOver) {
    // 更新食物系统
    updateFoods(time);
    
    // 检查食物碰撞
    checkFoodCollision();
    
    // 检查速度提升时间
    checkSpeedBoostTime();
    
    // 原有的游戏逻辑
    updateScore();
    updateCarPosition(dt);
    checkCollision();
    
    if (checkBoundary()) {
      endGame('你掉出了边界！');
    }
  }
  
  controls.update();
  renderer.render(scene, camera);
}

function toggleWireframe() {
  isWireframe = !isWireframe;
  
  // 处理character模型（Eva）
  if (character) {
    character.traverse((object) => {
      if (object.isMesh && object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.wireframe = isWireframe);
        } else {
          object.material.wireframe = isWireframe;
        }
      }
    });
  }
  
  // 处理所有已加载的模型（包括汽车）
  Object.keys(models).forEach(key => {
    if (models[key]) {
      models[key].traverse((object) => {
        if (object.isMesh && object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => mat.wireframe = isWireframe);
          } else {
            object.material.wireframe = isWireframe;
          }
        }
      });
    }
  });
  
  // 处理地面
  if (ground && ground.material) {
    ground.material.wireframe = isWireframe;
  }
  
  console.log(`线框模式: ${isWireframe}`);
}

function toggleAnimation() {
  if (!isLoaded || !mixer || !actions[activeActionName]) return;

  isAnimationPlaying = !isAnimationPlaying;
  const currentAction = actions[activeActionName];

  if (isAnimationPlaying) {
    currentAction.paused = false;
    currentAction.play();
    console.log(`动画 '${activeActionName}' 播放`);
  } else {
    currentAction.paused = true;
    console.log(`动画 '${activeActionName}' 暂停`);
  }
}

function toggleLighting() {
  // 反转逻辑：默认光线暗，切换为亮
  directionalLight.intensity = directionalLight.intensity < 0.5 ? 0.6 : 0.1;
  pointLight.intensity = pointLight.intensity < 0.3 ? 0.4 : 0.1;
  console.log(`灯光强度切换: 方向光=${directionalLight.intensity.toFixed(1)}, 点光源=${pointLight.intensity.toFixed(1)}`);
}

function onDoubleClick() {
  if (!isLoaded || !mixer || Object.keys(actions).length <= 1) return;

  const animationNames = Object.keys(actions);
  let currentIndex = animationNames.indexOf(activeActionName);

  currentIndex = (currentIndex + 1) % animationNames.length;
  const nextActionName = animationNames[currentIndex];

  fadeToAction(nextActionName);
  console.log(`切换动画到: ${nextActionName}`);
}

function fadeToAction(name, duration) {
  if (!actions[name] || name === activeActionName) {
    console.warn(`fadeToAction: 动作 "${name}" 不存在或与当前动作相同。`);
    return;
  }

  const fromAction = actions[activeActionName] || null;
  const toAction = actions[name];

  console.log(`淡入淡出: 从 ${activeActionName} 到 ${name}`);

  if (fromAction) {
    fromAction.fadeOut(duration);
  }

  toAction
    .reset()
    .setEffectiveTimeScale(1)
    .setEffectiveWeight(1)
    .fadeIn(duration)
    .play();

  activeActionName = name;
  api.state = name;

  isAnimationPlaying = true;
}

function testChangeState(newState) {
  console.log(`--- HTML 按钮: 尝试切换到: ${newState} ---`);
  if (actions[newState]) {
    fadeToAction(newState, 0.5);
    console.log(`--- HTML 按钮: 调用 fadeToAction 处理 ${newState} ---`);
  } else {
    console.error(`--- HTML 按钮: 找不到动作 '${newState}'! 可用动作:`, Object.keys(actions));
  }
}

// 修改loadModelByKey函数，添加car模型的处理
function loadModelByKey(modelKey) {
  console.log(`切换到模型: ${modelKey}`);
  
  // 隐藏所有模型
  if (character) {
    character.visible = false;
  }
  
  Object.keys(models).forEach(key => {
    if (models[key]) {
      models[key].visible = false;
    }
  });
  
  // 如果已经加载过该模型，则显示它
  if (modelKey === 'car' && models['car']) {
    models['car'].visible = true;
    return;
  }
  
  // 处理其他模型...
  // ... 现有的loadModelByKey代码 ...
}

// 更新角色状态
function updateCharacterState() {
  // 检查是否有任何方向键被按下
  var isMoving = keyStates.up || keyStates.down || keyStates.left || keyStates.right;
  
  if (!isMoving) {
    // 如果没有方向键被按下，设置为idle状态
    if (api.state !== 'idle') {
      fadeToAction('idle', 0.2);
    }
  } else if (keyStates.shift) {
    // 如果按下Shift键，设置为run状态
    if (api.state !== 'run') {
      fadeToAction('run', 0.2);
    }
  } else {
    // 否则设置为walk状态
    if (api.state !== 'walk') {
      fadeToAction('walk', 0.2);
    }
  }

  // 在角色移动后立即检查边界
  if (character && gameStarted && !gameOver) {
    if (checkBoundary()) {
      endGame('你掉出了边界！');
    }
  }
}

// 显示游戏状态的HTML元素
function addGameUI() {
  const gameUI = document.createElement('div');
  gameUI.id = 'game-ui';
  gameUI.style.position = 'fixed';
  gameUI.style.top = '70px';
  gameUI.style.left = '20px';
  gameUI.style.color = '#0ff';
  gameUI.style.fontSize = '20px';
  gameUI.style.zIndex = '100';
  gameUI.innerHTML = `
    <div id="game-status">按空格键开始游戏 (P键暂停)</div>
    <div id="game-score">分数: 0</div>
    <div id="game-time">时间: 0秒</div>
  `;
  document.body.appendChild(gameUI);
  
  // 添加游戏开始按钮
  const startButton = document.createElement('button');
  startButton.textContent = '开始游戏';
  startButton.className = 'btn';
  startButton.style.position = 'fixed';
  startButton.style.top = '170px';
  startButton.style.left = '20px';
  startButton.addEventListener('click', startGame);
  document.body.appendChild(startButton);
}

// 开始游戏
function startGame() {
  if (gameOver) {
    resetGame();
  }
  
  gameStarted = true;
  gameOver = false;
  isPaused = false;
  score = 0;
  gameStartTime = Date.now();
  
  // 切换到游戏背景音乐
  playBackgroundMusic('gameMusic');
  
  // 设置初始位置，放在圆形边界内
  if (character) {
    const gb = window.groundBoundary;
    if (gb && gb.type === 'circle') {
      // 放在中心位置
      character.position.set(
        gb.centerX,
        character.position.y,
        gb.centerZ
      );
    } else {
      character.position.set(0, character.position.y, 0);
    }
  }
  
  // 设置汽车初始位置，放在角色对面
  if (models['car'] && character) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 8; // 比边界小一些的距离
    
    models['car'].position.set(
      character.position.x + Math.sin(angle) * distance,
      models['car'].position.y,
      character.position.z + Math.cos(angle) * distance
    );
    
    // 让汽车面向角色
    models['car'].rotation.y = Math.atan2(
      character.position.x - models['car'].position.x,
      character.position.z - models['car'].position.z
    );
  }
  
  // 重置速度
  walkSpeed = baseWalkSpeed;
  runSpeed = baseRunSpeed;
  speedBoostEndTime = 0;
  
  // 清除现有食物
  foods.forEach(food => scene.remove(food));
  foods = [];
  lastFoodSpawnTime = Date.now();
  
  // 更新UI
  document.getElementById('game-status').textContent = '游戏进行中';
  document.getElementById('game-score').textContent = `分数: ${score}`;
  
  // 确保角色和汽车可见
  if (character) character.visible = true;
  if (models['car']) models['car'].visible = true;
  
  console.log('游戏开始!');
}

// 结束游戏
function endGame(reason = '游戏结束!') {
  gameStarted = false;
  gameOver = true;
  
  // 更新UI
  document.getElementById('game-status').textContent = reason + ' 按空格键重新开始';
  
  // 先播放失败音效，然后再播放背景音乐
  if (sounds['fail']) {
    // 先停止所有音乐
    if (currentBackgroundMusic && sounds[currentBackgroundMusic]) {
      sounds[currentBackgroundMusic].stop();
      currentBackgroundMusic = null;
    }
    
    // 播放失败音效
    const failSound = sounds['fail'];
    
    // 获取音效时长，并在音效播放完毕后再播放背景音乐
    // THREE.js音频没有标准的onended事件，所以使用setTimeout
    failSound.play();
    
    // 估算失败音效的持续时间（秒），如果不知道确切时间，可以使用大致值
    const failSoundDuration = 3000; // 假设2秒
    
    // 在音效播放完后再播放背景音乐
    setTimeout(function() {
      playBackgroundMusic('menuMusic');
    }, failSoundDuration);
  } else {
    // 如果失败音效还没加载好，直接播放背景音乐
    playBackgroundMusic('menuMusic');
  }
  
  console.log(reason);
}

// 重置游戏
function resetGame() {
  score = 0;
  carSpeed = 1.0;
  
  document.getElementById('game-score').textContent = `分数: ${score}`;
  document.getElementById('game-time').textContent = `时间: 0秒`;
}

// 更新游戏分数
function updateScore() {
  if (!gameStarted || gameOver) return;
  
  const currentTime = Date.now();
  const elapsedSeconds = Math.floor((currentTime - gameStartTime) / 1000);
  
  score = elapsedSeconds;
  document.getElementById('game-score').textContent = `分数: ${score}`;
  document.getElementById('game-time').textContent = `时间: ${elapsedSeconds}秒`;
  
  // 随着时间推移增加汽车速度
  carSpeed += carAcceleration * elapsedSeconds;
}

// 检测碰撞
function checkCollision() {
  if (!gameStarted || gameOver || !character || !models['car']) return;
  
  const charPos = character.position;
  const carPos = models['car'].position;
  
  const dx = charPos.x - carPos.x;
  const dz = charPos.z - carPos.z;
  const distSquared = dx*dx + dz*dz;
  const safeDistanceSquared = safeDistance * safeDistance;
  
  if (distSquared < safeDistanceSquared) {
    // 播放失败音效在endGame中处理
    endGame('你被车撞到了！');
  }
}

// 更新汽车位置，追逐角色
function updateCarPosition(dt) {
  if (!gameStarted || gameOver) return;
  if (!character || !models['car']) return;
  
  const car = models['car'];
  const charPos = character.position;
  const carPos = car.position;
  
  // 计算目标方向
  const targetAngle = Math.atan2(
    charPos.x - carPos.x,
    charPos.z - carPos.z
  );
  
  // 计算当前汽车朝向与目标方向之间的差异
  let angleDiff = targetAngle - car.rotation.y;
  
  // 确保角度差在-PI到PI之间
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  
  // 逐渐转向目标方向
  if (Math.abs(angleDiff) > 0.01) {
    car.rotation.y += Math.sign(angleDiff) * Math.min(carTurningSpeed * dt, Math.abs(angleDiff));
  } else {
    car.rotation.y = targetAngle;
  }
  
  // 向前移动
  const moveX = Math.sin(car.rotation.y) * carSpeed * dt;
  const moveZ = Math.cos(car.rotation.y) * carSpeed * dt;
  
  const newX = car.position.x + moveX;
  const newZ = car.position.z + moveZ;
  
  // 检查是否会超出边界
  const gb = window.groundBoundary;
  if (gb && gb.type === 'circle') {
    const distanceToCenter = Math.sqrt(
      Math.pow(newX - gb.centerX, 2) + 
      Math.pow(newZ - gb.centerZ, 2)
    );
    
    // 如果不超出边界，则更新位置
    if (distanceToCenter <= gb.radius * 0.95) { // 给汽车留一点边距
      car.position.x = newX;
      car.position.z = newZ;
    }
  } else {
    car.position.x = newX;
    car.position.z = newZ;
  }
  
  // 确保汽车与地面接触
  car.position.y = 0.1;
}

// 监听空格键开始/重置游戏
window.addEventListener('keydown', function(event) {
  if (event.key === ' ' || event.code === 'Space') {
    if (!gameStarted || gameOver) {
      startGame();
    }
  }
});

window.toggleWireframe = toggleWireframe;
window.toggleAnimation = toggleAnimation;
window.toggleLighting = toggleLighting;
window.testChangeState = testChangeState;
window.loadModelByKey = loadModelByKey;

// 1. 增强光照系统：添加散射光并调整现有灯光
function enhanceLighting() {
  // 增强环境光
  ambientLight.intensity = 0.8;
  ambientLight.color.set(0xccddff);
  
  // 添加半球光（从上方散射的柔和光线）
  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x445566, 0.7);
  hemisphereLight.position.set(0, 50, 0);
  scene.add(hemisphereLight);
  
  // 调整现有方向光
  directionalLight.intensity = 0.9;
  directionalLight.position.set(5, 15, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  
  // 增加柔和点光源
  const softLight = new THREE.PointLight(0xffaa88, 0.8, 30);
  softLight.position.set(5, 5, -5);
  scene.add(softLight);
}

// 2. 添加天空盒作为背景
function addSkybox() {
  // 创建渐变背景
  const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  
  const fragmentShader = `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition + offset).y;
      gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
    }
  `;
  
  const uniforms = {
    topColor: { value: new THREE.Color(0x0077ff) },
    bottomColor: { value: new THREE.Color(0x000033) },
    offset: { value: 33 },
    exponent: { value: 0.6 }
  };
  
  const skyGeo = new THREE.SphereGeometry(400, 32, 15);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.BackSide
  });
  
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
}

// 3. 添加粒子系统作为背景点缀
function addParticleSystem() {
  const particleGeometry = new THREE.BufferGeometry();
  const particleCount = 1000;
  
  const posArray = new Float32Array(particleCount * 3);
  const sizeArray = new Float32Array(particleCount);
  
  for (let i = 0; i < particleCount; i++) {
    // 随机位置在一个大球体内
    const radius = 50 + Math.random() * 150;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    posArray[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    posArray[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) + 20;
    posArray[i * 3 + 2] = radius * Math.cos(phi);
    
    // 随机大小
    sizeArray[i] = Math.random() * 2 + 0.5;
  }
  
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));
  
  const particleMaterial = new THREE.PointsMaterial({
    size: 1,
    color: 0x88aaff,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true
  });
  
  const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particleSystem);
}

// 4. 调整背景颜色
function setBackgroundColor() {
  // 设置场景背景颜色为深蓝色而不是纯黑
  scene.background = new THREE.Color(0x0a1030);
}

// 5. 移动控制按钮到右上角的CSS
function updateControlsStyle() {
  document.head.insertAdjacentHTML('beforeend', `
    <style>
      #controls {
        position: fixed !important;
        right: 20px !important;
        top: 60px !important; /* 在标题下方 */
        transform: none !important;
        display: flex !important;
        flex-direction: row !important;
        gap: 10px !important;
      }
      
      #model-select {
        bottom: unset !important;
        top: 20px !important;
        left: unset !important;
        right: 20px !important;
        transform: none !important;
      }
    </style>
  `);
}

// 1. 调整模型尺寸
function adjustModelScale() {
  // 缩小Eva模型
  if (character) {
    // 获取当前比例，再缩小到原来的40%
    const currentScale = character.scale.x;
    const newScale = currentScale * 0.4;
    character.scale.set(newScale, newScale, newScale);
    
    // 调整角色位置高度，避免下沉到地面
    character.position.y = 0.2; 
  }
  
  // 缩小汽车模型
  Object.keys(models).forEach(key => {
    if (models[key] && (key === 'car' || key === 'sign')) {
      // 获取当前比例，再缩小到原来的40%
      const currentScale = models[key].scale.x;
      const newScale = currentScale * 0.4;
      models[key].scale.set(newScale, newScale, newScale);
      
      // 调整车辆位置高度
      models[key].position.y = 0.05;
    }
  });
  
  console.log("模型尺寸已调整");
}

// 2. 设置圆形边界
function fixBoundaryDetection() {
  // 设置圆形边界
  window.groundBoundary = {
    centerX: 0, // 地面中心X坐标
    centerZ: 0, // 地面中心Z坐标
    radius: 9.6, // 边界半径，根据实际地面调整
    type: 'circle' // 标记边界类型为圆形
  };
  
  console.log("已设置圆形边界，半径:", window.groundBoundary.radius);
  
  // 添加圆形边界可视化（调试用）
  // const segments = 64; // 圆的分段数
  // const circleGeometry = new THREE.BufferGeometry();
  // const gb = window.groundBoundary;
  // const circlePoints = [];
  
  // for (let i = 0; i <= segments; i++) {
  //   const theta = (i / segments) * Math.PI * 2;
  //   const x = gb.centerX + Math.cos(theta) * gb.radius;
  //   const z = gb.centerZ + Math.sin(theta) * gb.radius;
  //   circlePoints.push(new THREE.Vector3(x, 0.1, z));
  // }
  
  // circleGeometry.setFromPoints(circlePoints);
  // const circleMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
  // const circleLine = new THREE.Line(circleGeometry, circleMaterial);
  // scene.add(circleLine);
}

// 3. 修改边界检测函数，使用圆形边界
function checkBoundary() {
  if (!gameStarted || gameOver || !character) return false;
  
  const charPos = character.position;
  const gb = window.groundBoundary;
  
  if (!gb) return false;
  
  if (gb.type === 'circle') {
    const dx = charPos.x - gb.centerX;
    const dz = charPos.z - gb.centerZ;
    const distSquared = dx*dx + dz*dz;
    const radiusSquared = gb.radius * gb.radius;
    
    const isOutOfBounds = distSquared > radiusSquared;
    
    // 如果出界，播放失败音效
    if (isOutOfBounds) {
      playSound('fail');
    }
    
    return isOutOfBounds;
  }
  
  return false;
}

// 4. 调整地面亮度
function adjustGroundMaterial() {
  if (ground) {
    ground.traverse((child) => {
      if (child.isMesh && child.material) {
        console.log("调整地面材质:", child.name);
        
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            // 降低亮度和反光度
            mat.color.multiplyScalar(0.6); // 减少颜色亮度
            mat.roughness = 0.8; // 增加粗糙度，减少反光
            mat.metalness = 0.1; // 降低金属感
            mat.envMapIntensity = 0.3; // 降低环境贴图强度
            mat.needsUpdate = true;
          });
        } else if (child.material) {
          // 降低亮度和反光度
          child.material.color.multiplyScalar(0.6);
          child.material.roughness = 0.8;
          child.material.metalness = 0.1;
          child.material.envMapIntensity = 0.3;
          child.material.needsUpdate = true;
        }
      }
    });
    console.log("地面亮度已调整");
  }
}

// 游戏暂停/恢复切换函数
function togglePause() {
  isPaused = !isPaused;
  
  // 暂停/恢复背景音乐
  if (currentBackgroundMusic && sounds[currentBackgroundMusic]) {
    if (isPaused) {
      sounds[currentBackgroundMusic].pause();
    } else {
      sounds[currentBackgroundMusic].play();
    }
  }
  
  // 显示暂停状态
  let statusElement = document.getElementById('game-status');
  if (isPaused) {
    if (gameStarted && !gameOver) {
      statusElement.textContent = '游戏已暂停（按P继续）';
    }
    console.log('游戏已暂停');
  } else {
    if (gameStarted && !gameOver) {
      statusElement.textContent = '游戏进行中';
    }
    console.log('游戏已恢复');
  }
}

// 调整初始相机位置为更高的俯视角度
function setupCamera() {
  // 更高的俯视视角
  camera.position.set(0, 10, 15); // 高度提高，后移一点
  
  // 调整控制器目标
  controls.target = new THREE.Vector3(0, 0, 0); // 指向场景中心
  controls.update();
  
  // 可选：限制相机旋转范围，保持一定俯视角度
  controls.minPolarAngle = Math.PI / 6; // 30度
  controls.maxPolarAngle = Math.PI / 2.5; // 约72度
  
  console.log('相机位置已调整为俯视角度');
}

// 1. 只优化性能，不修改核心逻辑
function optimizePerformance() {
  // 减少控制台日志
  console.log = function() {
    // 留空，禁用所有日志
  };
  
  // 优化渲染器
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

// 加载寿司模型
function loadNigiriModel() {
  return new Promise((resolve, reject) => {
    console.log("开始加载寿司模型...");
    loader.load('models/nigiri.glb', function(gltf) {
      console.log('寿司模型加载成功');
      const nigiriTemplate = gltf.scene;
      nigiriTemplate.scale.set(0.4, 0.4, 0.4); // 增大寿司尺寸
      nigiriTemplate.visible = false; // 模板初始不可见
      scene.add(nigiriTemplate);
      resolve(nigiriTemplate);
    }, undefined, function(error) {
      console.error('加载寿司模型时出错:', error);
      reject(error);
    });
  });
}

// 在随机位置生成食物
function spawnFood() {
  if (!window.nigiriTemplate) return;
  
  // 检查是否达到最大食物数量
  if (foods.length >= maxFoods) return;
  
  // 在边界内随机位置
  const gb = window.groundBoundary;
  if (!gb || gb.type !== 'circle') return;
  
  // 随机角度和距离
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * (gb.radius * 0.8); // 80%半径内，避免太靠近边缘
  
  const x = gb.centerX + Math.cos(angle) * distance;
  const z = gb.centerZ + Math.sin(angle) * distance;
  
  // 克隆模板创建新食物
  const food = window.nigiriTemplate.clone();
  food.position.set(x, 0.3, z); // 稍微高于地面
  food.rotation.y = Math.random() * Math.PI * 2; // 随机旋转
  food.visible = true;
  
  // 添加动画效果
  const initialY = food.position.y;
  food.userData = {
    spawnTime: Date.now(),
    initialY: initialY,
    animatePosition: function(time) {
      // 上下浮动动画
      food.position.y = initialY + Math.sin(time * 3) * 0.1;
      // 缓慢旋转
      food.rotation.y += 0.02;
    },
    id: Date.now() + '_' + Math.floor(Math.random() * 1000)
  };
  
  scene.add(food);
  foods.push(food);
  
  console.log(`生成食物，当前食物数量: ${foods.length}`);
}

// 检查角色与食物的碰撞
function checkFoodCollision() {
  if (!gameStarted || gameOver || !character) return;
  
  const charPos = character.position;
  const collectionDistance = 1.0; // 收集距离
  const collectionDistanceSq = collectionDistance * collectionDistance;
  
  for (let i = foods.length - 1; i >= 0; i--) {
    const food = foods[i];
    const foodPos = food.position;
    
    // 计算距离平方
    const dx = charPos.x - foodPos.x;
    const dz = charPos.z - foodPos.z;
    const distSq = dx*dx + dz*dz;
    
    if (distSq <= collectionDistanceSq) {
      // 吃到食物，提升速度
      applySpeedBoost();
      
      // 移除食物
      scene.remove(food);
      foods.splice(i, 1);
      
      // 添加收集动画或音效
      console.log("吃到寿司，速度提升!");
    }
  }
}

// 应用速度提升
function applySpeedBoost() {
  // 设置新的速度值
  walkSpeed = baseWalkSpeed * speedBoostMultiplier;
  runSpeed = baseRunSpeed * speedBoostMultiplier;
  
  // 设置结束时间
  speedBoostEndTime = Date.now() + speedBoostDuration;
  
  // 播放奖励音效
  playSound('reward');
  
  // 更新UI提示
  const gameStatus = document.getElementById('game-status');
  if (gameStarted && !gameOver && !isPaused) {
    gameStatus.textContent = '速度提升中！';
    gameStatus.style.color = '#ffff00';
  }
  
  console.log(`速度提升至：行走=${walkSpeed.toFixed(1)}, 奔跑=${runSpeed.toFixed(1)}`);
}

// 检查速度提升时间
function checkSpeedBoostTime() {
  if (speedBoostEndTime > 0 && Date.now() > speedBoostEndTime) {
    // 恢复原速度
    walkSpeed = baseWalkSpeed;
    runSpeed = baseRunSpeed;
    speedBoostEndTime = 0;
    
    // 更新UI
    const gameStatus = document.getElementById('game-status');
    if (gameStarted && !gameOver && !isPaused) {
      gameStatus.textContent = '游戏进行中';
      gameStatus.style.color = '#0ff'; // 恢复原来的颜色
    }
    
    console.log("速度提升结束，恢复正常速度");
  }
}

// 管理食物生成的更新函数
function updateFoods(time) {
  // 定时生成新食物
  if (Date.now() - lastFoodSpawnTime > foodSpawnInterval && foods.length < maxFoods) {
    spawnFood();
    lastFoodSpawnTime = Date.now();
  }
  
  // 更新现有食物的动画
  foods.forEach(food => {
    if (food.userData && food.userData.animatePosition) {
      food.userData.animatePosition(time);
    }
  });
}

// 在init函数开始部分添加音频系统初始化调用
function initAudioSystem() {
  // 创建音频监听器
  listener = new THREE.AudioListener();
  camera.add(listener);
  
  // 预加载所有音效和音乐
  loadSound('reward', 'music/game-reward-317318.mp3', false);
  loadSound('fail', 'music/level-fail-6416.mp3', false);
  loadSound('menuMusic', 'music/happy-mood-126767.mp3', true);
  loadSound('gameMusic', 'music/happy-xmas-happy-new-year-2025-271088.mp3', true);
  
  // 设置较长的延迟确保音频加载完成
  setTimeout(function() {
    if (!currentBackgroundMusic) {
      playBackgroundMusic('menuMusic');
    }
  }, 2000); // 增加到2秒
}

// 修改loadSound函数，让背景音乐立即播放
function loadSound(name, url, isLoop) {
  const sound = new THREE.Audio(listener);
  
  const audioLoader = new THREE.AudioLoader();
  audioLoader.load(url, function(buffer) {
    sound.setBuffer(buffer);
    sound.setLoop(isLoop);
    sound.setVolume(isLoop ? 0.5 : 0.7);
    sounds[name] = sound;
    
    // 如果是菜单音乐且游戏未开始且页面刚加载，立即播放
    if (name === 'menuMusic' && !gameStarted && !currentBackgroundMusic) {
      playBackgroundMusic('menuMusic');
    }
    
    console.log(`音频已加载: ${name}`);
  });
}

// 播放音效
function playSound(name) {
  if (!soundEnabled) return;
  
  const sound = sounds[name];
  if (sound && !sound.isPlaying) {
    sound.play();
  } else if (sound) {
    sound.stop();
    sound.play();
  }
}

// 播放背景音乐
function playBackgroundMusic(name) {
  if (!soundEnabled) return;
  
  // 如果当前有背景音乐在播放，先停止
  if (currentBackgroundMusic && sounds[currentBackgroundMusic] && sounds[currentBackgroundMusic].isPlaying) {
    sounds[currentBackgroundMusic].stop();
  }
  
  // 播放新的背景音乐
  if (sounds[name]) {
    sounds[name].play();
    currentBackgroundMusic = name;
  }
}

// 确保页面加载完成后立即播放背景音乐
// 在window.onload事件中添加以下代码，确保音频系统初始化后尝试播放
window.addEventListener('load', function() {
  if (!currentBackgroundMusic && sounds['menuMusic']) {
    playBackgroundMusic('menuMusic');
  }
});
