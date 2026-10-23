/* ================================================================
   ALEX NA CIDADE — Matemática em Jogo
   Top-down 2D com pseudo-3D — SEM DEPENDÊNCIAS EXTERNAS
   ================================================================ */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const mini = document.getElementById('mini');
const mctx = mini.getContext('2d');
const compass = document.getElementById('compass');
const cctx = compass.getContext('2d');

let CW = 0, CH = 0, DPR = Math.min(2, window.devicePixelRatio || 1);
function resize() {
  CW = window.innerWidth;
  CH = window.innerHeight;
  canvas.width = CW * DPR;
  canvas.height = CH * DPR;
  canvas.style.width = CW + 'px';
  canvas.style.height = CH + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

/* ---------- ESTADO ---------- */
const S = {
  running: false,
  paused: true,
  score: 0, correct: 0, done: 0, total: 15, clues: 0, cap: 1,
  decisions: { patio: null, method: null },
};

/* ---------- MUNDO ---------- */
const WORLD = 500;
const buildings = [];
const trees = [];
const targets = [];

/* ---------- PLAYER ---------- */
const player = {
  x: 0, z: 0, angle: 0,
  vx: 0, vz: 0,
  inCar: false,
  walkFrame: 0,
};

/* ---------- CARRO ---------- */
const car = {
  x: 20, z: 20, angle: 0, speed: 0,
  maxSpeed: 40, accel: 32, brake: 50, steer: 2.4,
};

/* ---------- CÂMERA ---------- */
const cam = { x: 0, z: 0, zoom: 26 };

/* ---------- GERAR CIDADE ---------- */
function generateCity() {
  buildings.length = 0;
  trees.length = 0;
  targets.length = 0;

  const roadXs = [-150, -50, 50, 150];
  const roadZs = [-150, -50, 50, 150];
  const roadW = 14;
  const colors = ['#2a3a5c','#3a2a4c','#1a3c2a','#4a3a2c','#2c3a4a','#4a2a3a'];

  // Quarteirões
  const xs = [-WORLD/2, ...roadXs.map(r => r - roadW/2), ...roadXs.map(r => r + roadW/2), WORLD/2].sort((a,b)=>a-b);
  const zs = [-WORLD/2, ...roadZs.map(r => r - roadW/2), ...roadZs.map(r => r + roadW/2), WORLD/2].sort((a,b)=>a-b);

  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const x0 = xs[i], x1 = xs[i+1];
      const z0 = zs[j], z1 = zs[j+1];
      if (x1 - x0 < 20 || z1 - z0 < 20) continue;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      if (roadXs.some(r => Math.abs(cx - r) < roadW)) continue;
      if (roadZs.some(r => Math.abs(cz - r) < roadW)) continue;

      // 1-2 prédios no quarteirão
      const n = 1 + Math.floor(Math.random() * 2);
      for (let k = 0; k < n; k++) {
        const bw = 12 + Math.random() * Math.min(20, (x1-x0)*0.5);
        const bd = 12 + Math.random() * Math.min(20, (z1-z0)*0.5);
        const bx = x0 + bw/2 + 4 + Math.random() * (x1-x0 - bw - 8);
        const bz = z0 + bd/2 + 4 + Math.random() * (z1-z0 - bd - 8);
        if (bx + bw/2 > x1 - 3 || bz + bd/2 > z1 - 3) continue;
        buildings.push({
          x: bx, z: bz, w: bw, d: bd,
          h: 0.4 + Math.random() * 0.8, // altura em escala visual
          color: colors[Math.floor(Math.random() * colors.length)],
          windows: Math.random() > 0.3,
        });
      }
    }
  }

  // Árvores
  for (let k = 0; k < 40; k++) {
    const tx = -WORLD/2 + 15 + Math.random() * (WORLD - 30);
    const tz = -WORLD/2 + 15 + Math.random() * (WORLD - 30);
    let ok = true;
    for (const b of buildings) {
      if (Math.abs(tx - b.x) < b.w/2 + 3 && Math.abs(tz - b.z) < b.d/2 + 3) { ok = false; break; }
    }
    if (ok) trees.push({ x: tx, z: tz, r: 2.5 + Math.random() * 1.5 });
  }

  // Alvos / missões
  const pos = [
    { x: 30, z: 20, id: 1, label: 'Gabarito', type: 'npc' },
    { x: -35, z: 40, id: 2, label: 'Engenheiro', type: 'npc' },
    { x: 55, z: -50, id: 3, label: 'Planta', type: 'npc' },
    { x: -60, z: -30, id: 4, label: 'Caderno', type: 'npc' },
    { x: 20, z: -70, id: 5, label: 'Fornecedor', type: 'npc' },
    { x: -100, z: 10, id: 'door1', label: 'Decisão 1', type: 'door', decisionId: 1 },
    { x: 70, z: 70, id: 6, label: 'Esquadro', type: 'npc' },
    { x: -80, z: 80, id: 7, label: 'Estagiário', type: 'npc' },
    { x: 90, z: -90, id: 8, label: 'Reservatório', type: 'npc' },
    { x: -90, z: -80, id: 9, label: 'Scanner', type: 'npc' },
    { x: 50, z: -110, id: 10, label: 'Mestre', type: 'npc' },
    { x: -50, z: 110, id: 11, label: 'Laranja', type: 'npc' },
    { x: 110, z: 0, id: 'door2', label: 'Decisão 2', type: 'door', decisionId: 2 },
    { x: 30, z: 110, id: 12, label: 'Conselheiro 1', type: 'npc' },
    { x: -30, z: 120, id: 13, label: 'Conselheiro 2', type: 'npc' },
    { x: 110, z: 110, id: 14, label: 'Conselheiro 3', type: 'npc' },
    { x: -110, z: -110, id: 15, label: 'Conselheiro 4', type: 'npc' },
    { x: 0, z: 130, id: 'flag', label: 'Bandeira', type: 'flag' },
  ];
  pos.forEach(p => targets.push({ ...p, triggered: false, bob: Math.random() * Math.PI * 2 }));

  // Reset player/carro
  player.x = 0; player.z = 0; player.angle = 0; player.inCar = false;
  player.vx = 0; player.vz = 0;
  car.x = 20; car.z = 20; car.angle = 0; car.speed = 0;
  cam.x = 0; cam.z = 0;
}

