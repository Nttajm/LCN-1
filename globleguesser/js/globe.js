import Globe from "globe.gl";
import * as THREE from "three";

const IDLE_MS = 600;
const POLYGON_ALTITUDE = 0.008;
const START_LAND = "#7cb85c";
const START_LAND_STROKE = "#5a9a42";
const START_OCEAN = "#243d6b";
const START_POV = { lat: 18, lng: 0, altitude: 1.55 };
const GAME_POV = { lat: 18, lng: 0, altitude: 2.05 };

export function createGlobe(container, features) {
  const featureByName = new Map(
    features.map((feat) => [feat.properties?.name || "", feat])
  );
  const guessed = new Map();
  let idleTimer = null;
  let paused = false;
  let inGameplay = false;

  function getName(feat) {
    return feat.properties?.name || "";
  }

  function capColor(feat) {
    return guessed.get(getName(feat))?.color ?? START_LAND;
  }

  function strokeColor(feat) {
    return guessed.get(getName(feat))?.stroke ?? START_LAND_STROKE;
  }

  const w = Math.max(container.clientWidth, 1);
  const h = Math.max(container.clientHeight, 1);

  const oceanMaterial = new THREE.MeshPhongMaterial({
    color: START_OCEAN,
    shininess: 8,
    specular: new THREE.Color(0x334466),
  });

  const globe = new Globe(container, {
    animateIn: false,
    rendererConfig: {
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
    },
  })
    .width(w)
    .height(h)
    .globeImageUrl(null)
    .globeMaterial(oceanMaterial)
    .backgroundColor("rgba(0, 0, 0, 0)")
    .enablePointerInteraction(false)
    .showAtmosphere(true)
    .atmosphereColor("rgb(160, 210, 255)")
    .atmosphereAltitude(0.14)
    .globeCurvatureResolution(4)
    .polygonsData(features)
    .polygonCapColor(capColor)
    .polygonSideColor(() => "rgba(0, 0, 0, 0)")
    .polygonStrokeColor(strokeColor)
    .polygonAltitude(POLYGON_ALTITUDE)
    .polygonCapCurvatureResolution(8)
    .polygonsTransitionDuration(0)
    .pointOfView(START_POV);

  const renderer = globe.renderer();
  if (renderer) {
    renderer.setPixelRatio(Math.min(1.25, window.devicePixelRatio));
  }

  const controls = globe.controls();
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.65;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;
  if (controls.minDistance !== undefined) controls.minDistance = 120;
  if (controls.maxDistance !== undefined) controls.maxDistance = 600;

  function schedulePause(delay = IDLE_MS) {
    if (!inGameplay) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      globe.pauseAnimation();
      paused = true;
    }, delay);
  }

  function wake() {
    if (!inGameplay) return;
    if (paused) {
      globe.resumeAnimation();
      paused = false;
    }
    schedulePause();
  }

  function refreshPolygons() {
    globe
      .polygonsData(features)
      .polygonCapColor(capColor)
      .polygonStrokeColor(strokeColor);
  }

  function resize() {
    const w = Math.max(inGameplay ? window.innerWidth : container.clientWidth, 1);
    const h = Math.max(inGameplay ? window.innerHeight : container.clientHeight, 1);
    globe.width(w).height(h);
  }

  resize();

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  if (container.parentElement) resizeObserver.observe(container.parentElement);
  window.addEventListener("resize", resize);

  container.addEventListener("pointerdown", wake, true);
  container.addEventListener("wheel", wake, { passive: true, capture: true });
  controls.addEventListener("start", wake);
  controls.addEventListener("end", () => schedulePause());

  return {
    initStartView() {
      inGameplay = false;
      clearTimeout(idleTimer);
      if (paused) {
        globe.resumeAnimation();
        paused = false;
      }

      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.enableRotate = false;
      globe.enablePointerInteraction(false);

      refreshPolygons();
      globe.pointOfView(START_POV, 0);
    },

    transitionToGame(duration = 1100) {
      inGameplay = true;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.15;

      globe.pointOfView(GAME_POV, duration);
      resize();

      setTimeout(() => {
        controls.autoRotate = false;
        controls.enableRotate = true;
        globe.enablePointerInteraction(true);
        resize();
        schedulePause(1200);
      }, duration);
    },

    setGuess(name, color, stroke = "#1a1a1a") {
      const feature = featureByName.get(name);
      if (!feature) return;
      guessed.set(name, { color, stroke, feature });
      refreshPolygons();
      wake();
    },

    clearGuesses() {
      guessed.clear();
      refreshPolygons();
    },

    flyTo(lat, lng, altitude = 1.8) {
      wake();
      globe.pointOfView({ lat, lng, altitude }, 800);
      schedulePause(900);
    },

    dispose() {
      clearTimeout(idleTimer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      container.innerHTML = "";
    },
  };
}
