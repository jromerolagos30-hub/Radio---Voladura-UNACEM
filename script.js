let map, blastMarker, userMarker, circleEquipos, circlePersonal, lastBlastLatLng;

const DEFAULTS = {
  x: 292925.533, y: 8651196.600, zone: 18, hem: 'S',
  re: 300, rp: 500, fecha: new Date().toISOString().slice(0,10), hora: '12:15'
};

function params(){
  const q = new URLSearchParams(window.location.search);
  return {
    x: parseFloat(q.get('x')) || DEFAULTS.x,
    y: parseFloat(q.get('y')) || DEFAULTS.y,
    zone: parseInt(q.get('zone') || DEFAULTS.zone, 10),
    hem: q.get('hem') || DEFAULTS.hem,
    re: parseFloat(q.get('re')) || DEFAULTS.re,
    rp: parseFloat(q.get('rp')) || DEFAULTS.rp,
    fecha: q.get('fecha') || DEFAULTS.fecha,
    hora: q.get('hora') || DEFAULTS.hora
  };
}

function utmToLatLon(easting, northing, zoneNumber, hemisphere) {
  const a = 6378137.0, eccSquared = 0.00669438, k0 = 0.9996;
  const eccPrimeSquared = eccSquared / (1 - eccSquared);
  const e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));
  let x = easting - 500000.0;
  let y = northing;
  if (hemisphere === 'S') y -= 10000000.0;
  const longOrigin = (zoneNumber - 1) * 6 - 180 + 3;
  const M = y / k0;
  const mu = M / (a * (1 - eccSquared/4 - 3*eccSquared*eccSquared/64 - 5*Math.pow(eccSquared,3)/256));
  const phi1Rad = mu
    + (3*e1/2 - 27*Math.pow(e1,3)/32) * Math.sin(2*mu)
    + (21*e1*e1/16 - 55*Math.pow(e1,4)/32) * Math.sin(4*mu)
    + (151*Math.pow(e1,3)/96) * Math.sin(6*mu);
  const N1 = a / Math.sqrt(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad));
  const T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
  const C1 = eccPrimeSquared * Math.cos(phi1Rad) * Math.cos(phi1Rad);
  const R1 = a * (1 - eccSquared) / Math.pow(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
  const D = x / (N1 * k0);
  let lat = phi1Rad - (N1 * Math.tan(phi1Rad) / R1) *
    (D*D/2 - (5 + 3*T1 + 10*C1 - 4*C1*C1 - 9*eccPrimeSquared) * Math.pow(D,4)/24
    + (61 + 90*T1 + 298*C1 + 45*T1*T1 - 252*eccPrimeSquared - 3*C1*C1) * Math.pow(D,6)/720);
  lat = lat * 180 / Math.PI;
  let lon = (D - (1 + 2*T1 + C1) * Math.pow(D,3)/6
    + (5 - 2*C1 + 28*T1 - 3*C1*C1 + 8*eccPrimeSquared + 24*T1*T1) * Math.pow(D,5)/120) / Math.cos(phi1Rad);
  lon = longOrigin + lon * 180 / Math.PI;
  return [lat, lon];
}

