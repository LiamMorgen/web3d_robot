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
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  pointLight = new THREE.PointLight(0xffaabb, 0.6, 15);
  pointLight.position.set(-3, 3, 3);
  scene.add(pointLight);

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
  
  if (character && api) {
    let currentSpeed = 0;
    const currentState = api.state ? api.state.toLowerCase() : 'unknown';

    console.log("Animate Check: State =", currentState);

    if (currentState === 'walk') {
      currentSpeed = walkSpeed;
    } else if (currentState === 'run') {
      currentSpeed = runSpeed;
    }

    if (currentSpeed > 0 && dt > 0) {
      const angle = character.rotation.y;
      const deltaX = Math.sin(angle) * currentSpeed * dt;
      const deltaZ = Math.cos(angle) * currentSpeed * dt;

      console.log(`Animate Move: dX=${deltaX.toFixed(4)}, dZ=${deltaZ.toFixed(4)}`);

      character.position.x += deltaX;
      character.position.z += deltaZ;
    }
  }
  
  controls.update();
  renderer.render(scene, camera);
}

function toggleWireframe() {
  isWireframe = !isWireframe;
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

window.toggleWireframe = toggleWireframe;
window.toggleAnimation = toggleAnimation;
window.toggleLighting = toggleLighting;
window.testChangeState = testChangeState;
