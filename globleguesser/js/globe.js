import Globe from "globe.gl";
import { haversineKm, greatCircleRing } from "./distance.js";

const IDLE_MS = 3500;
const POLYGON_ALTITUDE = 0.01;
const ISLAND_ALTITUDE = 0.013;
const START_LAND = "#7cb85c";
const START_LAND_STROKE = "#5a9a42";
const START_OCEAN = "#243d6b";
const HOVER_HIGHLIGHT = "#c8f07a";
const HOVER_HIGHLIGHT_STROKE = "#9ed456";
const HOVER_DIM = "#3a5230";
const HOVER_DIM_STROKE = "#2a3d22";
const ISLAND_STROKE = "#c5e89a";
const ISLAND_SIDE = "rgba(140, 190, 90, 0.22)";
const START_STAT_HIGHLIGHT = "#4a9eff";
const START_STAT_HIGHLIGHT_STROKE = "#2f7fd6";
const START_POV = { lat: 18, lng: 0, altitude: 1.55 };
const GAME_POV = { lat: 18, lng: 0, altitude: 2.05 };
const REGION_SELECT_POV = { lat: 12, lng: 18, altitude: 1.62 };
const US_STATES_POV = { lat: 39.5, lng: -98.35, altitude: 1.28 };
const CA_PROVINCES_POV = { lat: 56.1, lng: -96.5, altitude: 1.35 };
const US_CA_POV = { lat: 48, lng: -96, altitude: 1.55 };
const IDLE_ROTATE_SPEED = 0.35;
const BURST_ROTATE_SPEED = 2.6;
const REGION_HOVER_MS = 1000;
const REGION_RETURN_MS = 900;
const VIEW_TRANSITION_MS = 1300;

