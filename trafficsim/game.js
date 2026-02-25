// Traffic Simulator Game - Enhanced with Junctions and One-Way Roads
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const straightBtn = document.getElementById('straightBtn');
const curveBtn = document.getElementById('curveBtn');
const freeDrawBtn = document.getElementById('freeDrawBtn');
const eraseBtn = document.getElementById('eraseBtn');
const clearBtn = document.getElementById('clearBtn');
const roadWidthSlider = document.getElementById('roadWidth');
const roadWidthValue = document.getElementById('roadWidthValue');
const laneCountSelect = document.getElementById('laneCount');
const spawnRateSlider = document.getElementById('spawnRate');
const spawnRateValue = document.getElementById('spawnRateValue');
const carSpeedSlider = document.getElementById('carSpeed');
const carSpeedValue = document.getElementById('carSpeedValue');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const carCountDisplay = document.getElementById('carCount');
const spawnCountDisplay = document.getElementById('spawnCount');
const oneWayCheckbox = document.getElementById('oneWayCheckbox');

// Game State
let currentTool = 'straight';
let isDrawing = false;
let drawStartPoint = null;
let drawEndPoint = null;
let drawControlPoint = null;
let currentRoadPath = [];
let roads = [];
let cars = [];
let junctions = [];
let isSimulationRunning = false;
let lastSpawnTime = 0;

// Snapping
const SNAP_DISTANCE = 30;
let hoveredEndpoint = null;
let startSnapPoint = null;

// Settings
let roadWidth = 80;
let laneCount = 4;
let spawnRate = 2000;
let carSpeed = 3;
let isOneWay = false;

// Grass texture pattern
let grassPattern = null;

// Utility function to find intersection of two line segments
function getLineIntersection(p1, p2, p3, p4) {
    const d1 = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (Math.abs(d1) < 1e-10) return null; // Lines are parallel
    
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d1;
    const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d1;
    
    if (t >= 0.1 && t <= 0.9 && u >= 0.1 && u <= 0.9) {
        return {
            x: p1.x + t * (p2.x - p1.x),
            y: p1.y + t * (p2.y - p1.y),
            t1: t,
            t2: u
        };
    }
    return null;
}

// Junction class
class Junction {
    constructor(position, isIntersection = false) {
        this.position = { ...position };
        this.connections = [];
        this.isIntersection = isIntersection;
        this.trafficLightState = 'green'; // green, yellow, red
        this.trafficLightTimer = 0;
        this.trafficLightCycle = 3000; // 3 seconds per state
        this.currentDirection = 0; // 0 for main roads, 1 for cross roads
    }
    
    addConnection(road, isStart) {
        const incomingDir = isStart ? 1 : -1;
        this.connections.push({ road, isStart, incomingDir });
    }
    
    updateTrafficLight(dt) {
        if (!this.isIntersection || this.connections.length < 3) return;
        
        this.trafficLightTimer += dt * 1000;
        if (this.trafficLightTimer >= this.trafficLightCycle) {
            this.trafficLightTimer = 0;
            if (this.trafficLightState === 'green') {
                this.trafficLightState = 'yellow';
            } else if (this.trafficLightState === 'yellow') {
                this.trafficLightState = 'red';
                this.currentDirection = 1 - this.currentDirection;
            } else {
                this.trafficLightState = 'green';
            }
        }
    }
    
    canCarPass(fromRoad, carDirection) {
        if (!this.isIntersection || this.connections.length < 3) return true;
        
        const roadIndex = this.connections.findIndex(conn => conn.road === fromRoad);
        if (roadIndex === -1) return true;
        
        const roadGroup = Math.floor(roadIndex / 2);
        return this.trafficLightState === 'green' && roadGroup === this.currentDirection;
    }

    getOutgoingRoads(fromRoad, carDirection, carLane) {
        const outgoing = [];
        for (const conn of this.connections) {
            if (conn.road === fromRoad) continue;
            
            // Determine if car should turn based on lane
            const shouldTurn = this.shouldCarTurn(fromRoad, conn.road, carLane);
            
            if (conn.road.isOneWay) {
                if (conn.isStart && shouldTurn) {
                    outgoing.push({ road: conn.road, direction: 1, isStart: true });
                }
            } else {
                if (shouldTurn) {
                    if (conn.isStart) {
                        outgoing.push({ road: conn.road, direction: 1, isStart: true });
                    } else {
                        outgoing.push({ road: conn.road, direction: -1, isStart: false });
                    }
                }
            }
        }
        return outgoing;
    }
    
    shouldCarTurn(fromRoad, toRoad, carLane) {
        if (!fromRoad || fromRoad.lanes < 4) return Math.random() < 0.5;
        
        const isLeftLane = carLane < fromRoad.lanes / 2;
        if (isLeftLane) {
            // Left lanes: 70% chance to turn, 30% to go straight
            return Math.random() < 0.7;
        } else {
            // Right lanes: 30% chance to turn, 70% to go straight
            return Math.random() < 0.3;
        }
    }
    
