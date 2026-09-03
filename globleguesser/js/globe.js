import Globe from "globe.gl";
import * as THREE from "three";

const IDLE_MS = 600;
const POLYGON_ALTITUDE = 0.012;
const START_LAND = "#7cb85c";
const START_LAND_STROKE = "#5a9a42";
const START_OCEAN = "#243d6b";
const HOVER_HIGHLIGHT = "#c8f07a";
const HOVER_HIGHLIGHT_STROKE = "#9ed456";
const HOVER_DIM = "#3a5230";
const HOVER_DIM_STROKE = "#2a3d22";
const START_POV = { lat: 18, lng: 0, altitude: 1.55 };
const GAME_POV = { lat: 18, lng: 0, altitude: 2.05 };
const REGION_SELECT_POV = { lat: 12, lng: 18, altitude: 1.62 };
const IDLE_ROTATE_SPEED = 0.35;
const BURST_ROTATE_SPEED = 2.6;
const REGION_HOVER_MS = 1000;
const REGION_RETURN_MS = 900;
const VIEW_TRANSITION_MS = 1300;

export function createGlobe(container, features, regionMembers = null, regionCentroids = null) {
  const featureByName = new Map(
    features.map((feat) => [feat.properties?.name || "", feat])
  );
  const guessed = new Map();
  let idleTimer = null;
  let paused = false;
  let inGameplay = false;
  let inRegionSelect = false;
  let burstTimer = null;
  let hoveredRegion = null;
  let cameraRegion = null;
  let regionDetailLocked = false;

  function getName(feat) {
    return feat.properties?.name || "";
  }

  function isHighlighted(name) {
    if (!hoveredRegion || !regionMembers) return false;
    if (hoveredRegion === "world") return true;
    return regionMembers.get(hoveredRegion)?.has(name) ?? false;
  }

  function capColor(feat) {
    const name = getName(feat);
    const guess = guessed.get(name);
    if (guess) return guess.color;

    if (hoveredRegion && regionMembers) {
      return isHighlighted(name) ? HOVER_HIGHLIGHT : HOVER_DIM;
    }

    return START_LAND;
  }

  function strokeColor(feat) {
    const name = getName(feat);
    const guess = guessed.get(name);
    if (guess) return guess.stroke;

    if (hoveredRegion && regionMembers) {
      return isHighlighted(name) ? HOVER_HIGHLIGHT_STROKE : HOVER_DIM_STROKE;
    }

    return START_LAND_STROKE;
  }

  function polygonAltitude(feat) {
    const name = getName(feat);
    if (guessed.has(name)) return POLYGON_ALTITUDE;

    if (hoveredRegion && regionMembers) {
      return isHighlighted(name) ? POLYGON_ALTITUDE * 2.2 : POLYGON_ALTITUDE * 0.35;
    }

    return POLYGON_ALTITUDE;
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
    .polygonAltitude(polygonAltitude)
    .polygonCapCurvatureResolution(4)
    .polygonsTransitionDuration(400)
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
  controls.autoRotateSpeed = IDLE_ROTATE_SPEED;
  if (controls.minDistance !== undefined) controls.minDistance = 120;
  if (controls.maxDistance !== undefined) controls.maxDistance = 600;

  function schedulePause(delay = IDLE_MS) {
    if (!inGameplay || inRegionSelect) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      globe.pauseAnimation();
      paused = true;
    }, delay);
  }

  function wake() {
    if (!inGameplay || inRegionSelect) return;
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
      .polygonStrokeColor(strokeColor)
      .polygonAltitude(polygonAltitude);
  }

  function resize() {
    const fullScreen = inGameplay || inRegionSelect;
    const w = Math.max(fullScreen ? window.innerWidth : container.clientWidth, 1);
    const h = Math.max(fullScreen ? window.innerHeight : container.clientHeight, 1);
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

  function burstSpin(duration = 650) {
    clearTimeout(burstTimer);
    controls.autoRotate = true;
    controls.autoRotateSpeed = BURST_ROTATE_SPEED;
    burstTimer = setTimeout(() => {
      controls.autoRotateSpeed = IDLE_ROTATE_SPEED;
    }, duration);
  }

  function regionPov(region) {
    if (region === "world") return REGION_SELECT_POV;
    const center = regionCentroids?.get(region);
    if (!center) return REGION_SELECT_POV;
    return {
      lat: center.lat,
      lng: center.lng,
      altitude: REGION_SELECT_POV.altitude,
    };
  }

  function flyToRegion(region, duration = REGION_HOVER_MS) {
    controls.autoRotate = false;
    globe.pointOfView(regionPov(region), duration);
  }

  function returnToRegionSelectView(duration = REGION_RETURN_MS) {
    if (!inRegionSelect) return;
    controls.autoRotate = true;
    controls.autoRotateSpeed = IDLE_ROTATE_SPEED;
    globe.pointOfView(REGION_SELECT_POV, duration);
  }

  return {
    initStartView() {
      inGameplay = false;
      inRegionSelect = false;
      clearTimeout(idleTimer);
      clearTimeout(burstTimer);
      if (paused) {
        globe.resumeAnimation();
        paused = false;
      }

      controls.autoRotate = true;
      controls.autoRotateSpeed = IDLE_ROTATE_SPEED;
      controls.enableRotate = false;
      globe.enablePointerInteraction(false);

      refreshPolygons();
      globe.pointOfView(START_POV, 0);
      hoveredRegion = null;
      cameraRegion = null;
    },

    transitionToRegionSelect(duration = VIEW_TRANSITION_MS) {
      inRegionSelect = true;
      inGameplay = false;
      regionDetailLocked = false;
      clearTimeout(idleTimer);
      if (paused) {
        globe.resumeAnimation();
        paused = false;
      }

      burstSpin(700);
      controls.autoRotate = true;
      controls.enableRotate = false;
      globe.enablePointerInteraction(false);
      globe.pointOfView(REGION_SELECT_POV, duration);
      resize();
    },

    transitionToStartView(duration = VIEW_TRANSITION_MS) {
      inRegionSelect = false;
      inGameplay = false;
      hoveredRegion = null;
      cameraRegion = null;
      regionDetailLocked = false;
      clearTimeout(idleTimer);
      clearTimeout(burstTimer);
      if (paused) {
        globe.resumeAnimation();
        paused = false;
      }

      controls.autoRotate = true;
      controls.autoRotateSpeed = IDLE_ROTATE_SPEED;
      controls.enableRotate = false;
      globe.enablePointerInteraction(false);
      globe.pointOfView(START_POV, duration);
      resize();
      refreshPolygons();
    },

    transitionToGame(duration = VIEW_TRANSITION_MS) {
      inRegionSelect = false;
      inGameplay = true;
      hoveredRegion = null;
      cameraRegion = null;
      clearTimeout(burstTimer);
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.15;

      globe.pointOfView(GAME_POV, duration);
      resize();
      refreshPolygons();

      setTimeout(() => {
        controls.autoRotate = false;
        controls.enableRotate = true;
        globe.enablePointerInteraction(true);
        resize();
        schedulePause(1200);
      }, duration);
    },

    setGuess(name, color, stroke = "#1a1a1a") {
      if (!featureByName.has(name)) return;
      guessed.set(name, { color, stroke });
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

    setHoveredRegion(region, { locked = false } = {}) {
      if (!inRegionSelect || !regionMembers) return;
      hoveredRegion = region;
      regionDetailLocked = locked;
      if (cameraRegion !== region) {
        cameraRegion = region;
        flyToRegion(region);
      }
      refreshPolygons();
    },

    clearRegionHighlight() {
      if (regionDetailLocked || !hoveredRegion) return;
      hoveredRegion = null;
      refreshPolygons();
    },

    unlockRegionDetail() {
      regionDetailLocked = false;
    },

    clearHoveredRegion({ restoreView = false } = {}) {
      hoveredRegion = null;
      cameraRegion = null;
      regionDetailLocked = false;
      refreshPolygons();
      if (restoreView && inRegionSelect) {
        returnToRegionSelectView();
      }
    },

    dispose() {
      clearTimeout(idleTimer);
      clearTimeout(burstTimer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      container.innerHTML = "";
    },
  };
}
