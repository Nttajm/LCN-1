const COLORS = ["#6aaa64", "#f0d878", "#c8f07a", "#5b6cf0", "#e08a3c", "#4aa3d9", "#fff"];

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function createCanvas() {
  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:40;";
  document.body.appendChild(canvas);
  return canvas;
}

function spawnParticle(width, height, originX) {
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
  const speed = 7 + Math.random() * 9;
  return {
    x: originX + (Math.random() - 0.5) * width * 0.15,
    y: height * 0.35 + Math.random() * height * 0.08,
    vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 4,
    vy: Math.sin(angle) * speed - Math.random() * 4,
    w: 5 + Math.random() * 5,
    h: 7 + Math.random() * 7,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.35,
    opacity: 1,
    life: 0,
    maxLife: 55 + Math.random() * 35,
  };
}

export function burstConfetti({ particleCount = 90 } = {}) {
  if (prefersReducedMotion()) return;

  const canvas = createCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  const width = window.innerWidth;
  const height = window.innerHeight;
  const particles = [];
  const origins = [width * 0.2, width * 0.5, width * 0.8];
  for (let i = 0; i < particleCount; i += 1) {
    particles.push(spawnParticle(width, height, origins[i % origins.length]));
  }

  let frame = 0;
  const tick = () => {
    frame += 1;
    ctx.clearRect(0, 0, width, height);
    let alive = 0;

    particles.forEach((p) => {
      p.life += 1;
      if (p.life > p.maxLife) return;
      alive += 1;
      p.vy += 0.22;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      p.opacity = Math.max(0, 1 - p.life / p.maxLife);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (alive > 0 && frame < 120) {
      requestAnimationFrame(tick);
      return;
    }
    canvas.remove();
  };

  requestAnimationFrame(tick);
}