    draw(ctx) {
        ctx.save();
        
        // Draw intersection base
        if (this.isIntersection && this.connections.length >= 3) {
            ctx.fillStyle = 'rgba(40, 40, 40, 0.9)';
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, 25, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw zebra crosswalks
            this.drawZebraCrosswalks(ctx);
            
            // Draw traffic light
            this.drawTrafficLight(ctx);
        } else {
            // Regular junction
            ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    drawZebraCrosswalks(ctx) {
        for (let i = 0; i < this.connections.length; i++) {
            const conn = this.connections[i];
            const road = conn.road;
            let angle;
            
            if (conn.isStart) {
                angle = Math.atan2(road.points[1].y - road.points[0].y, road.points[1].x - road.points[0].x);
            } else {
                const lastIdx = road.points.length - 1;
                angle = Math.atan2(road.points[lastIdx].y - road.points[lastIdx-1].y, road.points[lastIdx].x - road.points[lastIdx-1].x);
            }
            
            // Draw zebra stripes perpendicular to road
            const perpAngle = angle + Math.PI / 2;
            const stripeWidth = road.width / 2;
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            
            for (let j = -3; j <= 3; j++) {
                if (j % 2 === 0) continue; // Only draw every other stripe
                const offsetX = Math.cos(perpAngle) * j * 3;
                const offsetY = Math.sin(perpAngle) * j * 3;
                
                const startX = this.position.x + offsetX - Math.cos(angle) * stripeWidth;
                const startY = this.position.y + offsetY - Math.sin(angle) * stripeWidth;
                const endX = this.position.x + offsetX + Math.cos(angle) * stripeWidth;
                const endY = this.position.y + offsetY + Math.sin(angle) * stripeWidth;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
    }
    
    drawTrafficLight(ctx) {
        if (this.connections.length < 3) return;
        
        // Draw traffic light pole
        ctx.fillStyle = '#333';
        ctx.fillRect(this.position.x + 20, this.position.y - 35, 4, 25);
        
        // Draw traffic light box
        ctx.fillStyle = '#222';
        ctx.fillRect(this.position.x + 15, this.position.y - 40, 14, 20);
        
        // Draw light based on current state
        const lightColors = {
            'red': '#ff3333',
            'yellow': '#ffcc00',
            'green': '#33ff33'
        };
        
        ctx.fillStyle = lightColors[this.trafficLightState] || '#333';
        ctx.beginPath();
        ctx.arc(this.position.x + 22, this.position.y - 30, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow effect
        ctx.shadowColor = lightColors[this.trafficLightState];
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.position.x + 22, this.position.y - 30, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function getRoadEndpoints() {
    const endpoints = [];
    for (const road of roads) {
        endpoints.push({ point: road.points[0], road, isStart: true, junction: road.startJunction });
        endpoints.push({ point: road.points[road.points.length - 1], road, isStart: false, junction: road.endJunction });
    }
    return endpoints;
}

function findSnapPoint(x, y, excludeRoad = null) {
    const endpoints = getRoadEndpoints();
    let nearest = null;
    let minDist = SNAP_DISTANCE;
    
    for (const ep of endpoints) {
        if (excludeRoad && ep.road === excludeRoad) continue;
        const dx = ep.point.x - x;
        const dy = ep.point.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
            minDist = dist;
            nearest = ep;
        }
    }
    return nearest;
}

function findRoadIntersections(newRoad) {
    const intersections = [];
    
    for (const existingRoad of roads) {
        if (existingRoad === newRoad) continue;
        
        // Check each segment of the new road against each segment of existing roads
        for (let i = 0; i < newRoad.points.length - 1; i++) {
            for (let j = 0; j < existingRoad.points.length - 1; j++) {
                const intersection = getLineIntersection(
                    newRoad.points[i], newRoad.points[i + 1],
                    existingRoad.points[j], existingRoad.points[j + 1]
                );
                
                if (intersection) {
                    intersections.push({
                        point: intersection,
                        newRoadSegment: i,
                        existingRoad: existingRoad,
                        existingRoadSegment: j,
                        t1: intersection.t1,
                        t2: intersection.t2
                    });
                }
            }
        }
    }
    
    return intersections;
}

function splitRoadAtIntersections(road, intersections) {
    if (intersections.length === 0) return [road];
    
    // Sort intersections by position along the road
    intersections.sort((a, b) => {
        const aPos = a.newRoadSegment + a.t1;
        const bPos = b.newRoadSegment + b.t1;
        return aPos - bPos;
    });
    
    const segments = [];
    let currentPoints = [];
    let pointIndex = 0;
    
    for (const intersection of intersections) {
        // Add points up to intersection
        while (pointIndex <= intersection.newRoadSegment) {
            currentPoints.push(road.points[pointIndex]);
            pointIndex++;
        }
        
        // Add intersection point
        currentPoints.push(intersection.point);
        
        // Create segment if we have enough points
        if (currentPoints.length > 1) {
            const segment = new Road(currentPoints, road.width, road.lanes, road.isOneWay);
            segments.push(segment);
        }
        
        // Start new segment from intersection
        currentPoints = [intersection.point];
        pointIndex--; // Back up to include the next point
    }
    
    // Add remaining points
    while (pointIndex < road.points.length) {
        currentPoints.push(road.points[pointIndex]);
        pointIndex++;
    }
    
    // Create final segment
    if (currentPoints.length > 1) {
        const segment = new Road(currentPoints, road.width, road.lanes, road.isOneWay);
        segments.push(segment);
    }
    
    return segments;
}

function findOrCreateJunction(position, isIntersection = false) {
    for (const junction of junctions) {
        const dx = junction.position.x - position.x;
        const dy = junction.position.y - position.y;
        if (Math.sqrt(dx * dx + dy * dy) < 5) return junction;
    }
    const junction = new Junction(position, isIntersection);
    junctions.push(junction);
    return junction;
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    createGrassPattern();
    draw();
}

function createGrassPattern() {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 50;
    patternCanvas.height = 50;
    const patternCtx = patternCanvas.getContext('2d');
    patternCtx.fillStyle = '#2d5a27';
    patternCtx.fillRect(0, 0, 50, 50);
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * 50;
        const y = Math.random() * 50;
        patternCtx.fillStyle = Math.random() > 0.5 ? '#3a6b35' : '#255a1f';
        patternCtx.fillRect(x, y, 2, 2);
    }
    grassPattern = ctx.createPattern(patternCanvas, 'repeat');
}

function generateBezierPoints(start, control, end, segments = 30) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        points.push({
            x: (1-t)*(1-t)*start.x + 2*(1-t)*t*control.x + t*t*end.x,
            y: (1-t)*(1-t)*start.y + 2*(1-t)*t*control.y + t*t*end.y
        });
    }
    return points;
}

function generateStraightPoints(start, end, segments = 10) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        points.push({ x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t });
    }
    return points;
}

class Road {
    constructor(points, width, lanes, oneWay = false) {
        this.points = points;
        this.width = width;
        this.lanes = oneWay ? 1 : lanes;
        this.isOneWay = oneWay;
        this.laneWidth = width / this.lanes;
        this.startJunction = null;
        this.endJunction = null;
        this.calculateLength();
    }
    
