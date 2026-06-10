/*
UNACEM - Radio de Voladura V22
Estructura simple tipo V18:
index.html / app.js / styles.css / README.md / ESPECIFICACION_TECNICA.md

Mejora principal:
Contorno curvo paramétrico basado en:
- arco inferior,
- líneas laterales a ±37°,
- arco superior,
- rotación por ángulo de giro,
- generación con muchos puntos para evitar forma poligonal recta.
*/

let satellite = false;
let layerGroup;
let activePolygons = [];
let gpsMarker = null;
let gpsAccuracy = null;

const map = L.map("map").setView([-12.0, -76.95], 14);

const mapLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20,
  attribution: "© OpenStreetMap"
});

const satelliteLayer = L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
  maxZoom: 20,
  attribution: "© OpenStreetMap"
});

mapLayer.addTo(map);
layerGroup = L.layerGroup().addTo(map);

document.getElementById("fecha").value = new Date().toISOString().slice(0, 10);

function toggleBaseMap() {
  if (satellite) {
    map.removeLayer(satelliteLayer);
    mapLayer.addTo(map);
  } else {
    map.removeLayer(mapLayer);
    satelliteLayer.addTo(map);
  }
  satellite = !satellite;
}

function degToRad(d) {
  return d * Math.PI / 180;
}

function rotatePoint(x, y, degrees) {
  const a = degToRad(degrees);
  return [
    x * Math.cos(a) - y * Math.sin(a),
    x * Math.sin(a) + y * Math.cos(a)
  ];
}

// Conversión UTM referencial Zona 18S para visualización.
// Para precisión final usar Proj4js EPSG:32718.
function utmToLatLng(easting, northing) {
  const lat0 = -12.0;
  const lng0 = -76.95;
  const e0 = 368000;
  const n0 = 8678000;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(degToRad(lat0));
  return [
    lat0 + (northing - n0) / metersPerDegLat,
    lng0 + (easting - e0) / metersPerDegLng
  ];
}

function localToLatLng(centerLat, centerLng, dx, dy) {
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(degToRad(centerLat));
  return [
    centerLat + dy / metersPerDegLat,
    centerLng + dx / metersPerDegLng
  ];
}

function arcPoints(cx, cy, r, startDeg, endDeg, steps) {
  const pts = [];
  const start = startDeg;
  let end = endDeg;

  if (end < start) end += 360;

  for (let i = 0; i <= steps; i++) {
    const t = start + (end - start) * i / steps;
    pts.push([
      cx + r * Math.cos(degToRad(t)),
      cy + r * Math.sin(degToRad(t))
    ]);
  }
  return pts;
}

/*
Construye una forma similar a la referencia:
- eje Y positivo = dirección superior del radio,
- arco inferior tipo gota,
- laterales inclinados a 37°,
- arco superior amplio,
- transición suave con muchos puntos.
*/
function buildCurvedTemplate(radius, cfg) {
  const res = Math.max(30, Number(cfg.resolution || 90));
  const leftDeg = Number(cfg.leftAngle || 37);
  const rightDeg = Number(cfg.rightAngle || 37);
  const topFactor = Number(cfg.topFactor || 1.50);

  // Parámetros proporcionales al radio.
  const bottomR = radius;
  const sideJoinY = radius * 0.80;
  const sideTopY = radius * 2.15;
  const sideTopXLeft = -radius * 1.60;
  const sideTopXRight = radius * 1.60;

  // Arco superior más amplio, parecido a la imagen referencial.
  const topCenterY = radius * 1.82;
  const topR = radius * topFactor;
  const topStart = 144;
  const topEnd = 36;

  // Puntos de unión inferior con laterales.
  const leftJoin = [
    -radius * Math.sin(degToRad(leftDeg)),
    sideJoinY
  ];
  const rightJoin = [
    radius * Math.sin(degToRad(rightDeg)),
    sideJoinY
  ];

  // Parte inferior redondeada: arco desde unión derecha hacia unión izquierda
  // pasando por la parte inferior.
  const lowerArc = arcPoints(0, 0, bottomR, 53, 307, Math.round(res * 0.70));

  // Laterales.
  const leftSide = [];
  const rightSide = [];

  const sideSteps = Math.max(8, Math.round(res * 0.15));
  for (let i = 0; i <= sideSteps; i++) {
    const t = i / sideSteps;
    leftSide.push([
      leftJoin[0] + (sideTopXLeft - leftJoin[0]) * t,
      leftJoin[1] + (sideTopY - leftJoin[1]) * t
    ]);
    rightSide.push([
      sideTopXRight + (rightJoin[0] - sideTopXRight) * t,
      sideTopY + (rightJoin[1] - sideTopY) * t
    ]);
  }

  // Arco superior de izquierda a derecha.
  const topArc = arcPoints(0, topCenterY, topR, topStart, topEnd, Math.round(res * 0.85));

  // Orden: unión izquierda -> lateral izquierda -> arco superior -> lateral derecha -> arco inferior.
  const shape = [];
  shape.push(leftJoin);
  leftSide.forEach(p => shape.push(p));
  topArc.forEach(p => shape.push(p));
  rightSide.forEach(p => shape.push(p));
  lowerArc.forEach(p => shape.push(p));

  return shape;
}

