let satellite = true;
let map = L.map('map', {zoomControl:true}).setView([-12.0, -76.95], 14);
let satelliteLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {maxZoom:20});
let mapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:20});
satelliteLayer.addTo(map);

let layerGroup = L.layerGroup().addTo(map);
let activePolygons = [];
let gpsMarker = null;

document.getElementById('fechaGlobal').value = new Date().toISOString().slice(0,10);

function toggleBaseMap(){
  if(satellite){ map.removeLayer(satelliteLayer); mapLayer.addTo(map); }
  else { map.removeLayer(mapLayer); satelliteLayer.addTo(map); }
  satellite = !satellite;
}

function getBlast(i){
  return {
    id:i,
    active:document.getElementById(`v${i}_activa`).checked,
    name:document.getElementById(`v${i}_nombre`).value,
    norte:Number(document.getElementById(`v${i}_norte`).value),
    este:Number(document.getElementById(`v${i}_este`).value),
    angle:Number(document.getElementById(`v${i}_angulo`).value),
    radioPersonas:Number(document.getElementById(`v${i}_radio_personas`).value),
    radioEquipos:Number(document.getElementById(`v${i}_radio_equipos`).value),
    estado:document.getElementById(`v${i}_estado`).value
  };
}

function renderBlast(v){
  if(!v.active) return;
  const center = utmToLatLng(v.este, v.norte);

  const equipos = buildContour(TEMPLATE_EQUIPOS_300, 300, v.radioEquipos, v.este, v.norte, v.angle);
  const personas = buildContour(TEMPLATE_PERSONAS_150, 150, v.radioPersonas, v.este, v.norte, v.angle);

  L.polygon(equipos, {color:'#16a34a', weight:3, fillColor:'#22c55e', fillOpacity:.42})
    .bindPopup(`<b>${v.name}</b><br>Contorno equipos<br>Giro: ${v.angle}°`).addTo(layerGroup);

  L.polygon(personas, {color:'#ef1c25', weight:3, fillColor:'#ef1c25', fillOpacity:.62})
    .bindPopup(`<b>${v.name}</b><br>Contorno personas<br>Giro: ${v.angle}°`).addTo(layerGroup);

  const direction = buildContour([[0,-650],[0,800]], 1, 1, v.este, v.norte, v.angle);
  L.polyline(direction, {color:'#111827', weight:2, dashArray:'7,7'}).addTo(layerGroup);

  L.marker(center).bindPopup(`<b>${v.name}</b><br>Centro UTM<br>N: ${v.norte}<br>E: ${v.este}`).addTo(layerGroup);

  activePolygons.push({blast:v.name, type:'personas', points:personas});
  activePolygons.push({blast:v.name, type:'equipos', points:equipos});
}

function renderAll(){
  layerGroup.clearLayers();
  activePolygons = [];
  [getBlast(1), getBlast(2)].forEach(renderBlast);

  const all = activePolygons.flatMap(p=>p.points);
  if(all.length) map.fitBounds(all, {padding:[30,30]});
}

function startGPS(){
  if(!navigator.geolocation){ alert('GPS no disponible en este navegador.'); return; }
  navigator.geolocation.watchPosition(pos=>{
    const p=[pos.coords.latitude,pos.coords.longitude];
    if(!gpsMarker) gpsMarker=L.marker(p).addTo(map).bindPopup('Mi ubicación');
    else gpsMarker.setLatLng(p);

    const hits = activePolygons.filter(poly=>polygonContains(p, poly.points));
    const box=document.getElementById('statusBox');
    if(hits.length){
      box.className='danger';
      box.textContent='ALERTA: Dentro del radio de voladura: ' + hits.map(h=>`${h.blast} (${h.type})`).join(', ');
    }else{
      box.className='safe';
      box.textContent='Fuera del radio de voladura configurado.';
    }
  }, err=>alert('No se pudo activar GPS: '+err.message), {enableHighAccuracy:true});
}

function toGeoJSON(){
  const features = activePolygons.map(p=>({
    type:'Feature',
    properties:{blast:p.blast, tipo:p.type},
    geometry:{type:'Polygon', coordinates:[p.points.map(ll=>[ll[1], ll[0]])]}
  }));
  return {type:'FeatureCollection', features};
}

function download(name, text){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  a.download=name;
  a.click();
}

function exportGeoJSON(){
  renderAll();
  download('radios_voladura_unacem_v20.geojson', JSON.stringify(toGeoJSON(), null, 2));
}

function exportConfig(){
  const cfg={fecha:document.getElementById('fechaGlobal').value, voladuras:[getBlast(1),getBlast(2)]};
  download('config_voladuras_unacem_v20.json', JSON.stringify(cfg, null, 2));
}

function copyUserLink(){
  const cfg={fecha:document.getElementById('fechaGlobal').value, voladuras:[getBlast(1),getBlast(2)]};
  const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(cfg))));
  const url=location.origin+location.pathname+'#cfg='+encoded;
  navigator.clipboard.writeText(url).then(()=>alert('Enlace copiado.'));
}

function loadFromHash(){
  if(!location.hash.startsWith('#cfg=')) return;
  try{
    const cfg=JSON.parse(decodeURIComponent(escape(atob(location.hash.replace('#cfg=','')))));
    if(cfg.fecha) document.getElementById('fechaGlobal').value=cfg.fecha;
    (cfg.voladuras||[]).forEach((v,idx)=>{
      const i=idx+1;
      document.getElementById(`v${i}_activa`).checked=!!v.active;
      document.getElementById(`v${i}_nombre`).value=v.name||`VOLADURA ${i}`;
      document.getElementById(`v${i}_norte`).value=v.norte;
      document.getElementById(`v${i}_este`).value=v.este;
      document.getElementById(`v${i}_angulo`).value=v.angle;
      document.getElementById(`v${i}_radio_personas`).value=v.radioPersonas;
      document.getElementById(`v${i}_radio_equipos`).value=v.radioEquipos;
      document.getElementById(`v${i}_estado`).value=v.estado||'Programada';
    });
  }catch(e){console.error(e)}
}

function setView(mode){
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  event.target.classList.add('active');
}

loadFromHash();
renderAll();
