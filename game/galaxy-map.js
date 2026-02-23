// Command to launch (serve this file): npx serve .

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');

const nodesSlider = document.getElementById('nodesSlider');
const nodesValue = document.getElementById('nodesValue');
const neighborsSlider = document.getElementById('neighborsSlider');
const neighborsValue = document.getElementById('neighborsValue');
const regenBtn = document.getElementById('regenBtn');
const zoomValue = document.getElementById('zoomValue');

const systemNameEl = document.getElementById('systemName');
const systemFacilitiesEl = document.getElementById('systemFacilities');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const MAX_X = 1000;
const MAX_Y = 600;

let numNodes = parseInt(nodesSlider.value, 10);
let neighborsCount = parseInt(neighborsSlider.value, 10);

// World data
const nodes = [];
const edges = [];
let nodeDegrees = [];
let playerIndex = -1; // nodo dove è posizionato il giocatore



function generateNodes() {
  nodes.length = 0;
  for (let i = 0; i < numNodes; i++) {
    const theta = Math.random() * Math.PI * 2;
    const u = Math.random();
    const rFactor = Math.pow(u, 1.8); // bias toward center
    const x = Math.cos(theta) * MAX_X * rFactor;
    const y = Math.sin(theta) * MAX_Y * rFactor;
    nodes.push({ x, y });
  }
}

function buildEdges() {
  edges.length = 0;
  nodeDegrees = new Array(nodes.length).fill(0);

  for (let i = 0; i < nodes.length; i++) {
    const distances = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      distances.push({ j, d2: dx * dx + dy * dy });
    }
    distances.sort((a, b) => a.d2 - b.d2);
    for (let k = 0; k < neighborsCount && k < distances.length; k++) {
      const j = distances[k].j;
      if (i < j) {
        edges.push({ a: i, b: j });
        nodeDegrees[i]++;
        nodeDegrees[j]++;
      }
    }
  }
}

function pickPlayerNode() {
  if (nodes.length > 0) {
    playerIndex = Math.floor(Math.random() * nodes.length);
  } else {
    playerIndex = -1;
  }
}

function regenerateMap() {
  generateNodes();
  buildEdges();
  pickPlayerNode();
}

function updateUiLabels() {
  nodesValue.textContent = numNodes;
  neighborsValue.textContent = neighborsCount;
}
updateUiLabels();

nodesSlider.addEventListener('input', () => {
  numNodes = parseInt(nodesSlider.value, 10);
  updateUiLabels();
});

neighborsSlider.addEventListener('input', () => {
  neighborsCount = parseInt(neighborsSlider.value, 10);
  updateUiLabels();
});

regenBtn.addEventListener('click', () => {
  regenerateMap();
});

regenerateMap();

// View transform state
let scale = 1.0; // initial zoom
let rotation = 0;
let panX = 0;
let panY = 0;

// Interaction state
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseX = 0;
let mouseY = 0;

// Hover state
let hoveredIndex = -1;

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    isPanning = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

window.addEventListener('mouseup', () => {
  isPanning = false;
});

canvas.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  if (isPanning) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    panX += dx;
    panY += dy;
  }

  updateHover();
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = 1.05;
  if (e.deltaY < 0) {
    scale *= zoomFactor;
  } else {
    scale /= zoomFactor;
  }
  // Clamp scale between 0.4 and 2.5
  scale = Math.max(0.4, Math.min(scale, 2.5));
}, { passive: false });

window.addEventListener('keydown', (e) => {
  const step = 0.02; // slower rotation
  if (e.key === 'a' || e.key === 'A') {
    rotation -= step;
  } else if (e.key === 'd' || e.key === 'D') {
    rotation += step;
  }
});

// ---------- Starfield with parallax ----------
const NUM_STARS = 500;
const stars = [];

function generateStars() {
  stars.length = 0;
  for (let i = 0; i < NUM_STARS; i++) {
    // u,v in [-0.5, 1.5] per avere campo più largo dello schermo
    const u = -0.5 + Math.random() * 2.0;
    const v = -0.5 + Math.random() * 2.0;
    const depth = 0.2 + Math.random() * 0.8;
    stars.push({ u, v, depth });
  }
}

generateStars();

// ---------- Animated haze ----------
let time = 0;