function buildContour(radius, centerEste, centerNorte, angle, cfg) {
  const center = utmToLatLng(centerEste, centerNorte);
  const local = buildCurvedTemplate(radius, cfg);
  return local.map(([x, y]) => {
    const [xr, yr] = rotatePoint(x, y, angle);
    return localToLatLng(center[0], center[1], xr, yr);
  });
}

function getBlast(i) {
  return {
    id: i,
    active: document.getElementById(`v${i}_activa`).checked,
    name: document.getElementById(`v${i}_nombre`).value,
    norte: Number(document.getElementById(`v${i}_norte`).value),
    este: Number(document.getElementById(`v${i}_este`).value),
    angle: Number(document.getElementById(`v${i}_angulo`).value),
    personas: Number(document.getElementById(`v${i}_personas`).value),
    equipos: Number(document.getElementById(`v${i}_equipos`).value),
    leftAngle: Number(document.getElementById(`v${i}_izq`).value),
    rightAngle: Number(document.getElementById(`v${i}_der`).value),
    topFactor: Number(document.getElementById(`v${i}_arco`).value),
    lateralLength: Number(document.getElementById(`v${i}_lateral`).value),
    resolution: Number(document.getElementById(`v${i}_res`).value),
    estado: document.getElementById(`v${i}_estado`).value
  };
}

function renderBlast(v) {
  if (!v.active) return;

  const center = utmToLatLng(v.este, v.norte);

  const equipos = buildContour(v.equipos, v.este, v.norte, v.angle, v);
  const personas = buildContour(v.personas, v.este, v.norte, v.angle, v);

  L.polygon(equipos, {
    color: "#087d28",
    weight: 3,
    fillColor: "#22c55e",
    fillOpacity: 0.36,
    smoothFactor: 0.1
  }).bindPopup(`<b>${v.name}</b><br>Radio equipos<br>Giro: ${v.angle}°`).addTo(layerGroup);

  L.polygon(personas, {
    color: "#ef1c25",
    weight: 3,
    fillColor: "#ef1c25",
    fillOpacity: 0.58,
    smoothFactor: 0.1
  }).bindPopup(`<b>${v.name}</b><br>Radio personas<br>Giro: ${v.angle}°`).addTo(layerGroup);

  // Línea central de perforación.
  const p1 = rotatePoint(0, -v.equipos * 2.2, v.angle);
  const p2 = rotatePoint(0, v.equipos * 2.8, v.angle);
  L.polyline([
    localToLatLng(center[0], center[1], p1[0], p1[1]),
    localToLatLng(center[0], center[1], p2[0], p2[1])
  ], {
    color: "#101828",
    weight: 2,
    dashArray: "7,7"
  }).addTo(layerGroup);

  L.marker(center).bindPopup(
    `<b>${v.name}</b><br>Centro UTM<br>N: ${v.norte}<br>E: ${v.este}<br>Estado: ${v.estado}`
  ).addTo(layerGroup);

  activePolygons.push({ blast: v.name, tipo: "personas", points: personas });
  activePolygons.push({ blast: v.name, tipo: "equipos", points: equipos });
}

function renderAll() {
  layerGroup.clearLayers();
  activePolygons = [];
  const blasts = [getBlast(1), getBlast(2)];
  blasts.forEach(renderBlast);

  const all = activePolygons.flatMap(p => p.points);
  if (all.length) map.fitBounds(all, { padding: [30, 30] });

  document.getElementById("sumFecha").textContent = document.getElementById("fecha").value;
  document.getElementById("sumVoladuras").textContent = blasts.filter(b => b.active).length;
}

