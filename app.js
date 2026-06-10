/* 
V18 - Contorno real por plantilla geométrica.
La figura ya no se genera con L.circle ni con sectores simples.
Se genera como L.polygon usando puntos referenciales en metros,
rotados por el ángulo de giro y trasladados al centro geográfico.
*/

// Plantilla referencial obtenida de la imagen compartida:
// Centro local = (0,0). X = Este/Oeste, Y = Norte/Sur.
// Rojo = personas. Verde = equipos.
// Los valores pueden afinarse luego con coordenadas CAD/DXF exactas.
const PLANTILLA_PERSONAS = [
  [-90, 120],
  [-240, 320],
  [-160, 410],
  [0, 450],
  [160, 410],
  [240, 320],
  [90, 120],
  [145, -80],
  [105, -210],
  [0, -300],
  [-105, -210],
  [-145, -80]
];

const PLANTILLA_EQUIPOS = [
  [-180, 240],
  [-420, 560],
  [-260, 700],
  [0, 730],
  [260, 700],
  [420, 560],
  [180, 240],
  [290, -160],
  [210, -420],
  [0, -600],
  [-210, -420],
  [-290, -160]
];

let map = L.map('map').setView([-12.1600, -76.9300], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

let capas = L.layerGroup().addTo(map);
let gpsMarker = null;
let gpsCircle = null;
let poligonos = [];

function hoyISO(){
  return new Date().toISOString().slice(0,10);
}
document.getElementById('v1_fecha').value = hoyISO();
document.getElementById('v2_fecha').value = hoyISO();

function metrosALatLng(dx, dy, lat0, lng0) {
  const R = 6378137;
  const dLat = dy / R;
  const dLng = dx / (R * Math.cos(Math.PI * lat0 / 180));
  return [
    lat0 + dLat * 180 / Math.PI,
    lng0 + dLng * 180 / Math.PI
  ];
}

function rotarPunto(x, y, grados) {
  const a = grados * Math.PI / 180;
  const xr = x * Math.cos(a) - y * Math.sin(a);
  const yr = x * Math.sin(a) + y * Math.cos(a);
  return [xr, yr];
}

function generarPoligonoDesdePlantilla(plantilla, lat, lng, angulo) {
  return plantilla.map(([x,y]) => {
    const [xr, yr] = rotarPunto(x, y, angulo);
    return metrosALatLng(xr, yr, lat, lng);
  });
}

function getVoladura(n) {
  return {
    activa: document.getElementById(`v${n}_activa`).checked,
    nombre: document.getElementById(`v${n}_nombre`).value,
    lat: parseFloat(document.getElementById(`v${n}_lat`).value),
    lng: parseFloat(document.getElementById(`v${n}_lng`).value),
    fecha: document.getElementById(`v${n}_fecha`).value,
    hora: document.getElementById(`v${n}_hora`).value,
    ang: parseFloat(document.getElementById(`v${n}_ang`).value || 0)
  };
}

function actualizar() {
  capas.clearLayers();
  poligonos = [];
  const bounds = [];

  [getVoladura(1), getVoladura(2)].forEach(v => {
    if (!v.activa || isNaN(v.lat) || isNaN(v.lng)) return;

    const personas = generarPoligonoDesdePlantilla(PLANTILLA_PERSONAS, v.lat, v.lng, v.ang);
    const equipos = generarPoligonoDesdePlantilla(PLANTILLA_EQUIPOS, v.lat, v.lng, v.ang);

    const polyEq = L.polygon(equipos, {
      color: 'green',
      weight: 3,
      fillColor: 'lime',
      fillOpacity: 0.12
    }).bindPopup(`<b>${v.nombre}</b><br>Radio Equipos<br>Giro: ${v.ang}°`).addTo(capas);

    const polyPe = L.polygon(personas, {
      color: 'red',
      weight: 3,
      fillColor: 'red',
      fillOpacity: 0.06
    }).bindPopup(`<b>${v.nombre}</b><br>Radio Personas<br>Giro: ${v.ang}°`).addTo(capas);

    L.marker([v.lat, v.lng]).bindPopup(`<b>${v.nombre}</b><br>${v.fecha} ${v.hora}`).addTo(capas);

    poligonos.push({tipo:'personas', nombre:v.nombre, puntos:personas});
    poligonos.push({tipo:'equipos', nombre:v.nombre, puntos:equipos});

    personas.concat(equipos).forEach(p => bounds.push(p));
  });

  if (bounds.length) map.fitBounds(bounds, {padding:[30,30]});
}

function generarEnlace() {
  const data = {
    v1: getVoladura(1),
    v2: getVoladura(2)
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  const url = location.origin + location.pathname + '#data=' + encoded;
  document.getElementById('enlace').value = url;
}

function cargarDesdeURL() {
  if (!location.hash.startsWith('#data=')) return;
  try {
    const raw = decodeURIComponent(escape(atob(location.hash.replace('#data=',''))));
    const data = JSON.parse(raw);
    [1,2].forEach(n => {
      const v = data[`v${n}`];
      if (!v) return;
      document.getElementById(`v${n}_activa`).checked = !!v.activa;
      document.getElementById(`v${n}_nombre`).value = v.nombre || `Voladura ${n}`;
      document.getElementById(`v${n}_lat`).value = v.lat;
      document.getElementById(`v${n}_lng`).value = v.lng;
      document.getElementById(`v${n}_fecha`).value = v.fecha || hoyISO();
      document.getElementById(`v${n}_hora`).value = v.hora || '12:00';
      document.getElementById(`v${n}_ang`).value = v.ang || 0;
    });
  } catch(e) {
    console.error('No se pudo leer la configuración del enlace.', e);
  }
}

function puntoEnPoligono(point, vs) {
  const x = point[1], y = point[0];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][1], yi = vs[i][0];
    const xj = vs[j][1], yj = vs[j][0];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / ((yj - yi) || 0.0000001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function validarUbicacion(lat, lng) {
  let dentro = [];
  poligonos.forEach(p => {
    if (puntoEnPoligono([lat,lng], p.puntos)) dentro.push(`${p.nombre} - ${p.tipo}`);
  });
  const estado = document.getElementById('estado');
  if (dentro.length) {
    estado.className = 'estado dentro';
    estado.textContent = 'ALERTA: Usted se encuentra DENTRO del radio de voladura: ' + dentro.join(', ');
  } else {
    estado.className = 'estado fuera';
    estado.textContent = 'Usted se encuentra FUERA del radio de voladura configurado.';
  }
}

function activarGPS() {
  if (!navigator.geolocation) {
    alert('El navegador no soporta GPS.');
    return;
  }
  navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const acc = pos.coords.accuracy || 0;

    if (!gpsMarker) {
      gpsMarker = L.marker([lat,lng]).addTo(map).bindPopup('Mi ubicación');
      gpsCircle = L.circle([lat,lng], {radius: acc}).addTo(map);
    } else {
      gpsMarker.setLatLng([lat,lng]);
      gpsCircle.setLatLng([lat,lng]);
      gpsCircle.setRadius(acc);
    }
    validarUbicacion(lat,lng);
  }, err => {
    alert('No se pudo obtener GPS: ' + err.message);
  }, {enableHighAccuracy:true, maximumAge:5000, timeout:15000});
}

cargarDesdeURL();
actualizar();