function drawBackground(w, h) {
  // Base radial gradient
  const g = ctx.createRadialGradient(
    w / 2, h / 2, 0,
    w / 2, h / 2, Math.max(w, h) * 0.8
  );
  g.addColorStop(0, '#050817');
  g.addColorStop(1, '#02040a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Starfield (no canvas transform, ma ruotato in math + parallax ampio)
  const baseStarSize = 1.1;
  const cx = w / 2;
  const cy = h / 2;
  const cosR = Math.cos(rotation); // usa direttamente l'orientamento
  const sinR = Math.sin(rotation);

  ctx.save();
  for (const s of stars) {
    // posizione base (campo più largo dello schermo)
    let sx = s.u * w;
    let sy = s.v * h;

    // parallax sul pan, più ampio e orientato con la rotazione
    const offX = panX * s.depth * 0.4;
    const offY = panY * s.depth * 0.4;

    // ruota il vettore di parallax per seguirne l'orientamento
    const rOffX = offX * cosR - offY * sinR;
    const rOffY = offX * sinR + offY * cosR;

    sx += rOffX;
    sy += rOffY;

    // ruota anche la posizione attorno al centro schermo (parallax + rotazione)
    const dx = sx - cx;
    const dy = sy - cy;
    const rx = cx + dx * cosR - dy * sinR;
    const ry = cy + dx * sinR + dy * cosR;

    const size = baseStarSize + s.depth * 1.2;
    const alpha = 0.25 + s.depth * 0.75;

    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.arc(rx, ry, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Soft animated haze layer
  const hazeRadius = Math.max(w, h) * 0.7;
  const hx = w / 2 + Math.cos(time * 0.2) * 80;
  const hy = h / 2 + Math.sin(time * 0.17) * 60;

  const haze = ctx.createRadialGradient(
    hx, hy, 0,
    hx, hy, hazeRadius
  );
  haze.addColorStop(0.0, 'rgba(120,160,255,0.12)');
  haze.addColorStop(0.4, 'rgba(80,120,220,0.08)');
  haze.addColorStop(1.0, 'rgba(0,0,0,0)');

  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, w, h);
}

// ---------- Hash / system name ----------
function coordHash(x, y) {
  const str = `${Math.round(x * 10)},${Math.round(y * 10)}`;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + c
    hash |= 0;
  }
  return hash >>> 0; // unsigned
}

function systemNameFromCoords(x, y) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let h = coordHash(x, y);
  let name = '';
  for (let i = 0; i < 6; i++) {
    const idx = h % chars.length;
    name = chars[idx] + name;
    h = Math.floor(h / chars.length) || 1;
  }
  return name;
}

// ---------- Facilities based on degree ----------
function facilitiesFromDegree(deg) {
  if (deg <= 2) {
    return 'Uninhabited sector';
  } else if (deg === 3) {
    return 'Refuel services available';
  } else if (deg === 4) {
    return 'Refuel, outfits and software available';
  } else if (deg === 5) {
    return 'Refuel, outfits, software and shipyard available';
  }
  // 6+
  return 'Full services: refuel, outfits, software, shipyard, repairs';
}

// Stile visivo del nodo in base al degree/servizi
function nodeStyleFromDegree(deg) {
  // baseRadius = 4px; extraRadius è in px
  if (deg <= 2) {
    // disabitato
    return { color: '#777777', extraRadius: 0 };
  } else if (deg === 3) {
    // refuel
    return { color: '#ffffff', extraRadius: 0 };
  } else if (deg === 4) {
    // refuel, outfit, software
    return { color: '#aee6ff', extraRadius: 0 };
  } else if (deg === 5) {
    // + shipyard, diametro +1px -> r +0.5px
    return { color: '#7ecbff', extraRadius: 0.5 };
  }
  // full services, ancora +1px di diametro -> +1px di raggio rispetto base
  return { color: '#4cc3ff', extraRadius: 1.0 };
}

