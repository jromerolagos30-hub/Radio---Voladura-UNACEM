/*
UNACEM - Radio de Voladura V23
Estructura simple tipo V18:
index.html / app.js / styles.css / README.md / ESPECIFICACION_TECNICA.md

Cambio principal:
En lugar de reconstruir la forma con algoritmos de arcos o polígonos,
se usa una plantilla SVG del contorno validado y se coloca sobre el mapa
como imagen georreferenciada, escalada y rotada.
*/

let satellite = false;
let overlayLayer;
let markerLayer;
let gpsMarker = null;
let gpsAccuracy = null;
let currentBlasts = [];

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
overlayLayer = L.layerGroup().addTo(map);
markerLayer = L.layerGroup().addTo(map);

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

// Conversión referencial UTM Zona 18S para visualización.
// Para precisión final integrar Proj4js EPSG:32718.
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

function metersToPixelsAtLat(meters, lat, zoom) {
  const earthCircumference = 40075016.686;
  const metersPerPixel = earthCircumference * Math.cos(degToRad(lat)) / Math.pow(2, zoom + 8);
  return meters / metersPerPixel;
}

function localToLatLng(centerLat, centerLng, dx, dy) {
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(degToRad(centerLat));
  return [
    centerLat + dy / metersPerDegLat,
    centerLng + dx / metersPerDegLng
  ];
}

// Plantilla SVG embebida: representa la forma de referencia.
// ViewBox 0..1000. Centro aproximado del pin = 500,500.
// El ancho/alto visual se escalan al radio de equipos configurado.
function templateSVG(opacity, nombre) {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
    <defs>
      <filter id="soft"><feGaussianBlur stdDeviation="0.2"/></filter>
    </defs>

    <!-- CONTORNO EQUIPOS / VERDE -->
    <path d="
      M 160 385
      C 210 160, 360 70, 500 70
      C 640 70, 790 160, 840 385
      L 690 540
      C 760 620, 810 735, 770 870
      C 705 960, 610 1000, 500 995
      C 390 1000, 295 960, 230 870
      C 190 735, 240 620, 310 540
      Z"
      fill="#22c55e" fill-opacity="${opacity}" stroke="#087d28" stroke-width="8"/>

    <!-- CONTORNO PERSONAS / ROJO -->
    <path d="
      M 295 410
      C 340 265, 420 210, 500 210
      C 580 210, 660 265, 705 410
      L 600 520
      C 650 620, 650 745, 500 810
      C 350 745, 350 620, 400 520
      Z"
      fill="#ef1c25" fill-opacity="${Math.min(0.88, opacity + 0.08)}" stroke="#ef1c25" stroke-width="7"/>

    <!-- eje de perforación -->
    <line x1="500" y1="35" x2="500" y2="985" stroke="#101828" stroke-width="5" stroke-dasharray="18 16"/>

    <!-- etiqueta 37° -->
    <text x="330" y="420" font-size="42" font-family="Arial" fill="#111">37°</text>
    <text x="620" y="420" font-size="42" font-family="Arial" fill="#111">37°</text>

    <!-- centro -->
    <path d="M500 455 C460 455 435 485 435 520 C435 565 500 635 500 635 C500 635 565 565 565 520 C565 485 540 455 500 455 Z"
      fill="#0b6ef3" stroke="#0b6ef3" stroke-width="4"/>
    <circle cx="500" cy="515" r="23" fill="white"/>
    <text x="500" y="950" text-anchor="middle" font-family="Arial" font-size="28" fill="#111">${nombre}</text>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
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
    lateral: Number(document.getElementById(`v${i}_lateral`).value),
    opacity: Number(document.getElementById(`v${i}_opacidad`).value),
    estado: document.getElementById(`v${i}_estado`).value
  };
}

function addImageTemplate(v) {
  if (!v.active) return;

  const center = utmToLatLng(v.este, v.norte);
  const zoom = map.getZoom();

  // La plantilla completa ocupa aprox. 2 radios de equipos en ancho
  // y algo más en alto por la forma superior/inferior.
  const widthPx = metersToPixelsAtLat(v.equipos * 2.35, center[0], zoom);
  const heightPx = metersToPixelsAtLat(v.equipos * 2.85, center[0], zoom);

  const icon = L.divIcon({
    className: "blast-template-icon",
    html: `<img src="${templateSVG(v.opacity, v.name)}"
             style="width:${widthPx}px;height:${heightPx}px;
                    transform:translate(-50%,-50%) rotate(${v.angle}deg);
                    transform-origin:center center;">`,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });

  L.marker(center, {
    icon,
    interactive: false,
    pane: "overlayPane"
  }).addTo(overlayLayer);

  // Marcador real de centro encima de la plantilla.
  L.marker(center).bindPopup(
    `<b>${v.name}</b><br>Centro UTM<br>N: ${v.norte}<br>E: ${v.este}<br>Giro: ${v.angle}°`
  ).addTo(markerLayer);

  // Línea de perforación para referencia.
  const p1 = rotateLocal(0, -v.equipos * 1.8, v.angle);
  const p2 = rotateLocal(0, v.equipos * 1.8, v.angle);
  L.polyline([
    localToLatLng(center[0], center[1], p1[0], p1[1]),
    localToLatLng(center[0], center[1], p2[0], p2[1])
  ], {
    color: "#101828",
    weight: 2,
    dashArray: "7,7"
  }).addTo(markerLayer);

  currentBlasts.push(v);
}

function rotateLocal(x, y, angle) {
  const a = degToRad(angle);
  return [
    x * Math.cos(a) - y * Math.sin(a),
    x * Math.sin(a) + y * Math.cos(a)
  ];
}

function renderAll() {
  overlayLayer.clearLayers();
  markerLayer.clearLayers();
  currentBlasts = [];

  const blasts = [getBlast(1), getBlast(2)];
  blasts.forEach(addImageTemplate);

  const centers = currentBlasts.map(v => utmToLatLng(v.este, v.norte));
  if (centers.length) {
    map.fitBounds(centers.map(c => [
      [c[0] - 0.006, c[1] - 0.006],
      [c[0] + 0.006, c[1] + 0.006]
    ]).flat(), { padding: [40, 40] });
  }

  document.getElementById("sumFecha").textContent = document.getElementById("fecha").value;
  document.getElementById("sumVoladuras").textContent = currentBlasts.length;
}

map.on("zoomend moveend", () => {
  renderAll();
});

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

    document.getElementById("gpsStatus").className = "gps-status safe";
    document.getElementById("gpsStatus").textContent =
      "GPS activo. Validación visual contra plantilla georreferenciada.";
    document.getElementById("sumGPS").textContent = "GPS activo";
  }, err => alert("No se pudo activar GPS: " + err.message), {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 15000
  });
}

function downloadFile(filename, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportJSON() {
  const config = {
    version: "V23 UNACEM - plantilla imagen georreferenciada",
    fecha: document.getElementById("fecha").value,
    voladuras: [getBlast(1), getBlast(2)]
  };
  downloadFile("config_voladuras_unacem_v23.json", JSON.stringify(config, null, 2));
}

function copyUserLink() {
  const config = {
    version: "V23 UNACEM",
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
      document.getElementById(`v${i}_lateral`).value = v.lateral || 394.83;
      document.getElementById(`v${i}_opacidad`).value = v.opacity || 0.82;
      document.getElementById(`v${i}_estado`).value = v.estado || "Programada";
    });
  } catch (e) {
    console.error("No se pudo cargar configuración.", e);
  }
}

loadFromHash();
renderAll();