/* ---------- INPUT ---------- */
const keys = { w: 0, a: 0, s: 0, d: 0, space: 0, shift: 0 };

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'w' || e.key === 'ArrowUp') { keys.w = 1; e.preventDefault(); }
  if (k === 'a' || e.key === 'ArrowLeft') { keys.a = 1; e.preventDefault(); }
  if (k === 's' || e.key === 'ArrowDown') { keys.s = 1; e.preventDefault(); }
  if (k === 'd' || e.key === 'ArrowRight') { keys.d = 1; e.preventDefault(); }
  if (e.key === ' ') { keys.space = 1; e.preventDefault(); }
  if (e.key === 'Shift') keys.shift = 1;
  if (k === 'e') tryInteract();
  if (k === 'f') toggleCar();
});
window.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'w' || e.key === 'ArrowUp') keys.w = 0;
  if (k === 'a' || e.key === 'ArrowLeft') keys.a = 0;
  if (k === 's' || e.key === 'ArrowDown') keys.s = 0;
  if (k === 'd' || e.key === 'ArrowRight') keys.d = 0;
  if (e.key === ' ') keys.space = 0;
  if (e.key === 'Shift') keys.shift = 0;
});

/* ---------- COLISÃO ---------- */
function collides(x, z, w, d) {
  for (const b of buildings) {
    if (Math.abs(x - b.x) < b.w/2 + w/2 && Math.abs(z - b.z) < b.d/2 + d/2) return true;
  }
  return false;
}

/* ---------- UPDATE PLAYER ---------- */
function updatePlayer(dt) {
  if (player.inCar) return;
  let dx = keys.d - keys.a;
  let dz = keys.s - keys.w;
  const len = Math.hypot(dx, dz);
  const sp = keys.shift ? 12 : 6;
  if (len > 0) {
    dx /= len; dz /= len;
    player.angle = Math.atan2(dx, -dz);
    player.walkFrame += dt * 12;
    const nx = player.x + dx * sp * dt;
    const nz = player.z + dz * sp * dt;
    if (!collides(nx, player.z, 1.2, 1.2)) player.x = nx;
    if (!collides(player.x, nz, 1.2, 1.2)) player.z = nz;
  } else {
    player.walkFrame = 0;
  }
  player.x = Math.max(-WORLD/2+5, Math.min(WORLD/2-5, player.x));
  player.z = Math.max(-WORLD/2+5, Math.min(WORLD/2-5, player.z));
}

/* ---------- UPDATE CARRO ---------- */
function updateCar(dt) {
  if (!player.inCar) return;
  const th = keys.w - keys.s;
  if (th > 0) car.speed += car.accel * dt;
  else if (th < 0) car.speed -= car.brake * dt;
  else car.speed *= Math.pow(0.3, dt);
  car.speed = Math.max(-car.maxSpeed*0.4, Math.min(car.maxSpeed, car.speed));

  const st = keys.a - keys.d;
  if (Math.abs(car.speed) > 0.5) {
    car.angle += st * car.steer * dt * Math.min(1, Math.abs(car.speed)/10) * (car.speed > 0 ? 1 : -1);
  }

  const nx = car.x + Math.sin(car.angle) * car.speed * dt;
  const nz = car.z + Math.cos(car.angle) * car.speed * dt;
  if (!collides(nx, car.z, 4, 2)) car.x = nx; else car.speed *= 0.2;
  if (!collides(car.x, nz, 4, 2)) car.z = nz; else car.speed *= 0.2;

  car.x = Math.max(-WORLD/2+5, Math.min(WORLD/2-5, car.x));
  car.z = Math.max(-WORLD/2+5, Math.min(WORLD/2-5, car.z));

  player.x = car.x;
  player.z = car.z;
  player.angle = car.angle;
}

/* ---------- INTERAÇÕES ---------- */
let activeTarget = null;