    calculateLength() {
        this.length = 0;
        this.segmentLengths = [];
        for (let i = 1; i < this.points.length; i++) {
            const dx = this.points[i].x - this.points[i-1].x;
            const dy = this.points[i].y - this.points[i-1].y;
            const segLength = Math.sqrt(dx*dx + dy*dy);
            this.segmentLengths.push(segLength);
            this.length += segLength;
        }
    }
    
    getPointAtDistance(distance) {
        if (distance <= 0) return { ...this.points[0], angle: this.getAngleAt(0) };
        if (distance >= this.length) return { ...this.points[this.points.length - 1], angle: this.getAngleAt(this.length) };
        let accumulated = 0;
        for (let i = 0; i < this.segmentLengths.length; i++) {
            if (accumulated + this.segmentLengths[i] >= distance) {
                const t = (distance - accumulated) / this.segmentLengths[i];
                return {
                    x: this.points[i].x + t * (this.points[i+1].x - this.points[i].x),
                    y: this.points[i].y + t * (this.points[i+1].y - this.points[i].y),
                    angle: Math.atan2(this.points[i+1].y - this.points[i].y, this.points[i+1].x - this.points[i].x)
                };
            }
            accumulated += this.segmentLengths[i];
        }
        return { ...this.points[this.points.length - 1], angle: 0 };
    }
    
    getAngleAt(distance) {
        let accumulated = 0;
        for (let i = 0; i < this.segmentLengths.length; i++) {
            if (accumulated + this.segmentLengths[i] >= distance || i === this.segmentLengths.length - 1) {
                return Math.atan2(this.points[i+1].y - this.points[i].y, this.points[i+1].x - this.points[i].x);
            }
            accumulated += this.segmentLengths[i];
        }
        return 0;
    }
    
    getLaneOffset(laneIndex) {
        if (this.isOneWay) return 0;
        const centerOffset = (this.lanes / 2 - 0.5) * this.laneWidth;
        return laneIndex * this.laneWidth - centerOffset;
    }
    
    getLanesForDirection(direction) {
        if (this.isOneWay) return [0];
        const halfLanes = this.lanes / 2;
        if (direction === 1) return Array.from({length: halfLanes}, (_, i) => i);
        return Array.from({length: halfLanes}, (_, i) => halfLanes + i);
    }
    
    draw(ctx) {
        if (this.points.length < 2) return;
        ctx.save();
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) ctx.lineTo(this.points[i].x, this.points[i].y);
        ctx.stroke();
        
        ctx.lineWidth = this.width - 4;
        ctx.strokeStyle = '#444';
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) ctx.lineTo(this.points[i].x, this.points[i].y);
        ctx.stroke();
        
