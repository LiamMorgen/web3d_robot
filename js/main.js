var clock, container, camera, scene, renderer, controls, listener;
var ground, character;
var light, ambientLight, directionalLight, pointLight;
var mixer;
var actions = {};
var activeActionName = 'idle';
var isLoaded = false;
var isAnimationPlaying = true;

var api = { state: 'idle' };

const loader = new THREE.GLTFLoader();

let isWireframe = false;

const walkSpeed = 1.5;
const runSpeed = 4.0;

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
  camera.position.set(0, 1.5, 3.5);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target = new THREE.Vector3(0, 0.8, 0);
  controls.enableDamping = true;
  
  ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  ambientLight.intensity = 0.2;  // 增强环境光
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  pointLight = new THREE.PointLight(0xffaabb, 0.6, 15);
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
    const ground = gltf.scene;
    ground.rotation.x = 0;
    ground.rotation.y = 0;
    ground.rotation.z = 0;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);

    const box = new THREE.Box3().setFromObject(ground);
    const size = box.getSize(new THREE.Vector3());
    console.log('地面模型尺寸:', size);
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
    });
  }, undefined, function(error) {
    console.error('加载 Eva 模型时出错:', error);
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

  // 添加游戏UI
  addGameUI();

  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  console.log("Animate loop running...");
  
  const dt = clock.getDelta();
  
  if (isLoaded && mixer) {
    mixer.update(dt);
  }
  
  // 角色移动控制
  if (character && isLoaded) {
    let currentSpeed = 0;
    let rotationSpeed = 2.0; // 旋转速度
    
    if (api.state === 'walk') {
      currentSpeed = walkSpeed;
    } else if (api.state === 'run') {
      currentSpeed = runSpeed;
    }
    
    if (currentSpeed > 0) {
      // 根据按键状态计算移动方向
      if (keyStates.left) {
        character.rotation.y += rotationSpeed * dt;
      }
      if (keyStates.right) {
        character.rotation.y -= rotationSpeed * dt;
      }
      
      // 计算前进方向
      let moveZ = 0;
      let moveX = 0;
      
      if (keyStates.up) {
        moveZ = 1;
      }
      if (keyStates.down) {
        moveZ = -1;
      }
      
      if (moveZ !== 0) {
        const angle = character.rotation.y;
        const deltaX = Math.sin(angle) * currentSpeed * dt * moveZ;
        const deltaZ = Math.cos(angle) * currentSpeed * dt * moveZ;
        
        character.position.x += deltaX;
        character.position.z += deltaZ;
        
        // 如果角色移动，让相机跟随
        controls.target.set(character.position.x, character.position.y + 0.8, character.position.z);
      }
    }
  }
  
  controls.update();

  // 游戏逻辑更新
  if (gameStarted && !gameOver) {
    // 更新分数
    updateScore();
    
    // 更新汽车位置
    updateCarPosition(dt);
    
    // 检测碰撞
    checkCollision();
  }
  
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
  directionalLight.intensity = directionalLight.intensity > 0.1 ? 0.1 : 0.8;
  pointLight.intensity = pointLight.intensity > 0.1 ? 0.6 : 0.1;
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
    <div id="game-status">按空格键开始游戏</div>
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
  score = 0;
  gameStartTime = Date.now();
  
  // 设置初始位置
  if (character) {
    character.position.set(0, 0, 0);
  }
  
  if (models['car']) {
    models['car'].position.set(10, 0, 10);
    models['car'].rotation.y = 0;
  }
  
  // 更新UI
  document.getElementById('game-status').textContent = '游戏进行中';
  document.getElementById('game-score').textContent = `分数: ${score}`;
  
  // 确保角色可见
  if (character) {
    character.visible = true;
  }
  
  // 确保汽车可见
  if (models['car']) {
    models['car'].visible = true;
  }
  
  console.log('游戏开始!');
}

// 结束游戏
function endGame() {
  gameStarted = false;
  gameOver = true;
  
  // 更新UI
  document.getElementById('game-status').textContent = '游戏结束! 按空格键重新开始';
  
  console.log('游戏结束!');
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
  if (!gameStarted || gameOver) return;
  if (!character || !models['car']) return;
  
  const charPos = character.position;
  const carPos = models['car'].position;
  
  // 计算距离
  const distance = Math.sqrt(
    Math.pow(charPos.x - carPos.x, 2) + 
    Math.pow(charPos.z - carPos.z, 2)
  );
  
  // 如果距离小于安全距离，游戏结束
  if (distance < safeDistance) {
    endGame();
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
  
  car.position.x += moveX;
  car.position.z += moveZ;
  
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