function polygonContains(point, polygon) {
  const x = point[1];
  const y = point[0];
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function startGPS() {
  if (!navigator.geolocation) {
    alert("El navegador no soporta GPS.");
    return;
  }

  navigator.geolocation.watchPosition(pos => {
    const point = [pos.coords.latitude, pos.coords.longitude];
    const acc = pos.coords.accuracy || 0;

    if (!gpsMarker) {
      gpsMarker = L.marker(point).addTo(map).bindPopup("Mi ubicación");
      gpsAccuracy = L.circle(point, { radius: acc }).addTo(map);
    } else {
      gpsMarker.setLatLng(point);
      gpsAccuracy.setLatLng(point);
      gpsAccuracy.setRadius(acc);
    }

    const hits = activePolygons.filter(poly => polygonContains(point, poly.points));
    const box = document.getElementById("gpsStatus");
    const sum = document.getElementById("sumGPS");

    if (hits.length) {
      box.className = "gps-status danger";
      box.textContent = "ALERTA: Dentro del radio: " + hits.map(h => `${h.blast} (${h.tipo})`).join(", ");
      sum.textContent = "Dentro del radio";
    } else {
      box.className = "gps-status safe";
      box.textContent = "Fuera del radio de voladura configurado.";
      sum.textContent = "Fuera del radio";
    }
  }, err => alert("No se pudo activar GPS: " + err.message), {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 15000
  });
}

function toGeoJSON() {
  return {
    type: "FeatureCollection",
    features: activePolygons.map(poly => ({
      type: "Feature",
      properties: {
        blast: poly.blast,
        tipo: poly.tipo,
        version: "V22 UNACEM"
      },
      geometry: {
        type: "Polygon",
        coordinates: [poly.points.map(p => [p[1], p[0]])]
      }
    }))
  };
}

function downloadFile(filename, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportGeoJSON() {
  renderAll();
  downloadFile("radios_voladura_unacem_v22.geojson", JSON.stringify(toGeoJSON(), null, 2));
}

function exportJSON() {
  const config = {
    version: "V22 UNACEM",
    fecha: document.getElementById("fecha").value,
    voladuras: [getBlast(1), getBlast(2)]
  };
  downloadFile("config_voladuras_unacem_v22.json", JSON.stringify(config, null, 2));
}

function copyUserLink() {
  const config = {
    version: "V22 UNACEM",
    fecha: document.getElementById("fecha").value,
    voladuras: [getBlast(1), getBlast(2)]
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
  const url = location.origin + location.pathname + "#cfg=" + encoded;

  navigator.clipboard.writeText(url)
    .then(() => alert("Enlace copiado."))
    .catch(() => prompt("Copie el enlace:", url));
}

function loadFromHash() {
  if (!location.hash.startsWith("#cfg=")) return;
  try {
    const config = JSON.parse(decodeURIComponent(escape(atob(location.hash.replace("#cfg=", "")))));
    if (config.fecha) document.getElementById("fecha").value = config.fecha;

    (config.voladuras || []).forEach((v, idx) => {
      const i = idx + 1;
      if (i > 2) return;
      document.getElementById(`v${i}_activa`).checked = !!v.active;
      document.getElementById(`v${i}_nombre`).value = v.name || `VOLADURA ${i}`;
      document.getElementById(`v${i}_norte`).value = v.norte;
      document.getElementById(`v${i}_este`).value = v.este;
      document.getElementById(`v${i}_angulo`).value = v.angle;
      document.getElementById(`v${i}_personas`).value = v.personas;
      document.getElementById(`v${i}_equipos`).value = v.equipos;
      document.getElementById(`v${i}_izq`).value = v.leftAngle || 37;
      document.getElementById(`v${i}_der`).value = v.rightAngle || 37;
      document.getElementById(`v${i}_arco`).value = v.topFactor || 1.50;
      document.getElementById(`v${i}_lateral`).value = v.lateralLength || 394.83;
      document.getElementById(`v${i}_res`).value = v.resolution || 90;
      document.getElementById(`v${i}_estado`).value = v.estado || "Programada";
    });
  } catch (e) {
    console.error("No se pudo cargar configuración.", e);
  }
}

loadFromHash();
renderAll();