        this.drawLaneMarkings(ctx);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        this.drawParallelLine(ctx, -this.width / 2 + 2);
        this.drawParallelLine(ctx, this.width / 2 - 2);
        if (this.isOneWay) this.drawDirectionArrows(ctx);
        ctx.restore();
    }
    
    drawParallelLine(ctx, offset) {
        ctx.beginPath();
        for (let i = 0; i < this.points.length; i++) {
            const angle = i < this.points.length - 1 
                ? Math.atan2(this.points[i+1].y - this.points[i].y, this.points[i+1].x - this.points[i].x)
                : Math.atan2(this.points[i].y - this.points[i-1].y, this.points[i].x - this.points[i-1].x);
            const perpAngle = angle + Math.PI / 2;
            const x = this.points[i].x + Math.cos(perpAngle) * offset;
            const y = this.points[i].y + Math.sin(perpAngle) * offset;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    drawLaneMarkings(ctx) {
        if (this.isOneWay) return;
        const halfLanes = this.lanes / 2;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffcc00';
        ctx.setLineDash([]);
        this.drawParallelLine(ctx, 0);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([20, 15]);
        for (let i = 1; i < halfLanes; i++) {
            this.drawParallelLine(ctx, i * this.laneWidth);
            this.drawParallelLine(ctx, -i * this.laneWidth);
        }
        ctx.setLineDash([]);
    }
    
    drawDirectionArrows(ctx) {
        const arrowSpacing = 80;
        const numArrows = Math.floor(this.length / arrowSpacing);
        ctx.fillStyle = '#fff';
        for (let i = 1; i <= numArrows; i++) {
            const pos = this.getPointAtDistance(i * arrowSpacing - arrowSpacing / 2);
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(pos.angle);
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(-5, -6);
            ctx.lineTo(-5, 6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }
}

class Car {
    constructor(road, lane, direction) {
        this.road = road;
        this.lane = lane;
        this.direction = direction;
        this.distance = direction === 1 ? 0 : road.length;
        this.speed = carSpeed * (0.8 + Math.random() * 0.4);
        this.targetLane = lane;
        this.laneChangeProgress = 0;
        this.width = 25;
        this.height = 15;
        this.color = this.getRandomColor();
        this.removed = false;
        this.transferCooldown = 0;
    }
    
    getRandomColor() {
        const colors = ['#e74c3c', '#3498db', '#9b59b6', '#1abc9c', '#f39c12', '#e91e63', '#00bcd4', '#ff5722', '#8e44ad', '#27ae60'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    update(dt, allCars) {
        this.transferCooldown -= dt;
        this.checkForCollision(allCars);
        if (this.lane !== this.targetLane) {
            this.laneChangeProgress += dt * 3;
            if (this.laneChangeProgress >= 1) {
                this.lane = this.targetLane;
                this.laneChangeProgress = 0;
            }
        }
        this.distance += this.speed * this.direction;
        const nearEnd = this.direction === 1 ? this.distance >= this.road.length - 20 : this.distance <= 20;
        if (nearEnd && this.transferCooldown <= 0) {
            if (!this.tryTransferToConnectedRoad()) {
                if ((this.direction === 1 && this.distance >= this.road.length) || (this.direction === -1 && this.distance <= 0)) {
                    this.removed = true;
                }
            }
        }
    }
    
    tryTransferToConnectedRoad() {
        const junction = this.direction === 1 ? this.road.endJunction : this.road.startJunction;
        if (!junction) return false;
        
        // Check traffic light permission
        if (!junction.canCarPass(this.road, this.direction)) {
            this.speed = 0; // Stop at red light
            return false;
        }
        
        const outgoing = junction.getOutgoingRoads(this.road, this.direction, this.lane);
        if (outgoing.length === 0) return false;
        
        const target = outgoing[Math.floor(Math.random() * outgoing.length)];
        this.road = target.road;
        this.direction = target.direction;
        this.distance = target.isStart ? 0 : target.road.length;
        const validLanes = target.road.getLanesForDirection(this.direction);
        this.lane = validLanes[Math.floor(Math.random() * validLanes.length)];
        this.targetLane = this.lane;
        this.transferCooldown = 0.5;
        return true;
    }
    
    checkForCollision(allCars) {
        for (const other of allCars) {
            if (other === this || other.road !== this.road || other.direction !== this.direction) continue;
            const distAhead = (other.distance - this.distance) * this.direction;
            if (distAhead > 0 && distAhead < 60 && other.lane === this.lane) {
                this.tryLaneSwitch(allCars);
                this.speed = Math.max(1, other.speed * 0.9);
                return;
            }
        }
        this.speed = carSpeed * (0.8 + Math.random() * 0.4);
    }
    
    tryLaneSwitch(allCars) {
        if (this.lane !== this.targetLane) return;
        const validLanes = this.road.getLanesForDirection(this.direction);
        const currentIdx = validLanes.indexOf(this.lane);
        const possibleLanes = [];
        if (currentIdx > 0) possibleLanes.push(validLanes[currentIdx - 1]);
        if (currentIdx < validLanes.length - 1) possibleLanes.push(validLanes[currentIdx + 1]);
        for (const newLane of possibleLanes) {
            if (this.isLaneClear(newLane, allCars)) {
                this.targetLane = newLane;
                return;
            }
        }
    }
    
    isLaneClear(lane, allCars) {
        for (const other of allCars) {
            if (other === this || other.road !== this.road) continue;
            if (Math.abs(other.distance - this.distance) < 50 && other.lane === lane) return false;
        }
        return true;
    }
    
    getPosition() {
        const pos = this.road.getPointAtDistance(this.distance);
        let offset;
        if (this.lane === this.targetLane) {
            offset = this.road.getLaneOffset(this.lane);
        } else {
            offset = this.road.getLaneOffset(this.lane) + (this.road.getLaneOffset(this.targetLane) - this.road.getLaneOffset(this.lane)) * this.laneChangeProgress;
        }
        const perpAngle = pos.angle + Math.PI / 2;
        pos.x += Math.cos(perpAngle) * offset;
        pos.y += Math.sin(perpAngle) * offset;
        return pos;
    }
    
    draw(ctx) {
        const pos = this.getPosition();
        let angle = pos.angle;
        if (this.direction === -1) angle += Math.PI;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-this.width/2, -this.height/2, this.width, this.height, 4);
        ctx.fill();
        ctx.fillStyle = this.darkenColor(this.color, 30);
        ctx.beginPath();
        ctx.roundRect(-this.width/4, -this.height/2+2, this.width/2, this.height-4, 2);
        ctx.fill();
        ctx.fillStyle = '#ffff99';
        ctx.fillRect(this.width/2-3, -this.height/2+2, 3, 3);
        ctx.fillRect(this.width/2-3, this.height/2-5, 3, 3);
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(-this.width/2, -this.height/2+2, 3, 3);
        ctx.fillRect(-this.width/2, this.height/2-5, 3, 3);
        ctx.restore();
    }
    
    darkenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0,2), 16) - amount);
        const g = Math.max(0, parseInt(hex.substr(2,2), 16) - amount);
        const b = Math.max(0, parseInt(hex.substr(4,2), 16) - amount);
        return '#' + r.toString(16).padStart(2,'0') + g.toString(16).padStart(2,'0') + b.toString(16).padStart(2,'0');
    }
}

