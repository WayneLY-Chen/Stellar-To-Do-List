const orbTrigger = document.getElementById("orb-trigger");
const appContainer = document.getElementById("app-container");
const inputBox = document.getElementById("input-box");
const timeBox = document.getElementById("time-box");
const listContainer = document.getElementById("list-container");
const returningOverlay = document.getElementById("returning-overlay");

let todoList = [];
let scene, camera, renderer, earthGroup, earthMesh, cloudsMesh;

const TAIWAN_LONGITUDE = 121.5;
const DEFAULT_ROTATION_Y = 4.712 - TAIWAN_LONGITUDE * (Math.PI / 180);
const DEFAULT_ROTATION_X = 0.4;

let targetRotationY = DEFAULT_ROTATION_Y;
let targetRotationX = DEFAULT_ROTATION_X;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let isAutoRotating = true;

function init3DEarth() {
  const container = document.getElementById("earth-container");
  if (!container) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.z = 2.6;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  earthGroup = new THREE.Group();
  earthGroup.rotation.y = DEFAULT_ROTATION_Y;
  earthGroup.rotation.x = DEFAULT_ROTATION_X;
  scene.add(earthGroup);

  const textureLoader = new THREE.TextureLoader();

  const earthGeo = new THREE.SphereGeometry(1, 128, 128);
  const earthMat = new THREE.MeshPhongMaterial({
    map: textureLoader.load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg",
    ),
    specularMap: textureLoader.load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg",
    ),
    normalMap: textureLoader.load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg",
    ),
    color: 0xffffff,
    specular: 0x333333,
    shininess: 10,
  });
  earthMesh = new THREE.Mesh(earthGeo, earthMat);
  earthGroup.add(earthMesh);

  const cloudsGeo = new THREE.SphereGeometry(1.015, 128, 128);
  const cloudsMat = new THREE.MeshPhongMaterial({
    map: textureLoader.load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png",
    ),
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
  earthGroup.add(cloudsMesh);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
  sunLight.position.set(5, 3, 5);
  scene.add(sunLight);

  container.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  container.addEventListener("touchstart", onTouchStart, { passive: false });
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("touchend", onMouseUp);

  window.addEventListener("resize", onWindowResize, false);

  animate();
  getUserLocation();
}

function onWindowResize() {
  const container = document.getElementById("earth-container");
  if (!container || !camera || !renderer) return;
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);

  if (cloudsMesh) {
    cloudsMesh.rotation.y += 0.0004;
    cloudsMesh.rotation.x += 0.0001;
  }

  if (earthGroup) {
    if (!isDragging && isAutoRotating) {
      earthGroup.rotation.y +=
        (targetRotationY - earthGroup.rotation.y) * 0.05 + 0.0002;
      earthGroup.rotation.x += (targetRotationX - earthGroup.rotation.x) * 0.05;
    }
  }

  renderer.render(scene, camera);
}

function onMouseDown(e) {
  isDragging = true;
  isAutoRotating = false;
  previousMousePosition = { x: e.clientX, y: e.clientY };
}

function onMouseMove(e) {
  if (!isDragging) return;
  const deltaMove = {
    x: e.clientX - previousMousePosition.x,
    y: e.clientY - previousMousePosition.y,
  };
  earthGroup.rotation.y += deltaMove.x * 0.005;
  earthGroup.rotation.x += deltaMove.y * 0.005;
  previousMousePosition = { x: e.clientX, y: e.clientY };
}

function onMouseUp(e) {
  isDragging = false;
}

function onTouchStart(e) {
  if (e.touches.length === 1) {
    isDragging = true;
    isAutoRotating = false;
    previousMousePosition = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }
}

function onTouchMove(e) {
  if (!isDragging) return;
  const deltaMove = {
    x: e.touches[0].clientX - previousMousePosition.x,
    y: e.touches[0].clientY - previousMousePosition.y,
  };
  earthGroup.rotation.y += deltaMove.x * 0.008;
  earthGroup.rotation.x += deltaMove.y * 0.008;
  previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}