function updateActive() {
  activeTarget = null;
  let best = Infinity;
  const px = player.inCar ? car.x : player.x;
  const pz = player.inCar ? car.z : player.z;
  for (const t of targets) {
    if (t.triggered) continue;
    const d = Math.hypot(t.x - px, t.z - pz);
    if (d < 6 && d < best) { best = d; activeTarget = t; }
  }
  const hint = document.getElementById('hint');
  if (activeTarget) {
    hint.style.display = 'block';
    hint.textContent = 'E — ' + (activeTarget.type === 'flag' ? '🏁 Concluir' : activeTarget.type === 'door' ? '🚪 Decidir' : '🎯 ' + activeTarget.label);
  } else {
    hint.style.display = 'none';
  }
}

function tryInteract() {
  if (S.paused || !activeTarget) return;
  if (activeTarget.type === 'flag') { activeTarget.triggered = true; finishChapter(); }
  else if (activeTarget.type === 'door') openDecision(activeTarget.decisionId, activeTarget);
  else openChallenge(activeTarget.id, activeTarget);
}

function toggleCar() {
  if (S.paused) return;
  if (player.inCar) {
    player.inCar = false;
    player.x = car.x + Math.cos(car.angle) * 3;
    player.z = car.z + Math.sin(car.angle) * 3;
  } else {
    if (Math.hypot(player.x - car.x, player.z - car.z) < 6) player.inCar = true;
  }
}

/* ---------- CÂMERA ---------- */
function updateCamera(dt) {
  const px = player.inCar ? car.x : player.x;
  const pz = player.inCar ? car.z : player.z;
  cam.x += (px - cam.x) * Math.min(1, dt * 6);
  cam.z += (pz - cam.z) * Math.min(1, dt * 6);
}

/* ================================================================
   RENDER — Top-down 2D com profundidade
   ================================================================ */
function render() {
  // Céu/fundo
  const sky = ctx.createLinearGradient(0, 0, 0, CH);
  sky.addColorStop(0, '#0f1830');
  sky.addColorStop(0.5, '#0a0e1e');
  sky.addColorStop(1, '#05070f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, CH);

  // Estrelas
  const t = performance.now() * 0.001;
  for (let i = 0; i < 60; i++) {
    const sx = (i * 137.5 + t * 15) % CW;
    const sy = (i * 89.3) % (CH * 0.4);
    ctx.fillStyle = `rgba(150,200,255,${0.2 + Math.sin(t + i) * 0.2})`;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }

  const zoom = cam.zoom;
  const offX = CW / 2 - cam.x * zoom;
  const offZ = CH / 2 - cam.z * zoom;

  function w2s(wx, wz) {
    return { x: wx * zoom + offX, y: wz * zoom + offZ };
  }

  // Chão — tiles
  const tileSize = 10;
  const halfWorld = WORLD / 2;
  const startX = Math.floor((cam.x - CW/(2*zoom) - 20) / tileSize) * tileSize;
  const endX = Math.ceil((cam.x + CW/(2*zoom) + 20) / tileSize) * tileSize;
  const startZ = Math.floor((cam.z - CH/(2*zoom) - 20) / tileSize) * tileSize;
  const endZ = Math.ceil((cam.z + CH/(2*zoom) + 20) / tileSize) * tileSize;

  for (let gx = startX; gx < endX; gx += tileSize) {
    for (let gz = startZ; gz < endZ; gz += tileSize) {
      if (Math.abs(gx) > halfWorld || Math.abs(gz) > halfWorld) continue;
      const isRoadX = Math.abs(gx % 50) < 8;
      const isRoadZ = Math.abs(gz % 50) < 8;
      const isRoad = isRoadX || isRoadZ;
      const p = w2s(gx, gz);
      ctx.fillStyle = isRoad ? '#1a1d24' : '#1e2838';
      ctx.fillRect(p.x, p.y, tileSize * zoom + 1, tileSize * zoom + 1);
      // Faixa amarela
      if (isRoad && Math.floor(gx / tileSize) % 4 === 0 && Math.floor(gz / tileSize) % 4 === 0) {
        ctx.fillStyle = 'rgba(255,225,77,.3)';
        ctx.fillRect(p.x + 4, p.y + 4, 2, tileSize * zoom - 8);
      }
    }
  }

  // Coletar objetos para ordenar por profundidade
  const objs = [];

  // Prédios
  for (const b of buildings) {
    const dist = Math.hypot(b.x - cam.x, b.z - cam.z);
    if (dist > 80) continue;
    objs.push({ kind: 'building', data: b, dist });
  }

  // Árvores
  for (const tr of trees) {
    const dist = Math.hypot(tr.x - cam.x, tr.z - cam.z);
    if (dist > 80) continue;
    objs.push({ kind: 'tree', data: tr, dist });
  }

  // Alvos
  for (const tg of targets) {
    if (tg.triggered) continue;
    const dist = Math.hypot(tg.x - cam.x, tg.z - cam.z);
    if (dist > 80) continue;
    objs.push({ kind: 'target', data: tg, dist });
  }

  // Carro (se não estiver dentro)
  if (!player.inCar) {
    const dist = Math.hypot(car.x - cam.x, car.z - cam.z);
    objs.push({ kind: 'car', data: car, dist });
  }

  // Player
  if (!player.inCar) {
    const dist = Math.hypot(player.x - cam.x, player.z - cam.z);
    objs.push({ kind: 'player', data: player, dist });
  }

  // Ordenar: mais longe desenha primeiro
  objs.sort((a, b) => b.dist - a.dist);

  for (const o of objs) {
    if (o.kind === 'building') drawBuilding(o.data, w2s);
    else if (o.kind === 'tree') drawTree(o.data, w2s);
    else if (o.kind === 'target') drawTarget(o.data, w2s);
    else if (o.kind === 'car') drawCar(w2s);
    else if (o.kind === 'player') drawPlayer(w2s);
  }

  // Vinheta
  const vg = ctx.createRadialGradient(CW/2, CH/2, Math.min(CW,CH)*0.35, CW/2, CH/2, Math.max(CW,CH)*0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, CW, CH);

  drawMinimap();
  drawCompass();
}

function drawBuilding(b, w2s) {
  const p = w2s(b.x - b.w/2, b.z - b.d/2);
  const sw = b.w * cam.zoom;
  const sd = b.d * cam.zoom;
  const h = b.h * cam.zoom * 0.6;

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.fillRect(p.x + 6, p.y + 6, sw, sd);

  // Corpo (face visível)
  const grad = ctx.createLinearGradient(0, p.y - h, 0, p.y + sd);
  const base = hexToRgb(b.color);
  grad.addColorStop(0, `rgb(${base.r*1.5 | 0},${base.g*1.5 | 0},${base.b*1.5 | 0})`);
  grad.addColorStop(1, b.color);
  ctx.fillStyle = grad;
  ctx.fillRect(p.x, p.y - h, sw, sd + h);

  // Telhado
  ctx.fillStyle = `rgb(${Math.min(255, base.r*1.8) | 0},${Math.min(255, base.g*1.8) | 0},${Math.min(255, base.b*1.8) | 0})`;
  ctx.fillRect(p.x, p.y - h, sw, h * 0.4);

  // Contorno
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(p.x, p.y - h, sw, sd + h);

  // Janelas
  if (b.windows) {
    const cols = Math.floor(sw / (12 * cam.zoom / 26));
    const rows = Math.floor((sd + h) / (14 * cam.zoom / 26));
    for (let r = 1; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.2) continue;
        const wx = p.x + 4 + c * (sw - 8) / cols;
        const wy = p.y - h + 4 + r * (sd + h - 8) / rows;
        ctx.fillStyle = (Math.random() > 0.5) ? 'rgba(255,220,120,.85)' : 'rgba(40,50,70,.8)';
        ctx.fillRect(wx, wy, 3 * cam.zoom / 26, 4 * cam.zoom / 26);
      }
    }
  }
}

