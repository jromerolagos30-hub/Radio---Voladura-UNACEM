/*
UNACEM - Radio de Voladura V24
La forma real ya no se dibuja: se usa la imagen verdadera del contorno
como PNG transparente y se aplica escala, rotación y centro UTM.
*/

let satellite = false;
let overlayLayer;
let markerLayer;
let gpsMarker = null;
let gpsAccuracy = null;
let currentBlasts = [];
let isRendering = false;

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

function rotateLocal(x, y, angle) {
  const a = degToRad(angle);
  return [
    x * Math.cos(a) - y * Math.sin(a),
    x * Math.sin(a) + y * Math.cos(a)
  ];
}

function getBlast(i) {
  return {
    id: i,
    active: document.getElementById(`v${i}_activa`).checked,
    name: document.getElementById(`v${i}_nombre`).value,
    norte: Number(document.getElementById(`v${i}_norte`).value),
    este: Number(document.getElementById(`v${i}_este`).value),
    angle: Number(document.getElementById(`v${i}_angulo`).value),
    equipos: Number(document.getElementById(`v${i}_equipos`).value),
    widthFactor: Number(document.getElementById(`v${i}_ancho`).value),
    heightFactor: Number(document.getElementById(`v${i}_alto`).value),
    opacity: Number(document.getElementById(`v${i}_opacidad`).value),
    estado: document.getElementById(`v${i}_estado`).value
  };
}

function addRealContourImage(v) {
  if (!v.active) return;

  const center = utmToLatLng(v.este, v.norte);
  const zoom = map.getZoom();

  const widthPx = metersToPixelsAtLat(v.equipos * v.widthFactor, center[0], zoom);
  const heightPx = metersToPixelsAtLat(v.equipos * v.heightFactor, center[0], zoom);

  const t = window.UNACEM_TEMPLATE;
  const html = `
    <img src="${t.file}"
         style="
          width:${widthPx}px;
          height:${heightPx}px;
          opacity:${v.opacity};
          transform:
            translate(-${t.pinXPct}%, -${t.pinYPct}%)
            rotate(${v.angle}deg);
          transform-origin:${t.pinXPct}% ${t.pinYPct}%;
          pointer-events:none;
         ">`;

  const icon = L.divIcon({
    className: "blast-template-icon",
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });

  L.marker(center, {
    icon,
    interactive: false
  }).addTo(overlayLayer);

  L.marker(center).bindPopup(
    `<b>${v.name}</b><br>Centro UTM<br>N: ${v.norte}<br>E: ${v.este}<br>Giro: ${v.angle}°`
  ).addTo(markerLayer);

  const p1 = rotateLocal(0, -v.equipos * 1.7, v.angle);
  const p2 = rotateLocal(0, v.equipos * 1.7, v.angle);

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

function renderAll() {
  if (isRendering) return;
  isRendering = true;

  overlayLayer.clearLayers();
  markerLayer.clearLayers();
  currentBlasts = [];

  const blasts = [getBlast(1), getBlast(2)];
  blasts.forEach(addRealContourImage);

  const centers = currentBlasts.map(v => utmToLatLng(v.este, v.norte));
  if (centers.length && !map._fittedOnce) {
    const expanded = centers.flatMap(c => [
      [c[0] - 0.006, c[1] - 0.006],
      [c[0] + 0.006, c[1] + 0.006]
    ]);
    map.fitBounds(expanded, { padding: [40, 40] });
    map._fittedOnce = true;
  }

  document.getElementById("sumFecha").textContent = document.getElementById("fecha").value;
  document.getElementById("sumVoladuras").textContent = currentBlasts.length;

  isRendering = false;
}

map.on("zoomend", () => {
  overlayLayer.clearLayers();
  markerLayer.clearLayers();
  currentBlasts = [];
  [getBlast(1), getBlast(2)].forEach(addRealContourImage);
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
      "GPS activo. Validación visual sobre contorno real georreferenciado.";
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
    version: "V24 UNACEM - contorno real PNG",
    fecha: document.getElementById("fecha").value,
    voladuras: [getBlast(1), getBlast(2)]
  };
  downloadFile("config_voladuras_unacem_v24.json", JSON.stringify(config, null, 2));
}

function copyUserLink() {
  const config = {
    version: "V24 UNACEM",
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
      document.getElementById(`v${i}_equipos`).value = v.equipos;
      document.getElementById(`v${i}_ancho`).value = v.widthFactor || 2.05;
      document.getElementById(`v${i}_alto`).value = v.heightFactor || 2.20;
      document.getElementById(`v${i}_opacidad`).value = v.opacity || 0.92;
      document.getElementById(`v${i}_estado`).value = v.estado || "Programada";
    });
  } catch (e) {
    console.error("No se pudo cargar configuración.", e);
  }
}

loadFromHash();
renderAll();