function getUserLocation() {
  fetch("https://ipapi.co/json/")
    .then((response) => response.json())
    .then((data) => {
      if (data && data.longitude) {
        targetRotationY = 4.712 - data.longitude * (Math.PI / 180);
        if (data.latitude && data.latitude > 20) {
          targetRotationX = 0.4;
        }
      }
    })
    .catch((e) => {});
}

function init() {
  const storedData = localStorage.getItem("spaceTodosV3");
  if (storedData) {
    todoList = JSON.parse(storedData);
    render();
  }
  setInterval(checkNotifications, 5000);
  setTimeout(init3DEarth, 200);
}

function testNotification() {
  if (!("Notification" in window)) return alert("瀏覽器不支援通知");
  if (Notification.permission === "granted")
    new Notification("測試成功", { body: "通知功能運作正常！" });
  else
    Notification.requestPermission().then((p) => {
      if (p === "granted")
        new Notification("授權成功", { body: "現在可以接收星際任務通知了" });
    });
}

orbTrigger.addEventListener("click", () => {
  orbTrigger.classList.add("fade-out");
  appContainer.classList.remove("hidden");
  if (Notification.permission === "default") Notification.requestPermission();
});

function closeApp() {
  appContainer.classList.add("hidden");
  if (returningOverlay) {
    returningOverlay.classList.remove("hidden");
    void returningOverlay.offsetWidth;
    returningOverlay.classList.add("show");
    setTimeout(() => {
      returningOverlay.classList.remove("show");
      returningOverlay.classList.add("hidden");
      orbTrigger.classList.remove("fade-out");
    }, 500);
  } else {
    orbTrigger.classList.remove("fade-out");
  }
}

function addTask() {
  const text = inputBox.value.trim();
  const timeVal = timeBox.value;
  if (!text) return alert("請輸入任務指令！");
  if (!timeVal)
    return alert("錯誤：未設定時間座標！\n\n請點擊右側日曆設定時間。");
  const newTask = {
    id: Date.now(),
    text: text,
    time: timeVal,
    checked: false,
    notified: false,
  };
  todoList.push(newTask);
  saveAndRender();
  inputBox.value = "";
  timeBox.value = "";
}

function deleteTask(id) {
  event.stopPropagation();
  todoList = todoList.filter((t) => t.id !== id);
  saveAndRender();
}

function toggleTask(id) {
  const t = todoList.find((i) => i.id === id);
  if (t) {
    t.checked = !t.checked;
    saveAndRender();
    if (!t.checked)
      setTimeout(() => {
        const el = document.getElementById(`item-${t.id}`);
        if (el) {
          el.classList.add("restoring");
          setTimeout(() => el.classList.remove("restoring"), 800);
        }
      }, 10);
  }
}

function saveAndRender() {
  localStorage.setItem("spaceTodosV3", JSON.stringify(todoList));
  render();
}

function render() {
  listContainer.innerHTML = "";
  todoList.forEach((t) => {
    const li = document.createElement("li");

    let ft = "";
    if (t.time) {
      ft = new Date(t.time).toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    li.innerHTML = `<label class="todo-item" id="item-${t.id}"><input type="checkbox" class="todo-checkbox" ${t.checked ? "checked" : ""} onchange="toggleTask(${t.id})"><svg class="svg-checkbox" viewBox="0 0 24 24"><circle class="circle-outline" cx="12" cy="12" r="10"></circle><path class="checkmark" d="M6 12 L10 16 L18 8"></path></svg><div class="text-wrap"><span class="todo-text">${t.text}</span>${ft ? `<div class="todo-time">🕒 ${ft}</div>` : ""}</div><span class="delete-btn" onclick="deleteTask(${t.id})">×</span></label>`;
    listContainer.appendChild(li);
  });
}

function checkNotifications() {
  if (Notification.permission !== "granted") return;
  const now = new Date();
  todoList.forEach((t) => {
    if (t.time && !t.notified && !t.checked && now >= new Date(t.time)) {
      new Notification("待辦事項提醒", {
        body: `時間到了：${t.text}`,
        icon: "https://cdn-icons-png.flaticon.com/512/2592/2592953.png",
      });
      t.notified = true;
      saveAndRender();
    }
  });
}

init();