function getSpawnPoints() {
    const spawns = [];
    for (const road of roads) {
        if (!road.startJunction) {
            spawns.push({ road, isStart: true, direction: 1 });
        }
        if (!road.endJunction && !road.isOneWay) {
            spawns.push({ road, isStart: false, direction: -1 });
        }
    }
    return spawns;
}

function spawnCar(sp) {
    const validLanes = sp.road.getLanesForDirection(sp.direction);
    const lane = validLanes[Math.floor(Math.random() * validLanes.length)];
    return new Car(sp.road, lane, sp.direction);
}

function draw() {
    ctx.fillStyle = grassPattern || '#2d5a27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const road of roads) road.draw(ctx);
    for (const junction of junctions) junction.draw(ctx);
    if (!isSimulationRunning) drawEndpoints();
    drawPreview();
    if (hoveredEndpoint && !isSimulationRunning) {
        ctx.save();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(hoveredEndpoint.point.x, hoveredEndpoint.point.y, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SNAP', hoveredEndpoint.point.x, hoveredEndpoint.point.y - 30);
        ctx.restore();
    }
    for (const car of cars) car.draw(ctx);
    carCountDisplay.textContent = cars.length;
    spawnCountDisplay.textContent = getSpawnPoints().length;
}

function drawEndpoints() {
    for (const ep of getRoadEndpoints()) {
        ctx.save();
        ctx.fillStyle = ep.junction ? '#e74c3c' : '#f1c40f';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ep.point.x, ep.point.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

function drawPreview() {
    if (currentTool === 'erase' || isSimulationRunning) return;
    const previewWidth = isOneWay ? 40 : roadWidth;
    ctx.save();
    ctx.lineWidth = previewWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isOneWay ? 'rgba(80, 150, 80, 0.5)' : 'rgba(100, 100, 100, 0.5)';
    
    if (currentTool === 'straight' && drawStartPoint && drawEndPoint) {
        ctx.beginPath();
        ctx.moveTo(drawStartPoint.x, drawStartPoint.y);
        ctx.lineTo(drawEndPoint.x, drawEndPoint.y);
        ctx.stroke();
        if (isOneWay) drawPreviewArrow(drawStartPoint, drawEndPoint);
        drawPointMarker(drawStartPoint, startSnapPoint ? '#00ff00' : '#27ae60');
        drawPointMarker(drawEndPoint, hoveredEndpoint ? '#00ff00' : '#e74c3c');
    } else if (currentTool === 'curve' && drawStartPoint) {
        if (drawControlPoint && drawEndPoint) {
            ctx.beginPath();
            ctx.moveTo(drawStartPoint.x, drawStartPoint.y);
            ctx.quadraticCurveTo(drawControlPoint.x, drawControlPoint.y, drawEndPoint.x, drawEndPoint.y);
            ctx.stroke();
            if (isOneWay) drawPreviewArrow(drawStartPoint, drawEndPoint);
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(drawStartPoint.x, drawStartPoint.y);
            ctx.lineTo(drawControlPoint.x, drawControlPoint.y);
            ctx.lineTo(drawEndPoint.x, drawEndPoint.y);
            ctx.stroke();
            ctx.setLineDash([]);
            drawPointMarker(drawStartPoint, startSnapPoint ? '#00ff00' : '#27ae60');
            drawPointMarker(drawControlPoint, '#3498db');
            drawPointMarker(drawEndPoint, hoveredEndpoint ? '#00ff00' : '#e74c3c');
        } else if (drawEndPoint) {
            ctx.beginPath();
            ctx.moveTo(drawStartPoint.x, drawStartPoint.y);
            ctx.lineTo(drawEndPoint.x, drawEndPoint.y);
            ctx.stroke();
            drawPointMarker(drawStartPoint, startSnapPoint ? '#00ff00' : '#27ae60');
            drawPointMarker(drawEndPoint, hoveredEndpoint ? '#00ff00' : '#e74c3c');
        }
    } else if (currentTool === 'freehand' && currentRoadPath.length > 1) {
        ctx.beginPath();
        ctx.moveTo(currentRoadPath[0].x, currentRoadPath[0].y);
        for (let i = 1; i < currentRoadPath.length; i++) ctx.lineTo(currentRoadPath[i].x, currentRoadPath[i].y);
        ctx.stroke();
        if (isOneWay) drawPreviewArrow(currentRoadPath[0], currentRoadPath[currentRoadPath.length - 1]);
    }
    if ((currentTool === 'straight' || currentTool === 'curve') && drawStartPoint && !drawEndPoint) {
        drawPointMarker(drawStartPoint, startSnapPoint ? '#00ff00' : '#27ae60');
    }
    ctx.restore();
}

function drawPreviewArrow(start, end) {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(angle);
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-8, -10);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawPointMarker(point, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function simplifyPath(points, tolerance = 10) {
    if (points.length < 3) return points;
    const simplified = [points[0]];
    let lastPoint = points[0];
    for (let i = 1; i < points.length - 1; i++) {
        const dx = points[i].x - lastPoint.x;
        const dy = points[i].y - lastPoint.y;
        if (Math.sqrt(dx*dx + dy*dy) >= tolerance) {
            simplified.push(points[i]);
            lastPoint = points[i];
        }
    }
    simplified.push(points[points.length - 1]);
    return simplified;
}

function smoothPath(points, resolution = 5) {
    if (points.length < 3) return points;
    const smoothed = [];
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[Math.min(points.length - 1, i + 1)];
        const p3 = points[Math.min(points.length - 1, i + 2)];
        for (let t = 0; t < resolution; t++) {
            const s = t / resolution;
            const s2 = s * s;
            const s3 = s2 * s;
            smoothed.push({
                x: 0.5 * ((2*p1.x) + (-p0.x + p2.x)*s + (2*p0.x - 5*p1.x + 4*p2.x - p3.x)*s2 + (-p0.x + 3*p1.x - 3*p2.x + p3.x)*s3),
                y: 0.5 * ((2*p1.y) + (-p0.y + p2.y)*s + (2*p0.y - 5*p1.y + 4*p2.y - p3.y)*s2 + (-p0.y + 3*p1.y - 3*p2.y + p3.y)*s3)
            });
        }
    }
    smoothed.push(points[points.length - 1]);
    return smoothed;
}

function createRoad(points) {
    if (points.length < 2) return;
    const actualWidth = isOneWay ? 40 : roadWidth;
    const actualLanes = isOneWay ? 1 : laneCount;
    const startSnap = findSnapPoint(points[0].x, points[0].y);
    const endSnap = findSnapPoint(points[points.length - 1].x, points[points.length - 1].y);
    const road = new Road(points, actualWidth, actualLanes, isOneWay);
    
    // Check for intersections with existing roads
    const intersections = findRoadIntersections(road);
    
    if (intersections.length > 0) {
        // Split the new road at intersection points
        const roadSegments = splitRoadAtIntersections(road, intersections);
        
        // Add all segments to roads array
        roads.push(...roadSegments);
        
        // Create intersections and connect roads
        for (const intersection of intersections) {
            const junction = findOrCreateJunction(intersection.point, true);
            
            // Split existing road at intersection
            const existingRoadSegments = splitRoadAtIntersections(intersection.existingRoad, [{
                point: intersection.point,
                newRoadSegment: intersection.existingRoadSegment,
                existingRoad: road,
                existingRoadSegment: 0,
                t1: intersection.t2,
                t2: intersection.t1
            }]);
            
            // Replace existing road with segments
            const existingIndex = roads.indexOf(intersection.existingRoad);
            if (existingIndex !== -1) {
                roads.splice(existingIndex, 1, ...existingRoadSegments);
            }
            
            // Connect all road segments to the junction
            for (const segment of [...roadSegments, ...existingRoadSegments]) {
                const segmentStart = segment.points[0];
                const segmentEnd = segment.points[segment.points.length - 1];
                
                const startDist = Math.sqrt(
                    (segmentStart.x - junction.position.x) ** 2 + 
                    (segmentStart.y - junction.position.y) ** 2
                );
                const endDist = Math.sqrt(
                    (segmentEnd.x - junction.position.x) ** 2 + 
                    (segmentEnd.y - junction.position.y) ** 2
                );
                
                if (startDist < 10) {
                    segment.startJunction = junction;
                    junction.addConnection(segment, true);
                } else if (endDist < 10) {
                    segment.endJunction = junction;
                    junction.addConnection(segment, false);
                }
            }
        }
    } else {
        // No intersections, handle normally
        roads.push(road);
    }
    
    // Handle endpoint snapping for the main road or first segment
    const mainRoad = intersections.length > 0 ? roads[roads.length - intersections.length] : road;
    
    if (startSnap) {
        let junction = startSnap.junction;
        if (!junction) {
            junction = findOrCreateJunction(startSnap.point);
            if (startSnap.isStart) startSnap.road.startJunction = junction;
            else startSnap.road.endJunction = junction;
            junction.addConnection(startSnap.road, startSnap.isStart);
        }
        mainRoad.startJunction = junction;
        junction.addConnection(mainRoad, true);
    }
    
    if (endSnap) {
        let junction = endSnap.junction;
        if (!junction) {
            junction = findOrCreateJunction(endSnap.point);
            if (endSnap.isStart) endSnap.road.startJunction = junction;
            else endSnap.road.endJunction = junction;
            junction.addConnection(endSnap.road, endSnap.isStart);
        }
        const lastRoad = roads[roads.length - 1];
        lastRoad.endJunction = junction;
        junction.addConnection(lastRoad, false);
    }
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function handleMouseDown(e) {
    const pos = getMousePos(e);
    if (currentTool === 'erase') {
        for (let i = roads.length - 1; i >= 0; i--) {
            for (const point of roads[i].points) {
                if (Math.sqrt((point.x - pos.x)**2 + (point.y - pos.y)**2) < roads[i].width / 2) {
                    removeRoad(roads[i]);
                    draw();
                    return;
                }
            }
        }
        return;
    }
    const snap = findSnapPoint(pos.x, pos.y);
    const actualPos = snap ? { ...snap.point } : pos;
    if (currentTool === 'straight') {
        if (!drawStartPoint) {
            drawStartPoint = actualPos;
            startSnapPoint = snap;
        } else {
            drawEndPoint = actualPos;
            createRoad(generateStraightPoints(drawStartPoint, drawEndPoint));
            drawStartPoint = null;
            drawEndPoint = null;
            startSnapPoint = null;
        }
    } else if (currentTool === 'curve') {
        if (!drawStartPoint) {
            drawStartPoint = actualPos;
            startSnapPoint = snap;
            isDrawing = true;
        }
    } else if (currentTool === 'freehand') {
        isDrawing = true;
        currentRoadPath = [actualPos];
        startSnapPoint = snap;
    }
    draw();
}

function handleMouseMove(e) {
    const pos = getMousePos(e);
    hoveredEndpoint = findSnapPoint(pos.x, pos.y);
    const actualPos = hoveredEndpoint ? { ...hoveredEndpoint.point } : pos;
    if (currentTool === 'straight' && drawStartPoint) {
        drawEndPoint = actualPos;
    } else if (currentTool === 'curve' && isDrawing && drawStartPoint) {
        drawEndPoint = actualPos;
        const midX = (drawStartPoint.x + drawEndPoint.x) / 2;
        const midY = (drawStartPoint.y + drawEndPoint.y) / 2;
        const dx = drawEndPoint.x - drawStartPoint.x;
        const dy = drawEndPoint.y - drawStartPoint.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const lineAngle = Math.atan2(dy, dx);
        const mouseAngle = Math.atan2(pos.y - drawStartPoint.y, pos.x - drawStartPoint.x);
        const offset = Math.sin(mouseAngle - lineAngle) * dist * 0.5;
        drawControlPoint = { x: midX - Math.sin(lineAngle) * offset, y: midY + Math.cos(lineAngle) * offset };
    } else if (currentTool === 'freehand' && isDrawing) {
        currentRoadPath.push(pos);
    }
    draw();
}

function handleMouseUp(e) {
    if (currentTool === 'curve' && isDrawing && drawStartPoint && drawEndPoint) {
        const pos = getMousePos(e);
        const snap = findSnapPoint(pos.x, pos.y);
        drawEndPoint = snap ? { ...snap.point } : pos;
        createRoad(drawControlPoint ? generateBezierPoints(drawStartPoint, drawControlPoint, drawEndPoint) : generateStraightPoints(drawStartPoint, drawEndPoint));
        drawStartPoint = null;
        drawEndPoint = null;
        drawControlPoint = null;
        startSnapPoint = null;
        isDrawing = false;
    } else if (currentTool === 'freehand' && isDrawing) {
        isDrawing = false;
        if (currentRoadPath.length > 2) {
            const last = currentRoadPath[currentRoadPath.length - 1];
            const snap = findSnapPoint(last.x, last.y);
            if (snap) currentRoadPath[currentRoadPath.length - 1] = { ...snap.point };
            createRoad(smoothPath(simplifyPath(currentRoadPath, 15), 3));
        }
        currentRoadPath = [];
        startSnapPoint = null;
    }
    draw();
}

function removeRoad(road) {
    if (road.startJunction) {
        road.startJunction.connections = road.startJunction.connections.filter(c => c.road !== road);
        if (road.startJunction.connections.length <= 1) {
            if (road.startJunction.connections.length === 1) {
                const rem = road.startJunction.connections[0];
                if (rem.isStart) rem.road.startJunction = null;
                else rem.road.endJunction = null;
            }
            junctions = junctions.filter(j => j !== road.startJunction);
        }
    }
    if (road.endJunction) {
        road.endJunction.connections = road.endJunction.connections.filter(c => c.road !== road);
        if (road.endJunction.connections.length <= 1) {
            if (road.endJunction.connections.length === 1) {
                const rem = road.endJunction.connections[0];
                if (rem.isStart) rem.road.startJunction = null;
                else rem.road.endJunction = null;
            }
            junctions = junctions.filter(j => j !== road.endJunction);
        }
    }
    cars = cars.filter(car => car.road !== road);
    roads = roads.filter(r => r !== road);
}

function resetDrawingState() {
    isDrawing = false;
    drawStartPoint = null;
    drawEndPoint = null;
    drawControlPoint = null;
    currentRoadPath = [];
    startSnapPoint = null;
    draw();
}

let lastTime = 0;
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    if (isSimulationRunning) {
        // Update traffic lights
        for (const junction of junctions) {
            junction.updateTrafficLight(dt);
        }
        
        for (const car of cars) car.update(dt, cars);
        cars = cars.filter(car => !car.removed);
        const spawns = getSpawnPoints();
        if (timestamp - lastSpawnTime > spawnRate && spawns.length > 0) {
            cars.push(spawnCar(spawns[Math.floor(Math.random() * spawns.length)]));
            lastSpawnTime = timestamp;
        }
    }
    draw();
    requestAnimationFrame(gameLoop);
}

function setActiveTool(tool) {
    currentTool = tool;
    straightBtn.classList.remove('active');
    curveBtn.classList.remove('active');
    freeDrawBtn.classList.remove('active');
    eraseBtn.classList.remove('active');
    if (tool === 'straight') straightBtn.classList.add('active');
    else if (tool === 'curve') curveBtn.classList.add('active');
    else if (tool === 'freehand') freeDrawBtn.classList.add('active');
    else if (tool === 'erase') eraseBtn.classList.add('active');
    canvas.style.cursor = tool === 'erase' ? 'pointer' : 'crosshair';
    resetDrawingState();
}

straightBtn.addEventListener('click', () => setActiveTool('straight'));
curveBtn.addEventListener('click', () => setActiveTool('curve'));
freeDrawBtn.addEventListener('click', () => setActiveTool('freehand'));
eraseBtn.addEventListener('click', () => setActiveTool('erase'));
clearBtn.addEventListener('click', () => { roads = []; cars = []; junctions = []; resetDrawingState(); });
roadWidthSlider.addEventListener('input', (e) => { roadWidth = parseInt(e.target.value); roadWidthValue.textContent = roadWidth; });
laneCountSelect.addEventListener('change', (e) => { laneCount = parseInt(e.target.value); });
spawnRateSlider.addEventListener('input', (e) => { spawnRate = parseInt(e.target.value); spawnRateValue.textContent = (spawnRate / 1000).toFixed(1) + 's'; });
carSpeedSlider.addEventListener('input', (e) => { carSpeed = parseInt(e.target.value); carSpeedValue.textContent = carSpeed; });
if (oneWayCheckbox) oneWayCheckbox.addEventListener('change', (e) => { isOneWay = e.target.checked; });
startBtn.addEventListener('click', () => {
    if (getSpawnPoints().length === 0) { alert('Draw some roads first!'); return; }
    isSimulationRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
});
pauseBtn.addEventListener('click', () => { isSimulationRunning = false; startBtn.disabled = false; pauseBtn.disabled = true; });

canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mouseleave', () => { if (currentTool === 'freehand') handleMouseUp({ clientX: 0, clientY: 0 }); });
canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); resetDrawingState(); });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleMouseDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }); });
canvas.addEventListener('touchend', (e) => { handleMouseUp({ clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY }); });
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') resetDrawingState();
    else if (e.key === '1') setActiveTool('straight');
    else if (e.key === '2') setActiveTool('curve');
    else if (e.key === '3') setActiveTool('freehand');
    else if (e.key === '4' || e.key === 'Delete') setActiveTool('erase');
    else if (e.key === 'o' || e.key === 'O') { isOneWay = !isOneWay; if (oneWayCheckbox) oneWayCheckbox.checked = isOneWay; }
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
requestAnimationFrame(gameLoop);