function drawTree(tr, w2s) {
  const p = w2s(tr.x, tr.z);
  const r = tr.r * cam.zoom;
  // sombra
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.ellipse(p.x + 3, p.y + 3, r * 0.8, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // copa
  const grad = ctx.createRadialGradient(p.x - r*0.3, p.y - r*0.3, r*0.1, p.x, p.y, r);
  grad.addColorStop(0, '#4a9a5a');
  grad.addColorStop(1, '#1a5a2a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(p.x, p.y - r*0.4, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawTarget(tg, w2s) {
  const p = w2s(tg.x, tg.z);
  const bob = Math.sin(performance.now() * 0.003 + tg.bob) * 4;
  const zoom = cam.zoom;
  const color = tg.type === 'door' ? '#ff2e88' : tg.type === 'flag' ? '#22e39a' : '#ffe14d';

  // Halo no chão
  const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, zoom * 2);
  const c = hexToRgb(color);
  grad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},.45)`);
  grad.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, zoom * 2, zoom * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 4, zoom * 0.7, zoom * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Corpo (personagem ou porta)
  if (tg.type === 'door') {
    // Porta
    ctx.fillStyle = color;
    ctx.fillRect(p.x - zoom * 0.8, p.y - zoom * 1.2, zoom * 1.6, zoom * 1.4);
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.arc(p.x + zoom * 0.4, p.y - zoom * 0.5, zoom * 0.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (tg.type === 'flag') {
    // Mastro
    ctx.fillStyle = '#8a94b8';
    ctx.fillRect(p.x - 2, p.y - zoom * 2, 4, zoom * 2);
    // Bandeira
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p.x + 2, p.y - zoom * 2);
    ctx.lineTo(p.x + zoom, p.y - zoom * 1.7 + bob * 0.3);
    ctx.lineTo(p.x + 2, p.y - zoom * 1.4);
    ctx.closePath();
    ctx.fill();
  } else {
    // NPC — corpo
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - zoom * 0.5, zoom * 0.7, zoom * 1, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cabeça
    ctx.fillStyle = '#ffd6a5';
    ctx.beginPath();
    ctx.arc(p.x, p.y - zoom * 1.5, zoom * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ícone flutuante
  const iy = p.y - zoom * 2.5 + bob;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, iy, zoom * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a0e1e';
  ctx.font = `bold ${zoom * 0.7}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const sym = tg.type === 'door' ? '?' : tg.type === 'flag' ? '★' : '!';
  ctx.fillText(sym, p.x, iy + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawCar(w2s) {
  const p = w2s(car.x, car.z);
  const zoom = cam.zoom;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(car.angle);

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.beginPath();
  ctx.ellipse(0, 4, zoom * 2.2, zoom * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Carroceria
  const grad = ctx.createLinearGradient(-zoom*2, 0, zoom*2, 0);
  grad.addColorStop(0, '#00a0d0');
  grad.addColorStop(0.5, '#00e0ff');
  grad.addColorStop(1, '#0090c0');
  ctx.fillStyle = grad;
  ctx.fillRect(-zoom*2, -zoom*1, zoom*4, zoom*2);

  // Vidros
  ctx.fillStyle = 'rgba(10,20,40,.85)';
  ctx.fillRect(-zoom*0.7, -zoom*0.7, zoom*1.4, zoom*1.4);

  // Faróis
  ctx.fillStyle = '#ffe14d';
  ctx.beginPath();
  ctx.arc(zoom*1.9, -zoom*0.5, zoom*0.2, 0, Math.PI*2);
  ctx.arc(zoom*1.9, zoom*0.5, zoom*0.2, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function drawPlayer(w2s) {
  const p = w2s(player.x, player.z);
  const zoom = cam.zoom;

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 3, zoom * 0.9, zoom * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Corpo
  const grad = ctx.createRadialGradient(p.x - zoom*0.2, p.y - zoom*0.4, 0, p.x, p.y, zoom);
  grad.addColorStop(0, '#00e0ff');
  grad.addColorStop(1, '#0080b8');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(p.x, p.y - zoom*0.3, zoom * 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Cabeça
  ctx.fillStyle = '#ffd6a5';
  ctx.beginPath();
  ctx.arc(p.x, p.y - zoom*0.9, zoom * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Cabelo
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.arc(p.x, p.y - zoom*0.9, zoom * 0.5, Math.PI, 0);
  ctx.fill();

  // Crachá
  ctx.fillStyle = '#ffe14d';
  ctx.fillRect(p.x - zoom*0.15, p.y - zoom*0.4, zoom*0.3, zoom*0.2);
}

/* ---------- MINIMAP ---------- */
function drawMinimap() {
  mctx.clearRect(0, 0, 140, 140);
  mctx.fillStyle = 'rgba(10,14,30,.9)';
  mctx.beginPath();
  mctx.arc(70, 70, 70, 0, Math.PI * 2);
  mctx.fill();

  const s = 140 / WORLD;
  // Prédios
  mctx.fillStyle = 'rgba(80,100,140,.7)';
  buildings.forEach(b => {
    mctx.fillRect(70 + b.x * s - b.w*s/2, 70 + b.z * s - b.d*s/2, Math.max(2, b.w*s), Math.max(2, b.d*s));
  });
  // Alvos
  targets.forEach(t => {
    if (t.triggered) return;
    mctx.fillStyle = t.type === 'door' ? '#ff2e88' : t.type === 'flag' ? '#22e39a' : '#ffe14d';
    mctx.beginPath();
    mctx.arc(70 + t.x * s, 70 + t.z * s, 2.5, 0, Math.PI * 2);
    mctx.fill();
  });
  // Player
  const px = player.inCar ? car.x : player.x;
  const pz = player.inCar ? car.z : player.z;
  mctx.fillStyle = '#00e0ff';
  mctx.beginPath();
  mctx.arc(70 + px * s, 70 + pz * s, 4, 0, Math.PI * 2);
  mctx.fill();
}

/* ---------- BÚSSOLA ---------- */
function drawCompass() {
  cctx.clearRect(0, 0, 80, 80);
  const next = targets.find(t => !t.triggered);
  if (!next) return;
  const px = player.inCar ? car.x : player.x;
  const pz = player.inCar ? car.z : player.z;
  const angle = Math.atan2(next.x - px, -(next.z - pz));

  cctx.save();
  cctx.translate(40, 40);

  // círculo
  cctx.strokeStyle = 'rgba(0,224,255,.5)';
  cctx.lineWidth = 2;
  cctx.beginPath();
  cctx.arc(0, 0, 30, 0, Math.PI * 2);
  cctx.stroke();

  // seta
  cctx.rotate(angle);
  cctx.fillStyle = '#ffe14d';
  cctx.beginPath();
  cctx.moveTo(0, -26);
  cctx.lineTo(-7, -16);
  cctx.lineTo(7, -16);
  cctx.closePath();
  cctx.fill();

  cctx.restore();
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

/* ================================================================
   UI / TELAS
   ================================================================ */
function showScreen(name) {
  ['screen-title', 'screen-story', 'screen-challenge', 'screen-decision', 'screen-end'].forEach(id => {
    document.getElementById(id).classList.remove('show');
  });
  if (name) document.getElementById(name).classList.add('show');
}

function updateHUD() {
  document.getElementById('hudCap').textContent = S.cap;
  document.getElementById('hudDone').textContent = `${S.done}/${S.total}`;
  document.getElementById('hudScore').textContent = S.score;
  document.getElementById('hudClues').textContent = `${S.clues}/3`;
}

/* ---------- HISTÓRIA ---------- */
const STORY = {
  1: { tag: 'CAPÍTULO 1', title: 'O Dilema do Pátio', text: 'Alex é Monitor Júnior de Arquitetura. O pátio está rachado. Explore a cidade, encontre os NPCs com "!" e aprenda sobre ladrilhamento.', extra: '🔑 Pista 1: Gabarito Geométrico' },
  2: { tag: 'CAPÍTULO 2', title: 'A Sala Torta', text: 'Calcule o volume da Sala de Memória (paredes oblíquas). Use o Princípio de Cavalieri!', extra: '🔑 Pistas 2 e 3: Esquadro + Relatório' },
  3: { tag: 'CAPÍTULO 3', title: 'Auditoria Final', text: 'O Conselho Escolar exige provas. Resolva os desafios finais e chegue até a bandeira!', extra: '⚡ ≥80% = melhor final' },
};

/* ---------- DESAFIOS ---------- */
const CHALLENGES = {
  1: { cap: 1, fmt: 'Escolha', q: '2 triângulos equiláteros (60°) + 1 quadrado (90°). Qual polígono fecha 360°?', opts: [{t:'Pentágono (108°)',c:false},{t:'Hexágono (120°)',c:false},{t:'Dodecágono (150°)',c:true},{t:'Octógono (135°)',c:false}], fbC:'✔ 60+60+90=210°. Faltam 150° → dodecágono.', fbW:'✘ Some: 60+60+90=210°. Faltam 150°.' },
  2: { cap: 1, fmt: 'Estimar', q: 'Pátio 100 m², peças 0,5×0,5 m, 5% perda. Quantas peças?', opts: [{t:'400',c:false},{t:'420',c:true},{t:'450',c:false},{t:'500',c:false}], fbC:'✔ 100/0,25=400 peças. +5%=420.', fbW:'✘ 100÷0,25=400. +5% = 420.' },
  3: { cap: 1, fmt: 'Interpretar', q: 'Quantos triângulos equiláteros fecham um vértice?', opts: [{t:'4',c:false},{t:'5',c:false},{t:'6',c:true},{t:'8',c:false}], fbC:'✔ 60° × 6 = 360°.', fbW:'✘ 360÷60=6.' },
  4: { cap: 1, fmt: 'Algoritmo', q: 'Ordem para verificar ladrilhamento?', opts: [{t:'n → ângulo → soma → 360°',c:true},{t:'ângulo → n → soma → 360°',c:false},{t:'360° → soma → ângulo → n',c:false}], fbC:'✔ n → ângulo → soma → 360°.', fbW:'✘ Ordem: n → ângulo → soma → 360°.' },
  5: { cap: 1, fmt: 'Associar', q: 'O que IMPEDE ladrilhamento regular?', opts: [{t:'Ângulo divisor de 360°',c:false},{t:'Pentágono regular (108°)',c:true},{t:'Soma=360°',c:false},{t:'Quadrados+octógonos',c:false}], fbC:'✔ 360/108≈3,33. Deixa lacuna.', fbW:'✘ 360÷108 não é inteiro.' },
  6: { cap: 2, fmt: 'Cavalieri', q: 'Prisma oblíquo base 5×3 m, altura 4 m. Volume?', opts: [{t:'30 m³',c:false},{t:'60 m³',c:true},{t:'45 m³',c:false},{t:'Depende do ângulo',c:false}], fbC:'✔ V=A_base×h=15×4=60 m³.', fbW:'✘ V=A_base×h=15×4=60 m³.' },
  7: { cap: 2, fmt: 'Corrigir erro', q: '"Mesmo volume + altura → secções iguais". Onde está o erro?', opts: [{t:'Não há erro',c:false},{t:'Assumir a recíproca',c:true},{t:'Altura não importa',c:false},{t:'Só vale em 2D',c:false}], fbC:'✔ Cavalieri é direto: secções iguais → volumes iguais.', fbW:'✘ A recíproca não vale.' },
  8: { cap: 2, fmt: 'Estimar', q: 'Cilindro r=1 m, altura 2 m. Capacidade em litros? (π≈3,14)', opts: [{t:'3.140 L',c:false},{t:'6.280 L',c:true},{t:'12.560 L',c:false},{t:'2.000 L',c:false}], fbC:'✔ V=3,14×2=6,28 m³ = 6.280 L.', fbW:'✘ A=3,14 m². V=3,14×2=6,28 m³.' },
  9: { cap: 2, fmt: 'Tabela', q: 'Secções constantes 2 m². Equivale a qual sólido?', opts: [{t:'Cone',c:false},{t:'Pirâmide',c:false},{t:'Prisma/cilindro base 2 m²',c:true},{t:'Esfera',c:false}], fbC:'✔ Secção constante → prisma/cilindro.', fbW:'✘ Área constante = prisma/cilindro.' },
  10: { cap: 2, fmt: 'Dados', q: 'Para V de galpão inclinado basta: (1)geratriz (2)altura (3)área da base (4)peso?', opts: [{t:'Todos',c:false},{t:'(1)+(3)',c:false},{t:'(2)+(3)',c:true},{t:'(1)+(2)+(3)',c:false}], fbC:'✔ V=A_base×h → só (2) e (3).', fbW:'✘ Precisa só de altura + área.' },
  11: { cap: 2, fmt: 'Modelo', q: 'A esfera é comparada a qual sólido em Cavalieri?', opts: [{t:'Cubo',c:false},{t:'Cilindro − 2 cones',c:true},{t:'Pirâmide hexagonal',c:false},{t:'2 paralelepípedos',c:false}], fbC:'✔ Cilindro menos 2 cones.', fbW:'✘ Cilindro − 2 cones.' },
  12: { cap: 3, fmt: 'Previsão', q: 'Dobrar a altura dobra o volume? Tem limite?', opts: [{t:'Vale sempre',c:false},{t:'Só se <45°',c:false},{t:'Sem limite, mantendo proporção',c:true},{t:'Só em sólidos retos',c:false}], fbC:'✔ V∝h em Cavalieri.', fbW:'✘ V é linear com h.' },
  13: { cap: 3, fmt: 'Decisão', q: 'Cortar 15% do custo. Melhor escolha?', opts: [{t:'Misturar polígonos',c:false},{t:'Reduzir altura mantendo base',c:true},{t:'Deixar frestas',c:false},{t:'Usar geratriz',c:false}], fbC:'✔ Reduzir altura = volume menor previsível.', fbW:'✘ Reduzir altura mantendo base.' },
  14: { cap: 3, fmt: 'Evidências', q: 'Marca X (pentágonos) ou Y (octógonos+quadrados)?', opts: [{t:'X (bonita)',c:false},{t:'X (menos peças)',c:false},{t:'Y: 8.8.4 = 360°',c:true},{t:'Qualquer uma',c:false}], fbC:'✔ Pentágono não fecha 360°.', fbW:'✘ Pentágono não ladrilha.' },
  15: { cap: 3, fmt: 'Corrigir erro', q: '"Triângulo 3-4-5 × 5 forma ladrilhamento regular." Erro?', opts: [{t:'Triângulo não ladrilha',c:false},{t:'3-4-5 é escaleno, não regular',c:true},{t:'5 = 500°',c:false},{t:'Não é primo',c:false}], fbC:'✔ Regular exige lados/ângulos iguais.', fbW:'✘ 3-4-5 é escaleno.' },
};

/* ---------- DECISÕES ---------- */
const DECISIONS = {
  1: { title: 'Escolha o Padrão do Pátio', text: 'Cada escolha afeta a estética e a história.', opts: [{id:'hex',title:'Hexágonos',desc:'3×120°=360°. Econômico, simples.',tag:'REGULAR'},{id:'oct',title:'Octógonos+Quadrados',desc:'135+135+90=360°. Mais bonito.',tag:'SEMIRREGULAR'}] },
  2: { title: 'Método de Medição', text: 'Como calcular o volume da sala?', opts: [{id:'cavalieri',title:'Cavalieri',desc:'Rápido e elegante. Bônus final.',tag:'RÁPIDO'},{id:'decomposicao',title:'Decomposição',desc:'Tradicional, mais demorado.',tag:'TRADICIONAL'}] },
};

let currentChallengeId = null;
let currentTarget = null;
let selectedOpt = null;

function openChallenge(id, target) {
  S.paused = true;
  currentChallengeId = id;
  currentTarget = target;
  selectedOpt = null;
  const ch = CHALLENGES[id];

  document.getElementById('chNum').textContent = `DESAFIO ${String(id).padStart(2,'0')}`;
  document.getElementById('chFmt').textContent = ch.fmt;
  document.getElementById('chCap').textContent = `CAPÍTULO ${ch.cap}`;
  document.getElementById('chQ').textContent = ch.q;

  const wrap = document.getElementById('chOpts');
  wrap.innerHTML = '';
  ch.opts.forEach((o, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt';
    btn.innerHTML = `<b>${String.fromCharCode(65+i)})</b> ${o.t}`;
    btn.onclick = () => {
      if (btn.classList.contains('locked')) return;
      wrap.querySelectorAll('.opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedOpt = i;
      document.getElementById('btn-answer').disabled = false;
    };
    wrap.appendChild(btn);
  });

  const fb = document.getElementById('chFb');
  fb.className = 'fb';
  fb.textContent = '';

  document.getElementById('btn-answer').classList.remove('hidden');
  document.getElementById('btn-answer').disabled = true;
  document.getElementById('btn-next').classList.add('hidden');

  showScreen('screen-challenge');
}

function submitChallenge() {
  if (selectedOpt === null) return;
  const ch = CHALLENGES[currentChallengeId];
  const chosen = ch.opts[selectedOpt];
  const wrap = document.getElementById('chOpts');
  wrap.querySelectorAll('.opt').forEach((b, i) => {
    b.classList.add('locked');
    if (ch.opts[i].c) b.classList.add('correct');
    else if (i === selectedOpt && !chosen.c) b.classList.add('wrong');
  });
  const fb = document.getElementById('chFb');
  if (chosen.c) {
    fb.className = 'fb correct';
    fb.innerHTML = `<b>${ch.fbC}</b>`;
    S.score += 100;
    S.correct++;
    if (currentChallengeId === 1 || currentChallengeId === 6 || currentChallengeId === 11) {
      S.clues = Math.min(3, S.clues + 1);
    }
  } else {
    fb.className = 'fb wrong';
    fb.innerHTML = `<b>${ch.fbW}</b>`;
  }
  S.done = Math.min(S.total, S.done + 1);
  if (currentTarget) currentTarget.triggered = true;
  updateHUD();
  document.getElementById('btn-answer').classList.add('hidden');
  document.getElementById('btn-next').classList.remove('hidden');
}

function closeChallenge() {
  S.paused = false;
  showScreen(null);
}

function openDecision(id, target) {
  S.paused = true;
  currentTarget = target;
  const d = DECISIONS[id];
  document.getElementById('dcTitle').textContent = d.title;
  document.getElementById('dcText').textContent = d.text;
  const wrap = document.getElementById('dcOpts');
  wrap.innerHTML = '';
  d.opts.forEach(o => {
    const card = document.createElement('div');
    card.className = 'dec-card';
    card.innerHTML = `<h3>${o.title}</h3><p>${o.desc}</p><span class="tag gold" style="font-size:9px;padding:2px 8px;">${o.tag}</span>`;
    card.onclick = () => chooseDecision(id, o.id);
    wrap.appendChild(card);
  });
  showScreen('screen-decision');
}

function chooseDecision(id, choice) {
  if (id === 1) S.decisions.patio = choice;
  else S.decisions.method = choice;
  if (currentTarget) currentTarget.triggered = true;
  S.paused = false;
  showScreen(null);
}

function finishChapter() {
  S.cap++;
  if (S.cap > 3) { showEnd(); return; }
  showStory(S.cap);
  updateHUD();
}

function showStory(phase) {
  const s = STORY[phase];
  document.getElementById('storyTag').textContent = s.tag;
  document.getElementById('storyTitle').textContent = s.title;
  document.getElementById('storyText').textContent = s.text;
  document.getElementById('storyExtra').textContent = s.extra;
  S.paused = true;
  showScreen('screen-story');
}

function showEnd() {
  S.paused = true;
  const pct = Math.round((S.correct / S.total) * 100);
  const good = pct >= 80;
  const tag = document.getElementById('endTag');
  if (good) {
    tag.className = 'tag gold';
    tag.textContent = 'FINAL A';
    document.getElementById('endTitle').textContent = '🏆 Obra Sustentável';
    document.getElementById('endText').textContent = `Com ${S.correct}/${S.total} acertos (${pct}%), Alex entrega o projeto perfeito. A escola economiza 25% da verba!`;
  } else {
    tag.className = 'tag pink';
    tag.textContent = 'FINAL B';
    document.getElementById('endTitle').textContent = '⚠️ Retrabalho Estrutural';
    document.getElementById('endText').textContent = `Com ${S.correct}/${S.total} acertos (${pct}%), o pátio ficou com brechas e os armários não cabem. Alex precisa refazer parte da obra.`;
  }
  const dp = S.decisions.patio === 'hex' ? 'Hexágonos' : S.decisions.patio === 'oct' ? 'Octógonos+Quadrados' : '—';
  const dm = S.decisions.method === 'cavalieri' ? 'Cavalieri' : S.decisions.method === 'decomposicao' ? 'Decomposição' : '—';
  document.getElementById('endStats').innerHTML = `
    <div class="stat"><div class="stat-label">ACERTOS</div><div class="stat-val">${S.correct}/${S.total}</div></div>
    <div class="stat"><div class="stat-label">%</div><div class="stat-val">${pct}%</div></div>
    <div class="stat"><div class="stat-label">PONTOS</div><div class="stat-val">${S.score}</div></div>
    <div class="stat"><div class="stat-label">PADRÃO</div><div class="stat-val" style="font-size:13px">${dp}</div></div>
    <div class="stat"><div class="stat-label">MÉTODO</div><div class="stat-val" style="font-size:13px">${dm}</div></div>
  `;
  showScreen('screen-end');
}

/* ================================================================
   LOOP PRINCIPAL
   ================================================================ */
let lastT = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;

  if (!S.paused && S.running) {
    updatePlayer(dt);
    updateCar(dt);
    updateActive();
    updateCamera(dt);
  }
  render();
  requestAnimationFrame(loop);
}

/* ================================================================
   BOTÕES / BOOT
   ================================================================ */
document.getElementById('btn-start').onclick = () => {
  S.running = true;
  S.paused = false;
  S.score = 0;
  S.correct = 0;
  S.done = 0;
  S.clues = 0;
  S.cap = 1;
  S.decisions = { patio: null, method: null };
  generateCity();
  showStory(1);
  updateHUD();
};

document.getElementById('btn-story').onclick = () => {
  S.paused = false;
  showScreen(null);
};

document.getElementById('btn-answer').onclick = submitChallenge;
document.getElementById('btn-next').onclick = closeChallenge;

document.getElementById('btn-replay').onclick = () => {
  S.running = false;
  showScreen('screen-title');
};

/* ---------- INICIALIZAR ---------- */
generateCity();
updateHUD();
requestAnimationFrame(loop);