export function createGlobe(
  container,
  initialFeatures,
  initialRegionMembers = null,
  initialRegionCentroids = null
) {
  let features = initialFeatures;
  let regionMembers = initialRegionMembers;
  let regionCentroids = initialRegionCentroids;
  let featureByName = new Map(
    features.map((feat) => [feat.properties?.name || "", feat])
  );
  // Stable ids so three-globe can digest without regenerating geometry.
  features.forEach((feat, index) => {
    if (!feat.__id) feat.__id = feat.properties?.name || `country-${index}`;
  });

  const guessed = new Map();
  const startHighlight = new Set();
  let startStatMarkers = [];
  let playerMarkers = [];
  let polygonByName = new Map();
  let idleTimer = null;
  let paused = false;
  let inGameplay = false;
  let inRegionSelect = false;
  let burstTimer = null;
  let hoveredRegion = null;
  let cameraRegion = null;
  let regionDetailLocked = false;
  let radiusToolActive = false;
  let radiusDragging = false;
  let radiusCenter = null;
  let radiusKm = 0;
  let radiusLocked = null;
  let lastHover = null;
  let radiusDragHandler = null;
  let rotateBeforeDrag = true;
  let regionRefreshTimer = null;

  function getName(feat) {
    return feat.properties?.name || "";
  }

  function isIsland(feat) {
    return Number(feat?.properties?.tinyBoost) > 0;
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

    if (startHighlight.has(name)) return START_STAT_HIGHLIGHT;

    if (hoveredRegion && regionMembers) {
      return isHighlighted(name) ? HOVER_HIGHLIGHT : HOVER_DIM;
    }

    return START_LAND;
  }

  function strokeColor(feat) {
    const name = getName(feat);
    const guess = guessed.get(name);
    if (guess) return guess.stroke;

    if (startHighlight.has(name)) return START_STAT_HIGHLIGHT_STROKE;

    if (hoveredRegion && regionMembers) {
      return isHighlighted(name) ? HOVER_HIGHLIGHT_STROKE : HOVER_DIM_STROKE;
    }

    return isIsland(feat) ? ISLAND_STROKE : START_LAND_STROKE;
  }

  function sideColor(feat) {
    const name = getName(feat);
    if (guessed.has(name) || startHighlight.has(name)) return "rgba(0, 0, 0, 0)";
    return isIsland(feat) ? ISLAND_SIDE : "rgba(0, 0, 0, 0)";
  }

  function polygonAltitude(feat) {
    const name = getName(feat);
    const base = isIsland(feat) ? ISLAND_ALTITUDE : POLYGON_ALTITUDE;

    if (guessed.has(name)) return base;
    if (startHighlight.has(name)) return base * 1.55;

    if (hoveredRegion && regionMembers) {
      return isHighlighted(name) ? base * 1.55 : base * 0.45;
    }

    return base;
  }

  const w = Math.max(container.clientWidth, 1);
  const h = Math.max(container.clientHeight, 1);

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
    .backgroundColor("rgba(0, 0, 0, 0)")
    .enablePointerInteraction(false)
    .showAtmosphere(true)
    .atmosphereColor("rgb(160, 210, 255)")
    .atmosphereAltitude(0.14)
    .polygonsData(features)
    .polygonCapColor(capColor)
    .polygonSideColor(sideColor)
    .polygonStrokeColor(strokeColor)
    .polygonAltitude(polygonAltitude)
    .polygonCapCurvatureResolution(5)
    .polygonsTransitionDuration(0)
    .htmlElementsData([])
    .htmlLat((d) => d.lat)
    .htmlLng((d) => d.lng)
    .htmlAltitude((d) => 0.06)
    .htmlTransitionDuration(0)
    .pathsData([])
    .pathPoints("coords")
    .pathPointLat((p) => p[0])
    .pathPointLng((p) => p[1])
    .pathColor((d) => (d.kind === "spoke" ? "rgba(255, 236, 180, 0.85)" : "#ffe27a"))
    .pathPointAlt(0.028)
    .pathResolution(2)
    .pathTransitionDuration(0)
    .htmlElement((d) => {
      if (d.kind === "stat") {
        const wrap = document.createElement("div");
        wrap.className = "globe-stat-bubble-wrap";
        const bubble = document.createElement("div");
        bubble.className = "globe-stat-bubble";
        const label = document.createElement("span");
        label.className = "globe-stat-bubble__label";
        label.textContent = d.label || "";
        const country = document.createElement("span");
        country.className = "globe-stat-bubble__country";
        country.textContent = d.name || "";
        bubble.appendChild(label);
        bubble.appendChild(country);
        wrap.appendChild(bubble);
        return wrap;
      }

      const wrap = document.createElement("div");
      wrap.className = "globe-pfp-cluster";
      const players = Array.isArray(d.players) ? d.players : [];
      const count = Math.max(players.length, 1);
      players.forEach((player, index) => {
        const chip = document.createElement("div");
        chip.className = "globe-pfp";
        chip.style.background = player.color || "#5b6cf0";
        if (count > 1) {
          const spread = 0.72;
          const offset = (index - (count - 1) / 2) * spread;
          chip.style.marginLeft = index === 0 ? "0" : "-0.35rem";
          chip.style.position = "relative";
          chip.style.left = `${offset}rem`;
        }
        const initial = document.createElement("span");
        initial.className = "globe-pfp__initial";
        initial.textContent = (player.name || "?").charAt(0).toUpperCase();
        chip.appendChild(initial);
        chip.title = player.name || "";
        wrap.appendChild(chip);
      });
      return wrap;
    })
    .pointOfView(START_POV);

  queuePolygonIndex();

  const oceanMaterial = globe.globeMaterial();
  oceanMaterial.color.set(START_OCEAN);
  oceanMaterial.shininess = 8;
  if (oceanMaterial.specular) oceanMaterial.specular.set(0x334466);

  const renderer = globe.renderer();
  if (renderer) {
    renderer.setPixelRatio(Math.min(1, window.devicePixelRatio || 1));
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
    if (!inGameplay || inRegionSelect || radiusToolActive || radiusDragging) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      globe.pauseAnimation();
      paused = true;
    }, delay);
  }

  function wake({ armIdle = true } = {}) {
    if (!inGameplay || inRegionSelect) return;
    clearTimeout(idleTimer);
    if (paused) {
      paused = false;
      globe.resumeAnimation();
    }
    if (armIdle) schedulePause();
  }

  function refreshPolygons() {
    polygonByName.clear();
    globe.polygonsData(features);
    queuePolygonIndex();
  }

  function rebuildPolygonIndex() {
    polygonByName.clear();
    const root = typeof globe.scene === "function" ? globe.scene() : null;
    if (!root) return;
    root.traverse((obj) => {
      if (obj.__globeObjType !== "polygon") return;
      const feature = obj.__data?.data || obj.__data;
      const name = feature ? getName(feature) : "";
      if (!name || polygonByName.has(name)) return;
      polygonByName.set(name, obj);
    });
  }

  function queuePolygonIndex() {
    requestAnimationFrame(() => {
      rebuildPolygonIndex();
    });
  }

  function scheduleRegionPolygonRefresh() {
    clearTimeout(regionRefreshTimer);
    regionRefreshTimer = setTimeout(() => {
      regionRefreshTimer = null;
      refreshPolygons();
    }, 70);
  }

  function defaultLandStyle(feat) {
    const name = getName(feat);
    if (startHighlight.has(name)) {
      return {
        color: START_STAT_HIGHLIGHT,
        stroke: START_STAT_HIGHLIGHT_STROKE,
        side: "rgba(0, 0, 0, 0)",
        altitude: (isIsland(feat) ? ISLAND_ALTITUDE : POLYGON_ALTITUDE) * 1.55,
      };
    }
    if (hoveredRegion && regionMembers) {
      const on = isHighlighted(name);
      return {
        color: on ? HOVER_HIGHLIGHT : HOVER_DIM,
        stroke: on ? HOVER_HIGHLIGHT_STROKE : HOVER_DIM_STROKE,
        side: "rgba(0, 0, 0, 0)",
        altitude: isIsland(feat)
          ? (on ? ISLAND_ALTITUDE * 1.55 : ISLAND_ALTITUDE * 0.45)
          : (on ? POLYGON_ALTITUDE * 1.55 : POLYGON_ALTITUDE * 0.45),
      };
    }
    return {
      color: START_LAND,
      stroke: isIsland(feat) ? ISLAND_STROKE : START_LAND_STROKE,
      side: isIsland(feat) ? ISLAND_SIDE : "rgba(0, 0, 0, 0)",
      altitude: isIsland(feat) ? ISLAND_ALTITUDE : POLYGON_ALTITUDE,
    };
  }

  function styleForFeature(feat) {
    const name = getName(feat);
    const guess = guessed.get(name);
    if (guess) {
      return {
        color: guess.color,
        stroke: guess.stroke,
        side: "rgba(0, 0, 0, 0)",
        altitude: isIsland(feat) ? ISLAND_ALTITUDE : POLYGON_ALTITUDE,
      };
    }
    return defaultLandStyle(feat);
  }

  function applyStyleToPolygonGroup(obj, style) {
    const conicObj = obj.children?.[0];
    const strokeObj = obj.children?.[1];
    if (!conicObj?.material) return;

    const materials = Array.isArray(conicObj.material)
      ? conicObj.material
      : [conicObj.material];

    // Cap is usually last material when sides exist; otherwise the only one.
    const capMaterial = materials[materials.length - 1];
    if (capMaterial?.color && style.color) {
      capMaterial.color.set(style.color);
      const opacity = 1;
      capMaterial.transparent = opacity < 1;
      capMaterial.opacity = opacity;
    }

    if (materials.length > 1 && materials[0]?.color) {
      if (style.side && style.side !== "rgba(0, 0, 0, 0)") {
        materials[0].color.set(style.side);
        materials[0].transparent = true;
        materials[0].opacity = 0.22;
      } else {
        materials[0].opacity = 0;
        materials[0].transparent = true;
      }
    }

    if (strokeObj) {
      if (style.stroke) {
        strokeObj.visible = true;
        if (strokeObj.material?.color) strokeObj.material.color.set(style.stroke);
      } else {
        strokeObj.visible = false;
      }
    }

    // Do not touch mesh scale here — three-globe owns altitude via polygonAltitude.
    // Manual scaling fought camera/CSS2D updates and could NaN the orbit distance.
  }

  function paintCountry(name) {
    const feat = featureByName.get(name);
    if (!feat) return;
    const style = styleForFeature(feat);
    let obj = polygonByName.get(name);
    if (!obj || obj.__globeObjType !== "polygon") {
      rebuildPolygonIndex();
      obj = polygonByName.get(name);
    }
    if (obj) {
      applyStyleToPolygonGroup(obj, style);
      return;
    }
    refreshPolygons();
  }

  function paintCountries(names) {
    const wanted = [...new Set(names)].filter(Boolean);
    if (!wanted.length) return;
    if (polygonByName.size < Math.min(32, features.length)) {
      rebuildPolygonIndex();
    }
    let missing = 0;
    for (const name of wanted) {
      const feat = featureByName.get(name);
      if (!feat) continue;
      const obj = polygonByName.get(name);
      if (!obj) {
        missing += 1;
        continue;
      }
      applyStyleToPolygonGroup(obj, styleForFeature(feat));
    }
    if (missing) refreshPolygons();
  }

  let lastW = 0;
  let lastH = 0;
  let resizeRaf = 0;

  function applyResize() {
    resizeRaf = 0;
    const fullScreen = inGameplay || inRegionSelect;
    const nextW = Math.round(Math.max(fullScreen ? window.innerWidth : container.clientWidth, 1));
    const nextH = Math.round(Math.max(fullScreen ? window.innerHeight : container.clientHeight, 1));
    if (nextW === lastW && nextH === lastH) return;
    lastW = nextW;
    lastH = nextH;
    globe.width(nextW).height(nextH);
  }

  function resize() {
    if (!resizeRaf) resizeRaf = requestAnimationFrame(applyResize);
  }

  resize();

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  if (container.parentElement) resizeObserver.observe(container.parentElement);
  window.addEventListener("resize", resize);

  container.addEventListener("pointerdown", () => wake({ armIdle: false }), true);
  container.addEventListener("wheel", () => wake({ armIdle: true }), { passive: true, capture: true });
  controls.addEventListener("start", () => wake({ armIdle: false }));
  controls.addEventListener("change", () => {
    if (paused) wake({ armIdle: false });
  });
  controls.addEventListener("end", () => schedulePause(IDLE_MS));

  function burstSpin(duration = 650) {
    clearTimeout(burstTimer);
    controls.autoRotate = true;
    controls.autoRotateSpeed = BURST_ROTATE_SPEED;
    burstTimer = setTimeout(() => {
      controls.autoRotateSpeed = IDLE_ROTATE_SPEED;
    }, duration);
  }

  function rebuildFeatureIndex(nextFeatures) {
    features = nextFeatures || [];
    featureByName = new Map(
      features.map((feat) => [feat.properties?.name || "", feat])
    );
    features.forEach((feat, index) => {
      if (!feat.__id) feat.__id = feat.properties?.name || `unit-${index}`;
    });
  }

