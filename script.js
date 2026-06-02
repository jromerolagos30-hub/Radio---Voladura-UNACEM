let map, blastMarker, userMarker, circleRadio, configData = null;

const fallback = {
  utmX: 292925.533, utmY: 8651156.600, zone: 18, hemisphere: "S",
  radiusMeters: 300, date: "2026-06-02", time: "12:15",
  blastName: "Voladura Atocongo - Nivel 218", planFileName: "", planMime: "", planDataUrl: ""
};

async function loadConfig(){
  try{
    const res = await fetch('data.json?nocache=' + Date.now());
    if(!res.ok) throw new Error('No data');
    configData = await res.json();
  }catch(e){
    configData = fallback;
  }
  return configData;
}

function utmToLatLon(easting, northing, zoneNumber, hemisphere) {
  const a = 6378137.0, eccSquared = 0.00669438, k0 = 0.9996;
  const eccPrimeSquared = eccSquared / (1 - eccSquared);
  const e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));
  let x = easting - 500000.0, y = northing;
  if (hemisphere === 'S') y -= 10000000.0;
  const longOrigin = (zoneNumber - 1) * 6 - 180 + 3;
  const M = y / k0;
  const mu = M / (a * (1 - eccSquared/4 - 3*eccSquared*eccSquared/64 - 5*Math.pow(eccSquared,3)/256));
  const phi1Rad = mu
    + (3*e1/2 - 27*Math.pow(e1,3)/32) * Math.sin(2*mu)
    + (21*e1*e1/16 - 55*Math.pow(e1,4)/32) * Math.sin(4*mu)
    + (151*Math.pow(e1,3)/96) * Math.sin(6*mu);
  const N1 = a / Math.sqrt(1 - eccSquared * Math.sin(phi1Rad) ** 2);
  const T1 = Math.tan(phi1Rad) ** 2;
  const C1 = eccPrimeSquared * Math.cos(phi1Rad) ** 2;
  const R1 = a * (1 - eccSquared) / Math.pow(1 - eccSquared * Math.sin(phi1Rad) ** 2, 1.5);
  const D = x / (N1 * k0);
  let lat = phi1Rad - (N1 * Math.tan(phi1Rad) / R1) *
    (D**2/2 - (5 + 3*T1 + 10*C1 - 4*C1**2 - 9*eccPrimeSquared) * D**4/24
    + (61 + 90*T1 + 298*C1 + 45*T1**2 - 252*eccPrimeSquared - 3*C1**2) * D**6/720);
  lat = lat * 180 / Math.PI;
  let lon = (D - (1 + 2*T1 + C1) * D**3/6
    + (5 - 2*C1 + 28*T1 - 3*C1**2 + 8*eccPrimeSquared + 24*T1**2) * D**5/120) / Math.cos(phi1Rad);
  lon = longOrigin + lon * 180 / Math.PI;
  return [lat, lon];
}

function initMap(){
  map = L.map('map', { zoomControl: true }).setView([-12.218, -76.923], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 22, attribution: '&copy; OpenStreetMap'}).addTo(map);
  setTimeout(() => map.invalidateSize(), 300);
}

function drawConfig(d){
  const [lat, lon] = utmToLatLon(Number(d.utmX), Number(d.utmY), Number(d.zone), d.hemisphere);
  const center = L.latLng(lat, lon);
  if(blastMarker) map.removeLayer(blastMarker);
  if(circleRadio) map.removeLayer(circleRadio);
  blastMarker = L.marker(center).addTo(map).bindPopup('Punto de voladura');
  circleRadio = L.circle(center, {radius:Number(d.radiusMeters), color:'red', fillColor:'red', fillOpacity:0.13, weight:3}).addTo(map);
  map.fitBounds(circleRadio.getBounds(), {padding:[25,25]});
  setTimeout(() => map.invalidateSize(), 300);
}

function renderPlan(d){
  const box = document.getElementById('planContainer');
  if(!box) return;
  box.innerHTML = '';
  if(!d.planDataUrl){
    box.innerHTML = '<p class="hint">Aún no se cargó plano de referencia.</p>';
    return;
  }
  if((d.planMime || '').includes('pdf')){
    const obj = document.createElement('iframe');
    obj.src = d.planDataUrl;
    obj.title = d.planFileName || 'Plano PDF';
    box.appendChild(obj);
  }else{
    const img = document.createElement('img');
    img.src = d.planDataUrl;
    img.alt = d.planFileName || 'Plano de referencia';
    box.appendChild(img);
  }
}