function initMap(){
  map = L.map('map', { zoomControl: true }).setView([-12.218, -76.923], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 22,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  setTimeout(() => map.invalidateSize(), 300);

  const mode = document.body.dataset.mode;
  if(mode === 'admin'){
    document.getElementById('fecha').value = DEFAULTS.fecha;
    document.getElementById('btnPreview').addEventListener('click', previewAdmin);
    document.getElementById('btnLink').addEventListener('click', generarLink);
    document.getElementById('btnCopy').addEventListener('click', copiarLink);
    previewAdmin();
  } else {
    cargarVistaConsulta();
    document.getElementById('btnGPS').addEventListener('click', activarGPS);
  }
}

function dataFromAdmin(){
  return {
    x: parseFloat(document.getElementById('utmX').value),
    y: parseFloat(document.getElementById('utmY').value),
    zone: parseInt(document.getElementById('zone').value, 10),
    hem: document.getElementById('hem').value,
    re: parseFloat(document.getElementById('rEquipos').value),
    rp: parseFloat(document.getElementById('rPersonal').value),
    fecha: document.getElementById('fecha').value,
    hora: document.getElementById('hora').value
  };
}

function dibujarRadios(d){
  if([d.x,d.y,d.zone,d.re,d.rp].some(v => Number.isNaN(v))){
    alert('Completa coordenadas y radios válidos.');
    return;
  }
  const [lat, lon] = utmToLatLon(d.x, d.y, d.zone, d.hem);
  lastBlastLatLng = L.latLng(lat, lon);

  if(blastMarker) map.removeLayer(blastMarker);
  if(circleEquipos) map.removeLayer(circleEquipos);
  if(circlePersonal) map.removeLayer(circlePersonal);

  blastMarker = L.marker(lastBlastLatLng).addTo(map).bindPopup('Punto de voladura');
  circleEquipos = L.circle(lastBlastLatLng, {radius:d.re, color:'red', fillColor:'red', fillOpacity:0.12, weight:3}).addTo(map);
  circlePersonal = L.circle(lastBlastLatLng, {radius:d.rp, color:'lime', fillColor:'lime', fillOpacity:0.08, weight:3}).addTo(map);

  map.fitBounds(circlePersonal.getBounds(), {padding:[25,25]});
  setTimeout(() => map.invalidateSize(), 300);
}

function previewAdmin(){ dibujarRadios(dataFromAdmin()); }

function generarLink(){
  const d = dataFromAdmin();
  const q = new URLSearchParams({
    x: d.x, y: d.y, zone: d.zone, hem: d.hem, re: d.re, rp: d.rp, fecha: d.fecha, hora: d.hora
  });
  const baseUrl = window.location.href.replace(/admin\.html.*/, 'index.html').replace(/\?.*/, '');
  document.getElementById('linkSalida').value = baseUrl + '?' + q.toString();
}

async function copiarLink(){
  const val = document.getElementById('linkSalida').value;
  if(!val){ alert('Primero genera el enlace.'); return; }
  try { await navigator.clipboard.writeText(val); alert('Enlace copiado.'); }
  catch(e){ alert('No se pudo copiar. Mantén presionado el texto y copia manualmente.'); }
}

function cargarVistaConsulta(){
  const d = params();
  document.getElementById('vFecha').textContent = d.fecha;
  document.getElementById('vHora').textContent = d.hora;
  document.getElementById('vRE').textContent = d.re + ' m';
  document.getElementById('vRP').textContent = d.rp + ' m';
  dibujarRadios(d);
}

function evaluarUsuario(){
  if(!userMarker || !lastBlastLatLng) return;
  const d = params();
  const userLL = userMarker.getLatLng();
  const dist = userLL.distanceTo(lastBlastLatLng);
  const res = document.getElementById('resultado');
  const det = document.getElementById('detalle');

  res.className = 'resultado';
  if(dist <= d.re){
    res.classList.add('peligro');
    res.textContent = '🔴 EVACUAR: dentro del radio de equipos/exclusión';
  } else if(dist <= d.rp){
    res.classList.add('alerta');
    res.textContent = '🟡 ALERTA: dentro del radio de personal';
  } else if(dist <= d.rp + 100){
    res.classList.add('alerta');
    res.textContent = '🟡 PRECAUCIÓN: cerca del límite del radio';
  } else {
    res.classList.add('ok');
    res.textContent = '🟢 SEGURO: fuera del área de influencia';
  }
  det.textContent = 'Distancia aproximada al punto de voladura: ' + Math.round(dist) + ' m.';
}

function activarGPS(){
  if(!navigator.geolocation){
    alert('Tu navegador no soporta geolocalización.');
    return;
  }
  document.getElementById('resultado').className = 'resultado neutral';
  document.getElementById('resultado').textContent = 'Buscando ubicación GPS...';

  navigator.geolocation.getCurrentPosition(pos => {
    const ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
    const acc = Math.round(pos.coords.accuracy || 0);

    if(userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker(ll, {radius:9, color:'#2563eb', fillColor:'#2563eb', fillOpacity:0.95}).addTo(map)
      .bindPopup('Mi ubicación GPS. Precisión aprox.: ' + acc + ' m').openPopup();

    evaluarUsuario();
    const group = L.featureGroup([blastMarker, userMarker, circlePersonal]);
    map.fitBounds(group.getBounds(), {padding:[35,35]});
    setTimeout(() => map.invalidateSize(), 300);
    document.getElementById('map').scrollIntoView({behavior:'smooth', block:'center'});
  }, err => {
    document.getElementById('resultado').className = 'resultado peligro';
    document.getElementById('resultado').textContent = 'No se pudo obtener la ubicación.';
    document.getElementById('detalle').textContent = 'Revisa permisos de GPS y que la página esté publicada en HTTPS.';
  }, {enableHighAccuracy:true, timeout:15000, maximumAge:0});
}

window.addEventListener('load', initMap);
window.addEventListener('resize', () => map && map.invalidateSize());