function regionPov(region) {
    if (region === "world") return REGION_SELECT_POV;
    if (region === "us-states" || region === "provinces") {
      const center = regionCentroids?.get("us-states");
      return {
        lat: center?.lat ?? US_STATES_POV.lat,
        lng: center?.lng ?? US_STATES_POV.lng,
        altitude: US_STATES_POV.altitude,
      };
    }
    if (region === "ca-provinces") {
      const center = regionCentroids?.get("ca-provinces");
      return {
        lat: center?.lat ?? CA_PROVINCES_POV.lat,
        lng: center?.lng ?? CA_PROVINCES_POV.lng,
        altitude: CA_PROVINCES_POV.altitude,
      };
    }
    if (region === "us-ca") {
      const center = regionCentroids?.get("us-ca");
      return {
        lat: center?.lat ?? US_CA_POV.lat,
        lng: center?.lng ?? US_CA_POV.lng,
        altitude: US_CA_POV.altitude,
      };
    }
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

  function emitRadiusDrag() {
    if (!radiusDragHandler) return;
    const circle = radiusDragging
      ? radiusCenter
        ? { center: radiusCenter, radiusKm, dragging: true }
        : null
      : radiusLocked
        ? { ...radiusLocked, dragging: false }
        : null;
    radiusDragHandler(circle);
  }

  function refreshRadiusPaths() {
    const circle = radiusDragging
      ? radiusCenter
        ? { center: radiusCenter, radiusKm }
        : null
      : radiusLocked;
    if (!circle || !(circle.radiusKm > 0)) {
      globe.pathsData([]);
      return;
    }
    const ring = greatCircleRing(circle.center, circle.radiusKm, 80);
    const paths = [
      {
        kind: "ring",
        coords: ring.map((p) => [p.lat, p.lng]),
      },
    ];
    const tip = radiusDragging ? lastHover : null;
    if (tip && circle.center) {
      paths.push({
        kind: "spoke",
        coords: [
          [circle.center.lat, circle.center.lng],
          [tip.lat, tip.lng],
        ],
      });
    }
    globe.pathsData(paths);
  }

  function clearRadiusCircle(emit = true) {
    if (radiusDragging) {
      radiusDragging = false;
      controls.enableRotate = rotateBeforeDrag;
      window.removeEventListener("pointermove", onRadiusPointerMove);
      window.removeEventListener("pointerup", endRadiusDrag);
      window.removeEventListener("pointercancel", endRadiusDrag);
    }
    radiusCenter = null;
    radiusKm = 0;
    radiusLocked = null;
    lastHover = null;
    globe.pathsData([]);
    if (emit) emitRadiusDrag();
  }

  function geoFromPointer(event) {
    const renderer = globe.renderer();
    const el = renderer?.domElement || container;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;

    if (typeof globe.toGlobeCoords === "function") {
      const hit = globe.toGlobeCoords(px, py);
      if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lng)) {
        return { lat: hit.lat, lng: hit.lng };
      }
    }

    const cam = globe.camera();
    if (!cam) return null;
    const Vector3 = cam.position.constructor;
    const ndcX = (px / rect.width) * 2 - 1;
    const ndcY = -(py / rect.height) * 2 + 1;
    const origin = new Vector3();
    if (typeof cam.getWorldPosition === "function") {
      cam.getWorldPosition(origin);
    } else {
      origin.copy(cam.position);
    }
    const world = new Vector3(ndcX, ndcY, 0.5).unproject(cam);
    const dir = world.sub(origin).normalize();
    const radius = typeof globe.getGlobeRadius === "function" ? globe.getGlobeRadius() : 100;
    const a = dir.dot(dir);
    const b = 2 * origin.dot(dir);
    const c = origin.dot(origin) - radius * radius;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const sqrtDisc = Math.sqrt(disc);
    let t = (-b - sqrtDisc) / (2 * a);
    if (t < 0) t = (-b + sqrtDisc) / (2 * a);
    if (t < 0) return null;
    const hit = origin.add(dir.multiplyScalar(t));
    const geo = globe.toGeoCoords({ x: hit.x, y: hit.y, z: hit.z });
    if (!geo || !Number.isFinite(geo.lat) || !Number.isFinite(geo.lng)) return null;
    return { lat: geo.lat, lng: geo.lng };
  }

  function applyRadiusFromCoords(coords) {
    if (!radiusDragging || !radiusCenter || !coords) return;
    lastHover = coords;
    radiusKm = haversineKm(radiusCenter, coords);
    refreshRadiusPaths();
    emitRadiusDrag();
    wake();
  }

  function onRadiusPointerMove(event) {
    if (!radiusDragging) return;
    event.preventDefault();
    const coords = geoFromPointer(event);
    if (coords) applyRadiusFromCoords(coords);
  }

  function endRadiusDrag() {
    if (!radiusDragging) return;
    radiusDragging = false;
    controls.enableRotate = rotateBeforeDrag;
    if (radiusKm > 0 && radiusCenter) {
      radiusLocked = { center: radiusCenter, radiusKm };
    } else {
      radiusLocked = null;
      radiusCenter = null;
      radiusKm = 0;
    }
    refreshRadiusPaths();
    emitRadiusDrag();
    window.removeEventListener("pointermove", onRadiusPointerMove);
    window.removeEventListener("pointerup", endRadiusDrag);
    window.removeEventListener("pointercancel", endRadiusDrag);
  }

  container.addEventListener("pointerdown", (event) => {
    if (!radiusToolActive || !inGameplay || event.button !== 0) return;
    const coords = geoFromPointer(event) || lastHover;
    if (!coords) return;
    event.preventDefault();
    event.stopPropagation();
    rotateBeforeDrag = controls.enableRotate;
    controls.enableRotate = false;
    radiusDragging = true;
    lastHover = coords;
    radiusCenter = { lat: coords.lat, lng: coords.lng };
    radiusKm = 0;
    radiusLocked = null;
    refreshRadiusPaths();
    emitRadiusDrag();
    wake();
    window.addEventListener("pointermove", onRadiusPointerMove, { passive: false });
    window.addEventListener("pointerup", endRadiusDrag);
    window.addEventListener("pointercancel", endRadiusDrag);
  }, true);

  function returnToRegionSelectView(duration = REGION_RETURN_MS) {
    if (!inRegionSelect) return;
    controls.autoRotate = true;
    controls.autoRotateSpeed = IDLE_ROTATE_SPEED;
    globe.pointOfView(REGION_SELECT_POV, duration);
  }

  function clearStartStatsInternal({ refresh = true } = {}) {
    const hadHighlight = startHighlight.size > 0;
    startHighlight.clear();
    startStatMarkers = [];
    if (playerMarkers.length === 0) {
      globe.htmlElementsData([]);
    }
    if (refresh && hadHighlight) refreshPolygons();
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
      radiusToolActive = false;
      container.classList.remove("globe-stage__viz--radius");
      clearRadiusCircle(false);

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

      clearStartStatsInternal();
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
      radiusToolActive = false;
      container.classList.remove("globe-stage__viz--radius");
      clearRadiusCircle(false);
      globe.pointOfView(START_POV, duration);
      resize();
      refreshPolygons();
    },

    transitionToGame(duration = VIEW_TRANSITION_MS, options = {}) {
      const region = options.region || "world";
      const isAdminPack =
        region === "us-states" ||
        region === "ca-provinces" ||
        region === "us-ca";
      let pov = options.pov;
      if (!pov) {
        if (region === "us-states") {
          pov = US_STATES_POV;
        } else if (region === "ca-provinces") {
          pov = CA_PROVINCES_POV;
        } else if (region === "us-ca") {
          pov = US_CA_POV;
        } else if (region !== "world") {
          const center = regionCentroids?.get(region);
          pov = center
            ? {
                lat: center.lat,
                lng: center.lng,
                altitude: GAME_POV.altitude,
              }
            : GAME_POV;
        } else {
          pov = GAME_POV;
        }
      }

      inRegionSelect = false;
      inGameplay = true;
      hoveredRegion = isAdminPack ? region : null;
      cameraRegion = isAdminPack ? region : region !== "world" ? region : null;
      regionDetailLocked = isAdminPack;
      clearTimeout(burstTimer);
      clearStartStatsInternal({ refresh: false });
      playerMarkers = [];
      globe.htmlElementsData([]);
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.15;

      const safePov = {
        lat: Number.isFinite(pov.lat) ? pov.lat : GAME_POV.lat,
        lng: Number.isFinite(pov.lng) ? pov.lng : GAME_POV.lng,
        altitude: Number.isFinite(pov.altitude) ? pov.altitude : GAME_POV.altitude,
      };
      globe.pointOfView(safePov, duration);
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
      wake({ armIdle: false });
      guessed.set(name, { color, stroke });
      paintCountry(name);
      schedulePause();
    },

    setGuesses(entries) {
      const previous = [...guessed.keys()];
      guessed.clear();
      (entries || []).forEach((entry) => {
        if (!entry?.name || !featureByName.has(entry.name)) return;
        guessed.set(entry.name, {
          color: entry.color,
          stroke: entry.stroke || "#1a1a1a",
        });
      });
      wake({ armIdle: false });
      paintCountries([...previous, ...guessed.keys()]);
      schedulePause();
    },

    clearGuesses() {
      const names = [...guessed.keys()];
      guessed.clear();
      if (names.length) {
        paintCountries(names);
      }
      wake({ armIdle: false });
      schedulePause();
    },

    setGeography({
      features: nextFeatures,
      regionMembers: nextMembers = null,
      regionCentroids: nextCentroids = null,
    } = {}) {
      guessed.clear();
      playerMarkers = [];
      startHighlight.clear();
      startStatMarkers = [];
      globe.htmlElementsData([]);
      regionMembers = nextMembers;
      regionCentroids = nextCentroids;
      hoveredRegion = null;
      cameraRegion = null;
      regionDetailLocked = false;
      rebuildFeatureIndex(nextFeatures);
      polygonByName.clear();
      globe.polygonsData(features);
      queuePolygonIndex();
    },

    setRadiusToolActive(active) {
      radiusToolActive = Boolean(active) && inGameplay;
      container.classList.toggle("globe-stage__viz--radius", radiusToolActive);
      if (radiusToolActive) {
        controls.enableRotate = false;
      } else {
        if (radiusDragging) endRadiusDrag();
        clearRadiusCircle();
        if (inGameplay) controls.enableRotate = true;
      }
    },

    setRadiusCircle(circle) {
      if (radiusDragging) endRadiusDrag();
      if (!circle || !circle.center || !(circle.radiusKm > 0)) {
        clearRadiusCircle();
        return;
      }
      radiusLocked = {
        center: { lat: circle.center.lat, lng: circle.center.lng },
        radiusKm: circle.radiusKm,
      };
      radiusCenter = radiusLocked.center;
      radiusKm = radiusLocked.radiusKm;
      refreshRadiusPaths();
      emitRadiusDrag();
      wake();
    },

    onRadiusDrag(handler) {
      radiusDragHandler = typeof handler === "function" ? handler : null;
    },

    setStartStats(items) {
      startHighlight.clear();
      startStatMarkers = [];
      (items || []).forEach((item) => {
        if (!item?.name || !featureByName.has(item.name)) return;
        startHighlight.add(item.name);
        startStatMarkers.push({
          kind: "stat",
          name: item.name,
          label: item.label || "",
          lat: item.lat,
          lng: item.lng,
        });
      });
      playerMarkers = [];
      globe.htmlElementsData(startStatMarkers);
      refreshPolygons();
    },

    clearStartStats() {
      clearStartStatsInternal();
    },

    setPlayerMarkers(groups) {
      const hadStart = startHighlight.size > 0;
      clearStartStatsInternal({ refresh: false });
      playerMarkers = Array.isArray(groups) ? groups : [];
      globe.htmlElementsData(playerMarkers);
      if (hadStart) refreshPolygons();
      wake();
    },

    clearPlayerMarkers() {
      playerMarkers = [];
      globe.htmlElementsData([]);
    },

    flyTo(lat, lng, altitude = 1.8) {
      const nextLat = Number(lat);
      const nextLng = Number(lng);
      const nextAlt = Number(altitude);
      if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng) || !Number.isFinite(nextAlt)) {
        return;
      }
      wake({ armIdle: false });
      globe.pointOfView({ lat: nextLat, lng: nextLng, altitude: nextAlt }, 800);
      schedulePause(Math.max(IDLE_MS, 1600));
    },

    setHoveredRegion(region, { locked = false } = {}) {
      if (!regionMembers) return;
      if (!inRegionSelect && !inGameplay) return;
      hoveredRegion = region;
      regionDetailLocked = locked;
      if (inRegionSelect && cameraRegion !== region) {
        cameraRegion = region;
        flyToRegion(region);
      }
      scheduleRegionPolygonRefresh();
    },

    clearRegionHighlight() {
      if (regionDetailLocked || !hoveredRegion) return;
      hoveredRegion = null;
      scheduleRegionPolygonRefresh();
    },

    unlockRegionDetail() {
      regionDetailLocked = false;
    },

    clearHoveredRegion({ restoreView = false } = {}) {
      hoveredRegion = null;
      cameraRegion = null;
      regionDetailLocked = false;
      clearTimeout(regionRefreshTimer);
      regionRefreshTimer = null;
      refreshPolygons();
      if (restoreView && inRegionSelect) {
        returnToRegionSelectView();
      }
    },

    dispose() {
      clearTimeout(idleTimer);
      clearTimeout(burstTimer);
      clearTimeout(regionRefreshTimer);
      if (resizeRaf) {
        cancelAnimationFrame(resizeRaf);
        resizeRaf = 0;
      }
      window.removeEventListener("pointermove", onRadiusPointerMove);
      window.removeEventListener("pointerup", endRadiusDrag);
      window.removeEventListener("pointercancel", endRadiusDrag);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      container.innerHTML = "";
    },
  };
}
