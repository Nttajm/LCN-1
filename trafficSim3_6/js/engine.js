 let dm = document
let startingPoint = null;
let endingPoint = null;
let isFirstPoint = null;
let segments = [];
let nodes = [];
let intersections = [];

const mapCanvas = E_ById('mapCanvas');
const ctx = mapCanvas.getContext('2d');

mapCanvas.width = window.innerWidth;
mapCanvas.height = window.innerHeight;

let gridSnap = 25;

mapCanvas.addEventListener('click', (event) => {
  const rect = mapCanvas.getBoundingClientRect();
  const snappedX = snapToGrid(event.clientX - rect.left);
  const snappedY = snapToGrid(event.clientY - rect.top);

  if (isFirstPoint === null || !isFirstPoint) {
    startingPoint = { x: snappedX, y: snappedY };
    nodes.push({ x: snappedX, y: snappedY, color: 'red' });
    isFirstPoint = true;
  } else {
    endingPoint = { x: snappedX, y: snappedY };
    nodes.push({ x: snappedX, y: snappedY, color: 'blue' });

    const segment = {
      nodeA: { x: startingPoint.x, y: startingPoint.y },
      nodeB: { x: endingPoint.x, y: endingPoint.y },
      linePoints: linePoints(startingPoint.x, startingPoint.y, endingPoint.x, endingPoint.y),
    };

    segments.push(segment);

    if (segments.length > 1) {
      for (let i = 0; i < segments.length - 1; i++) {
        const intersection = CheckSegmentIntersection(segments[i], segment);
        if (intersection) {
          MakeIntersection(segments[i], segment, intersection);
        }
      }
    }

    isFirstPoint = false;
  }

  redraw();
});

function drawSegmentRoad(x1, y1, x2, y2, style) {
    ctx.strokeStyle = 'rgba(238, 113, 41, 0.51)';
    ctx.lineWidth = 25;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

}

function parcelHasIntersection(p1, p2) {
  const margin = gridSnap / 2;
  const minX = Math.min(p1.x, p2.x) - margin;
  const maxX = Math.max(p1.x, p2.x) + margin;
  const minY = Math.min(p1.y, p2.y) - margin;
  const maxY = Math.max(p1.y, p2.y) + margin;
  for (let j = 0; j < intersections.length; j++) {
    const ip = intersections[j];
    if (ip.x >= minX && ip.x <= maxX && ip.y >= minY && ip.y <= maxY) return true;
  }
  return false;
}

function drawParcelPaths(segment) {
  const linePoints_array = segment.linePoints;
  const lineWidth = 6.25; // 25% of 25px gridSnap
  
  for (let i = 0; i < linePoints_array.length - 1; i++) {
    const p1 = linePoints_array[i];
    const p2 = linePoints_array[i + 1];

    if (parcelHasIntersection(p1, p2)) continue;
    
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    const perpX = (length > 0) ? -dy / length : 0;
    const perpY = (length > 0) ? dx / length : 0;
    
    // Right line (red)
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p1.x + perpX * lineWidth, p1.y + perpY * lineWidth);
    ctx.lineTo(p2.x + perpX * lineWidth, p2.y + perpY * lineWidth);
    ctx.stroke();
    
    // Left line (black)
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.moveTo(p1.x - perpX * lineWidth, p1.y - perpY * lineWidth);
    ctx.lineTo(p2.x - perpX * lineWidth, p2.y - perpY * lineWidth);
    ctx.stroke();
  }
}

function drawPossibleIntPaths(segment) {

}

function makeCurve(p1, p2) {
  
}

function drawNode(x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawIntersection(x, y) {
  ctx.strokeStyle = 'green';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 12.5, y - 12.5, 25, 25);
}

function redraw() {
  ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    drawSegmentRoad(seg.nodeA.x, seg.nodeA.y, seg.nodeB.x, seg.nodeB.y, 'two_lane');
    drawParcelPaths(seg);
  }

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    drawNode(n.x, n.y, n.color);
  }

  for (let i = 0; i < intersections.length; i++) {
    const inter = intersections[i];
    drawIntersection(inter.x, inter.y);
  }
}

function MakeIntersection(segA, segB, intersection) {
  intersections.push({ x: intersection.x, y: intersection.y });
}

function checkEdgeCases(segA, segB) {
    if (segA.nodeA.x === segA.nodeB.x && segA.nodeA.y === segA.nodeB.y) {
        return false;
    }
    if (segB.nodeA.x === segB.nodeB.x && segB.nodeA.y === segB.nodeB.y) {
        return false;
    }
    return true;
}

function CheckSegmentIntersection(segA, segB) {
  const x1 = segA.nodeA.x, y1 = segA.nodeA.y;
  const x2 = segA.nodeB.x, y2 = segA.nodeB.y;
  const x3 = segB.nodeA.x, y3 = segB.nodeA.y;
  const x4 = segB.nodeB.x, y4 = segB.nodeB.y;

  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return null; // Parallel lines

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: x1 + ua * (x2 - x1),
      y: y1 + ua * (y2 - y1)
    };
  }
  return null; // No intersection
}

function linePoints(x1, y1, x2, y2) {
  const points = [];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) / gridSnap;

  for (let i = 0; i <= steps; i++) {
    const x = x1 + (dx / steps) * i;
    const y = y1 + (dy / steps) * i;
    points.push({ x: snapToGrid(x), y: snapToGrid(y) });
  }
  return points;
}

function updateGridSnap() {
  const mapDiv = E_ByClass('map');
  mapDiv[0].style.backgroundSize = `${gridSnap}px ${gridSnap}px`;
}
updateGridSnap();

function snapToGrid(value) {
  return Math.round(value / gridSnap) * gridSnap;
}

function E_ById(id) {
  return dm.getElementById(id);
}

function E_Create(tag) {
  return dm.createElement(tag);
}

function E_ByClass(className) {
  return dm.getElementsByClassName(className);
}