function updateHover() {
  const w = canvas.width;
  const h = canvas.height;

  const sx = mouseX;
  const sy = mouseY;

  const cx = w / 2 + panX;
  const cy = h / 2 + panY;

  const dx = sx - cx;
  const dy = sy - cy;

  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);

  // Inverse rotate
  const xRot = (dx * cosR + dy * sinR);
  const yRot = (-dx * sinR + dy * cosR);

  // Inverse scale
  const wx = xRot / scale;
  const wy = yRot / scale;

  const thresholdWorld = 25; // pick radius in world units
  const threshold2 = thresholdWorld * thresholdWorld;

  let bestIndex = -1;
  let bestDist2 = Infinity;

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const ndx = n.x - wx;
    const ndy = n.y - wy;
    const d2 = ndx * ndx + ndy * ndy;
    if (d2 < threshold2 && d2 < bestDist2) {
      bestDist2 = d2;
      bestIndex = i;
    }
  }

  hoveredIndex = bestIndex;

  if (hoveredIndex >= 0) {
    const n = nodes[hoveredIndex];
    const name = systemNameFromCoords(n.x, n.y);
    const deg = nodeDegrees[hoveredIndex] || 0;
    const facilities = facilitiesFromDegree(deg);
    systemNameEl.textContent = `${name} (links: ${deg})`;
    systemFacilitiesEl.textContent = facilities;
  } else {
    systemNameEl.textContent = 'Hover a system';
    systemFacilitiesEl.textContent = '\u00A0';
  }
}

function draw() {
  const w = canvas.width;
  const h = canvas.height;

  time += 0.01;

  // Update zoom display
  zoomValue.textContent = scale.toFixed(2);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // Background + stars + haze
  drawBackground(w, h);

  // Map transform
  ctx.save();
  ctx.translate(w / 2 + panX, h / 2 + panY);
  ctx.scale(scale, scale);
  ctx.rotate(rotation);

  // edges
  ctx.lineWidth = 1.5 / scale;
  ctx.strokeStyle = 'rgba(120, 180, 255, 0.35)';
  ctx.beginPath();
  for (const e of edges) {
    const a = nodes[e.a];
    const b = nodes[e.b];
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  // nodes with styles based on services
  const baseRadius = 4;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const deg = nodeDegrees[i] || 0;
    const style = nodeStyleFromDegree(deg);
    const radiusPx = baseRadius + style.extraRadius;

    ctx.beginPath();
    ctx.fillStyle = style.color;
    ctx.arc(node.x, node.y, radiusPx / Math.sqrt(scale), 0, Math.PI * 2);
    ctx.fill();
  }

  // highlight hovered node
  if (hoveredIndex >= 0) {
    const n = nodes[hoveredIndex];
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2 / scale;
    ctx.arc(n.x, n.y, (baseRadius * 1.8) / Math.sqrt(scale), 0, Math.PI * 2);
    ctx.stroke();
  }

  // player position ring (nodo a caso)
  if (playerIndex >= 0 && nodes[playerIndex]) {
    const p = nodes[playerIndex];
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,0,0.9)';
    ctx.lineWidth = 3 / scale;
    // cerchio un po' più grande del nodo
    ctx.arc(p.x, p.y, (baseRadius + 6) / Math.sqrt(scale), 0, Math.PI * 2);
    ctx.stroke();
  }

  // center glow
  ctx.beginPath();
  ctx.fillStyle = 'rgba(180, 220, 255, 0.08)';
  ctx.arc(0, 0, 200, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  requestAnimationFrame(draw);
}

draw();

// on windowload load galaxy map data (nodes, edges) from JSON file
// and then call regenerateMap() to populate the map with that data instead of random generation
window.onload = () => {
  fetch('galaxy-map-data.json')
    .then(response => response.json())
    .then(data => {
      if (data.nodes && data.edges) {
        // replace random generation with loaded data
        nodes.length = 0;
        edges.length = 0;
        nodeDegrees.length = 0;
        for (const n of data.nodes) {
          nodes.push({ x: n.x, y: n.y });
        }
        for (const e of data.edges) {
          edges.push({ a: e.a, b: e.b });
          nodeDegrees[e.a] = (nodeDegrees[e.a] || 0) + 1;
          nodeDegrees[e.b] = (nodeDegrees[e.b] || 0) + 1;
        }
        pickPlayerNode();
      }
    })
    .catch(err => {
      console.warn("Failed to load galaxy map data, using random generation", err);
      regenerateMap();
    });
};
(function () {
  const baseUrl = window.BASE_URL || '/';
  const toAbsolute = (uri) => {
    if (!uri || /^(?:[a-z]+:|\/\/|#|data:|mailto:|tel:)/i.test(uri)) return uri;
    return new URL(uri, baseUrl).toString();
  };

  document.querySelectorAll('a[href], img[src]').forEach((el) => {
    if (el.tagName === 'A') {
      el.href = toAbsolute(el.getAttribute('href'));
    } else if (el.tagName === 'IMG') {
      el.src = toAbsolute(el.getAttribute('src'));
    }
  });
})();