function showViewerData(d){
  document.getElementById('vNombre').textContent = d.blastName || '-';
  document.getElementById('vFechaHora').textContent = (d.date || '-') + ' / ' + (d.time || '-');
  document.getElementById('vRadio').textContent = d.radiusMeters + ' m';
}

function evaluarUsuario(){
  if(!userMarker || !circleRadio) return;
  const dist = userMarker.getLatLng().distanceTo(circleRadio.getLatLng());
  const r = Number(configData.radiusMeters);
  const res = document.getElementById('resultado');
  const det = document.getElementById('detalle');
  res.className = 'resultado';
  if(dist <= r){
    res.classList.add('peligro');
    res.textContent = '🔴 DENTRO DEL RADIO';
  } else {
    res.classList.add('ok');
    res.textContent = '🟢 FUERA DEL RADIO';
  }
  det.textContent = 'Distancia aproximada al punto de voladura: ' + Math.round(dist) + ' m. Radio: ' + r + ' m.';
}

function activarGPS(){
  if(!navigator.geolocation){ alert('Tu navegador no soporta geolocalización.'); return; }
  document.getElementById('resultado').className = 'resultado neutral';
  document.getElementById('resultado').textContent = 'Buscando ubicación GPS...';
  navigator.geolocation.getCurrentPosition(pos => {
    const ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
    if(userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker(ll, {radius:9, color:'#2563eb', fillColor:'#2563eb', fillOpacity:0.95}).addTo(map).bindPopup('Mi ubicación GPS').openPopup();
    evaluarUsuario();
    map.fitBounds(L.featureGroup([blastMarker, userMarker, circleRadio]).getBounds(), {padding:[35,35]});
    document.getElementById('map').scrollIntoView({behavior:'smooth', block:'center'});
    setTimeout(() => map.invalidateSize(), 300);
  }, err => {
    document.getElementById('resultado').className = 'resultado peligro';
    document.getElementById('resultado').textContent = 'No se pudo obtener la ubicación.';
    document.getElementById('detalle').textContent = 'Revisa permisos de GPS y HTTPS.';
  }, {enableHighAccuracy:true, timeout:15000, maximumAge:0});
}

function setAdminFields(d){
  for(const id of ['blastName','utmX','utmY','zone','radiusMeters','date','time']){
    if(document.getElementById(id)) document.getElementById(id).value = d[id] || '';
  }
  document.getElementById('hemisphere').value = d.hemisphere || 'S';
  document.getElementById('publicLink').value = window.location.href.replace(/admin\.html.*/, 'index.html').replace(/\?.*/, '');
}

function adminData(){
  return {
    blastName: document.getElementById('blastName').value,
    utmX: Number(document.getElementById('utmX').value),
    utmY: Number(document.getElementById('utmY').value),
    zone: Number(document.getElementById('zone').value),
    hemisphere: document.getElementById('hemisphere').value,
    radiusMeters: Number(document.getElementById('radiusMeters').value),
    date: document.getElementById('date').value,
    time: document.getElementById('time').value,
    planFileName: configData.planFileName || '',
    planMime: configData.planMime || '',
    planDataUrl: configData.planDataUrl || ''
  };
}

function previewAdmin(){
  configData = adminData();
  drawConfig(configData);
  renderPlan(configData);
}

function readPlanFile(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handlePlanChange(evt){
  const file = evt.target.files[0];
  if(!file) return;
  configData.planFileName = file.name;
  configData.planMime = file.type;
  configData.planDataUrl = await readPlanFile(file);
  renderPlan(configData);
}

function downloadData(){
  const d = adminData();
  const blob = new Blob([JSON.stringify(d, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'data.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

async function copyPublicLink(){
  const val = document.getElementById('publicLink').value;
  try { await navigator.clipboard.writeText(val); alert('Enlace copiado.'); }
  catch(e){ alert('Copia manualmente el enlace.'); }
}

async function boot(){
  initMap();
  const mode = document.body.dataset.mode;
  const d = await loadConfig();
  configData = d;
  if(mode === 'admin'){
    setAdminFields(d);
    drawConfig(d);
    renderPlan(d);
    document.getElementById('btnPreview').addEventListener('click', previewAdmin);
    document.getElementById('btnExport').addEventListener('click', downloadData);
    document.getElementById('btnCopy').addEventListener('click', copyPublicLink);
    document.getElementById('planFile').addEventListener('change', handlePlanChange);
  }else{
    showViewerData(d);
    drawConfig(d);
    renderPlan(d);
    document.getElementById('btnGPS').addEventListener('click', activarGPS);
  }
}
window.addEventListener('load', boot);
window.addEventListener('resize', () => map && map.invalidateSize());
