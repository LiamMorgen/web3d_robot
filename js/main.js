var clock, container, camera, scene, renderer, controls, listener;
var ground, character;
var light, ambientLight, directionalLight, pointLight;
var mixer, actions, activeAction, previousAction;
var api = { state: 'idle' };
const loader = new THREE.GLTFLoader();
var isLoaded = false;
var action = {}, activeActionName = 'idle';

let isWireframe = false;
let isAnimationPlaying = true;

const walkSpeed = 1.5; // 定义行走速度
const runSpeed = 4.0;  // 定义跑步速度

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

    const textureLoader = new THREE.TextureLoader();  // 创建纹理加载器 eva-texture.png' 22222.png
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
      action = {};
      if (gltf.animations && gltf.animations.length > 0) {
        gltf.animations.forEach((clip) => {
          const actionName = clip.name.toLowerCase();
          action[actionName] = mixer.clipAction(clip);
          action[actionName].setEffectiveWeight(1);
          action[actionName].enabled = true;
          action[actionName].setLoop(THREE.LoopRepeat);
          if (actionName === 'hello' || actionName === 'wave') {
            action[actionName].setLoop(THREE.LoopOnce);
            action[actionName].clampWhenFinished = true;
          }
        });
        console.log('可用动画:', Object.keys(action));

        activeActionName = 'idle';
        if (!action[activeActionName] && gltf.animations.length > 0) {
          activeActionName = gltf.animations[0].name.toLowerCase();
        }

        if (action[activeActionName]) {
          action[activeActionName].play();
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

    createGUI(character, gltf.animations);
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
  if (!isLoaded || !mixer || !action[activeActionName]) return;

  isAnimationPlaying = !isAnimationPlaying;
  const currentAction = action[activeActionName];

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
  if (!isLoaded || !mixer || Object.keys(action).length <= 1) return;

  const animationNames = Object.keys(action);
  let currentIndex = animationNames.indexOf(activeActionName);

  currentIndex = (currentIndex + 1) % animationNames.length;
  const nextActionName = animationNames[currentIndex];

  fadeAction(nextActionName);
  console.log(`切换动画到: ${nextActionName}`);
}

function fadeAction(name) {
  if (!action[name] || name === activeActionName) return;

  const fromAction = action[activeActionName] || null;
  const toAction = action[name];

  if (fromAction) {
    fromAction.fadeOut(0.3);
  }

  toAction
    .reset()
    .setEffectiveTimeScale(1)
    .setEffectiveWeight(1)
    .fadeIn(0.3)
    .play();

  activeActionName = name;

  isAnimationPlaying = true;
  action[activeActionName].paused = false;
}

function createGUI(model, animations) {
  const states = ['idle', 'walk', 'run', 'pose', 'hello'];
  const gui = new dat.GUI();
  mixer = new THREE.AnimationMixer(model);
  actions = {};

  const animFolder = gui.addFolder('Animations');
  console.log("createGUI: Checking global 'api' object before adding:", api); 
  if (!api || typeof api.state === 'undefined') {
     console.error("createGUI: Global 'api' object or 'api.state' is missing!");
     return; 
  }

  const clipCtrl = animFolder.add(api, 'state').options(states);
  console.log("createGUI: Controller object created:", clipCtrl); 
  
  function handleStateChange(value) {
      console.log("--- handleStateChange called! ---"); 
      console.log("   New value received:", value);
      api.state = value; 
      fadeToAction(value, 0.5); 
  }

  console.log("createGUI: Attempting to attach onChange with named function...");
  try {
      clipCtrl.onChange(handleStateChange);
      console.log("createGUI: Attached onChange successfully (apparently).");
  } catch (e) {
      console.error("createGUI: Error attaching onChange:", e);
  }

  animFolder.open();
  
  api.state = 'idle';
  activeAction = actions[api.state];
  if (activeAction) {
      activeAction.play();
  } else {
       console.warn("无法找到初始动画:", api.state);
  }
}

function testChangeState(newState) {
    console.log(`--- TEST BUTTON: Attempting to change state to: ${newState} ---`);
    if (actions[newState]) {
        api.state = newState; 
        fadeToAction(newState, 0.5); 
        console.log(`--- TEST BUTTON: State changed, fadeToAction called for ${newState} ---`);
    } else {
        console.error(`--- TEST BUTTON: Action '${newState}' not found! ---`);
    }
}

window.toggleWireframe = toggleWireframe;
window.toggleAnimation = toggleAnimation;
window.toggleLighting = toggleLighting;
