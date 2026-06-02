let map, blastMarker, userMarker, circleEquipos, circlePersonal, lastBlastLatLng;

document.getElementById('fecha').valueAsDate = new Date();

function utmToLatLon(easting, northing, zoneNumber, hemisphere) {
  // WGS84 / UTM conversion. Adecuado para piloto operativo referencial.
  const a = 6378137.0;
  const eccSquared = 0.00669438;
  const k0 = 0.9996;
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
  map = L.map('map').setView([-12.218, -76.923], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 22,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  actualizarRadios();
}

function actualizarRadios(){
  const x = parseFloat(document.getElementById('utmX').value);
  const y = parseFloat(document.getElementById('utmY').value);
  const zone = parseInt(document.getElementById('zone').value, 10);
  const hem = document.getElementById('hem').value;
  const rE = parseFloat(document.getElementById('rEquipos').value);
  const rP = parseFloat(document.getElementById('rPersonal').value);

  if([x,y,zone,rE,rP].some(v => Number.isNaN(v))){
    alert('Completa coordenadas y radios válidos.');
    return;
  }

  const [lat, lon] = utmToLatLon(x, y, zone, hem);
  lastBlastLatLng = L.latLng(lat, lon);

  if(blastMarker) map.removeLayer(blastMarker);
  if(circleEquipos) map.removeLayer(circleEquipos);
  if(circlePersonal) map.removeLayer(circlePersonal);

  blastMarker = L.marker(lastBlastLatLng).addTo(map).bindPopup('Punto de voladura').openPopup();
  circleEquipos = L.circle(lastBlastLatLng, {
    radius: rE, color: 'red', fillColor: 'red', fillOpacity: 0.12, weight: 3
  }).addTo(map).bindPopup('Radio equipos: ' + rE + ' m');

  circlePersonal = L.circle(lastBlastLatLng, {
    radius: rP, color: 'lime', fillColor: 'lime', fillOpacity: 0.08, weight: 3
  }).addTo(map).bindPopup('Radio personal: ' + rP + ' m');

  map.fitBounds(circlePersonal.getBounds(), {padding:[25,25]});
  evaluarUsuario();
}

function evaluarUsuario(){
  if(!userMarker || !lastBlastLatLng) return;
  const rE = parseFloat(document.getElementById('rEquipos').value);
  const rP = parseFloat(document.getElementById('rPersonal').value);
  const userLL = userMarker.getLatLng();
  const dist = userLL.distanceTo(lastBlastLatLng);
  const res = document.getElementById('resultado');
  const det = document.getElementById('detalle');

  res.className = 'resultado';
  if(dist <= rE){
    res.classList.add('peligro');
    res.textContent = '🔴 EVACUAR: dentro del radio de equipos/exclusión';
  } else if(dist <= rP){
    res.classList.add('alerta');
    res.textContent = '🟡 ALERTA: dentro del radio de personal';
  } else if(dist <= rP + 100){
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
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const acc = Math.round(pos.coords.accuracy || 0);
    const ll = L.latLng(lat, lon);

    if(userMarker) map.removeLayer(userMarker);
    userMarker = L.marker(ll).addTo(map).bindPopup('Mi ubicación GPS. Precisión aprox.: ' + acc + ' m').openPopup();
    evaluarUsuario();

    if(lastBlastLatLng){
      const group = L.featureGroup([blastMarker, userMarker, circlePersonal]);
      map.fitBounds(group.getBounds(), {padding:[25,25]});
    }
  }, err => {
    document.getElementById('resultado').className = 'resultado peligro';
    document.getElementById('resultado').textContent = 'No se pudo obtener la ubicación.';
    document.getElementById('detalle').textContent = 'Revisa permisos de GPS y que la página esté publicada en HTTPS.';
  }, {enableHighAccuracy:true, timeout:15000, maximumAge:0});
}

document.getElementById('btnDibujar').addEventListener('click', actualizarRadios);
document.getElementById('btnGPS').addEventListener('click', activarGPS);
window.addEventListener('load', initMap);
