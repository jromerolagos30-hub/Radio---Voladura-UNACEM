let map, userMarker, currentData = null;
let mapLayers = [];
let blastGeometries = [];

const DEFAULT_DATA = {
  eventName: 'Voladuras Atocongo',
  zone: 18,
  hemisphere: 'S',
  radiusEquipos: 300,
  radiusPersonal: 500,
  date: '2026-06-02',
  blasts: [
    {enabled:true, name:'Primera voladura', utmX:292925.533, utmY:8651156.600, time:'12:45', angle:0},
    {enabled:false, name:'Segunda voladura', utmX:292925.533, utmY:8651156.600, time:'15:00', angle:0}
  ]
};

function enc(obj){
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function dec(str){
  str=str.replace(/-/g,'+').replace(/_/g,'/');
  while(str.length%4)str+='=';
  return JSON.parse(decodeURIComponent(escape(atob(str))));
}

function dataFromHash(){
  try{
    const m=(location.hash||'').match(/data=([^&]+)/);
    return normalizeData(m ? dec(m[1]) : DEFAULT_DATA);
  }catch(e){
    return normalizeData(DEFAULT_DATA);
  }
}

function normalizeData(d){
  // Compatibilidad con versiones anteriores de 1 sola voladura.
  if(!d.blasts){
    d = {
      eventName: d.blastName || 'Voladura Atocongo',
      zone: d.zone || 18,
      hemisphere: d.hemisphere || 'S',
      radiusEquipos: d.radiusEquipos || 300,
      radiusPersonal: d.radiusPersonal || 500,
      date: d.date || '2026-06-02',
      blasts: [
        {enabled:true, name:d.blastName || 'Primera voladura', utmX:d.utmX, utmY:d.utmY, time:d.time || '12:45', angle:0},
        {enabled:false, name:'Segunda voladura', utmX:d.utmX, utmY:d.utmY, time:'15:00', angle:0}
      ]
    };
  }
  d.blasts = (d.blasts || []).slice(0,2).map((b,i)=>({
    enabled: !!b.enabled,
    name: b.name || (i===0 ? 'Primera voladura' : 'Segunda voladura'),
    utmX: Number(b.utmX || 0),
    utmY: Number(b.utmY || 0),
    time: b.time || '',
    angle: Number(b.angle || 0)
  }));
  if(d.blasts.length < 2){
    d.blasts.push({enabled:false,name:'Segunda voladura',utmX:d.blasts[0]?.utmX||0,utmY:d.blasts[0]?.utmY||0,time:'',angle:0});
  }
  return d;
}

function utmToLatLon(E,N,Z,H){
  const a=6378137,e=0.00669438,k=0.9996,ep=e/(1-e),e1=(1-Math.sqrt(1-e))/(1+Math.sqrt(1-e));
  let x=E-500000,y=N;
  if(H==='S')y-=10000000;
  const lo=(Z-1)*6-180+3,M=y/k,mu=M/(a*(1-e/4-3*e*e/64-5*Math.pow(e,3)/256));
  const p=mu+(3*e1/2-27*Math.pow(e1,3)/32)*Math.sin(2*mu)+(21*e1*e1/16-55*Math.pow(e1,4)/32)*Math.sin(4*mu)+(151*Math.pow(e1,3)/96)*Math.sin(6*mu);
  const n=a/Math.sqrt(1-e*Math.sin(p)**2),T=Math.tan(p)**2,C=ep*Math.cos(p)**2,R=a*(1-e)/Math.pow(1-e*Math.sin(p)**2,1.5),D=x/(n*k);
  let lat=p-(n*Math.tan(p)/R)*(D**2/2-(5+3*T+10*C-4*C**2-9*ep)*D**4/24+(61+90*T+298*C+45*T**2-252*ep-3*C**2)*D**6/720);
  lat=lat*180/Math.PI;
  let lon=(D-(1+2*T+C)*D**3/6+(5-2*C+28*T-3*C**2+8*ep+24*T**2)*D**5/120)/Math.cos(p);
  lon=lo+lon*180/Math.PI;
  return [lat,lon];
}

function initMap(){
  map=L.map('map',{zoomControl:true}).setView([-12.218,-76.923],15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:22,
    attribution:'&copy; OpenStreetMap'
  }).addTo(map);
  setTimeout(()=>map.invalidateSize(),300);
}

function clearMapLayers(){
  mapLayers.forEach(l=>{try{map.removeLayer(l)}catch(e){}});
  mapLayers = [];
  blastGeometries = [];
}

function arcPoints(radius, startDeg, endDeg, stepDeg=4){
  const pts=[];
  let s=startDeg, e=endDeg;
  if(e < s) e += 360;
  for(let a=s; a<=e; a+=stepDeg){
    const rad=(a%360)*Math.PI/180;
    pts.push([radius*Math.sin(rad), radius*Math.cos(rad)]); // x este, y norte
  }
  const rad=(endDeg%360)*Math.PI/180;
  pts.push([radius*Math.sin(rad), radius*Math.cos(rad)]);
  return pts;
}

function rotatePoint(p, angleDeg){
  const a=angleDeg*Math.PI/180; // horario desde norte
  const x=p[0], y=p[1];
  return [
    x*Math.cos(a) + y*Math.sin(a),
    -x*Math.sin(a) + y*Math.cos(a)
  ];
}

// Plantilla referencial del contorno tipo, manteniendo dimensiones visuales:
// 0° = proyección hacia el Norte. El administrador rota toda la plantilla.
function buildTemplate(radiusEquipos, radiusPersonal){
  const re = Number(radiusEquipos || 300);
  const rp = Number(radiusPersonal || 500);
  const half = 75;         // ancho base de 150 m
  const shoulder = 37;     // brazos constructivos
  const leftArm = -shoulder;
  const rightArm = shoulder;

  // Contorno de equipos (rojo): forma compuesta por arco superior, brazos y arco inferior.
  const red = [
    ...arcPoints(re, -52, 52, 4),
    [half, re*0.70],
    [re*0.52, re*0.10],
    ...arcPoints(re*0.72, 125, 235, 4),
    [-re*0.52, re*0.10],
    [-half, re*0.70]
  ];

  // Contorno exterior personal (verde): arco superior + proyección lateral + arco inferior.
  const green = [
    ...arcPoints(rp, -58, 58, 4),
    [rp*0.72, rp*0.06],
    [rp*0.50, -rp*0.86],
    ...arcPoints(rp, 150, 210, 4),
    [-rp*0.50, -rp*0.86],
    [-rp*0.72, rp*0.06]
  ];

  return {red, green};
}

function offsetToLatLng(center, x, y){
  const latRad=center.lat*Math.PI/180;
  const dLat=y/111320;
  const dLon=x/(111320*Math.cos(latRad));
  return [center.lat+dLat, center.lng+dLon];
}

function latLngToOffset(center, ll){
  const latRad=center.lat*Math.PI/180;
  const y=(ll.lat-center.lat)*111320;
  const x=(ll.lng-center.lng)*111320*Math.cos(latRad);
  return [x,y];
}

function localToLatLngs(center, pts, angleDeg){
  return pts.map(p=>{
    const r=rotatePoint(p, angleDeg);
    return offsetToLatLng(center, r[0], r[1]);
  });
}

function pointInPolygon(point, polygon){
  const x=point[0], y=point[1];
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const xi=polygon[i][0], yi=polygon[i][1];
    const xj=polygon[j][0], yj=polygon[j][1];
    const intersect=((yi>y)!=(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi);
    if(intersect) inside=!inside;
  }
  return inside;
}

function drawData(d){
  clearMapLayers();
  currentData = normalizeData(d);
  const bounds = [];
  const template = buildTemplate(currentData.radiusEquipos, currentData.radiusPersonal);

  currentData.blasts.filter(b=>b.enabled).forEach((b,idx)=>{
    const [lat,lon]=utmToLatLon(Number(b.utmX),Number(b.utmY),Number(currentData.zone),currentData.hemisphere);
    const center=L.latLng(lat,lon);
    const angle=Number(b.angle||0);

    const greenLatLngs = localToLatLngs(center, template.green, angle);
    const redLatLngs = localToLatLngs(center, template.red, angle);

    const greenLayer=L.polygon(greenLatLngs,{
      color:'#16a34a',
      fillColor:'#16a34a',
      fillOpacity:.13,
      weight:4
    }).addTo(map).bindPopup(`${b.name}<br>Radio personal / contorno exterior<br>Rotación: ${angle}°`);

    const redLayer=L.polygon(redLatLngs,{
      color:'#ff0b00',
      fillColor:'#ff0b00',
      fillOpacity:.28,
      weight:4
    }).addTo(map).bindPopup(`${b.name}<br>Sector de riesgo para equipos<br>Rotación: ${angle}°`);

    const marker=L.marker(center).addTo(map).bindPopup(`${b.name}<br>Punto de voladura<br>Ángulo: ${angle}°`);

    mapLayers.push(greenLayer, redLayer, marker);
    bounds.push(...greenLatLngs);

    const redLocal = template.red.map(p=>rotatePoint(p, angle));
    const greenLocal = template.green.map(p=>rotatePoint(p, angle));
    blastGeometries.push({blast:b, center, redLocal, greenLocal});
  });

  if(bounds.length){
    map.fitBounds(L.latLngBounds(bounds),{padding:[25,25]});
  }
  setTimeout(()=>map.invalidateSize(),500);
}

function viewerData(d){
  const box=document.getElementById('blastCards');
  if(!box) return;
  const active=d.blasts.filter(b=>b.enabled);
  if(!active.length){
    box.innerHTML='<div><small>Estado</small><strong>No hay voladuras activas</strong></div>';
    return;
  }
  box.innerHTML=active.map((b,i)=>`
    <div>
      <small>${i===0?'Primera voladura':'Segunda voladura'}</small>
      <strong>${b.name || '-'}</strong>
      <span>Fecha: ${d.date || '-'}</span>
      <span>Hora: ${b.time || '-'}</span>
      <span>Ángulo: ${Number(b.angle||0)}°</span>
      <span>Equipos: ${d.radiusEquipos} m / Personal: ${d.radiusPersonal} m</span>
    </div>
  `).join('');
}

function evaluar(){
  if(!userMarker || !blastGeometries.length) return;
  const ll=userMarker.getLatLng();
  let inEquipos=[], inPersonal=[];
  let nearest={name:'-', dist:Infinity};

  blastGeometries.forEach(g=>{
    const p=latLngToOffset(g.center, ll);
    const dMeters=ll.distanceTo(g.center);
    if(dMeters < nearest.dist) nearest={name:g.blast.name, dist:dMeters};
    if(pointInPolygon(p, g.redLocal)){
      inEquipos.push(g.blast.name);
    }else if(pointInPolygon(p, g.greenLocal)){
      inPersonal.push(g.blast.name);
    }
  });

  const res=document.getElementById('resultado'), det=document.getElementById('detalle');
  res.className='resultado';

  if(inEquipos.length){
    res.classList.add('peligro');
    res.textContent='🔴 DENTRO DEL SECTOR DE RIESGO PARA EQUIPOS';
    det.textContent='Voladura(s): '+inEquipos.join(', ')+'. Distancia al punto más cercano: '+Math.round(nearest.dist)+' m.';
  }else if(inPersonal.length){
    res.classList.add('peligro');
    res.textContent='🔴 DENTRO DEL RADIO DE EVACUACIÓN DE PERSONAL';
    det.textContent='Voladura(s): '+inPersonal.join(', ')+'. Distancia al punto más cercano: '+Math.round(nearest.dist)+' m.';
  }else{
    res.classList.add('ok');
    res.textContent='🟢 FUERA DE LOS RADIOS ACTIVOS';
    det.textContent='Distancia al punto de voladura más cercano ('+nearest.name+'): '+Math.round(nearest.dist)+' m.';
  }
}

function gps(){
  if(!navigator.geolocation){alert('Tu navegador no soporta GPS.');return}
  document.getElementById('resultado').className='resultado neutral';
  document.getElementById('resultado').textContent='Buscando ubicación GPS...';
  navigator.geolocation.getCurrentPosition(pos=>{
    const ll=L.latLng(pos.coords.latitude,pos.coords.longitude);
    if(userMarker)map.removeLayer(userMarker);
    userMarker=L.circleMarker(ll,{radius:9,color:'#2563eb',fillColor:'#2563eb',fillOpacity:.95}).addTo(map).bindPopup('Mi ubicación GPS').openPopup();
    evaluar();
    const layers=[userMarker,...mapLayers];
    if(layers.length) map.fitBounds(L.featureGroup(layers).getBounds(),{padding:[35,35]});
    document.getElementById('map').scrollIntoView({behavior:'smooth',block:'center'});
  },err=>{
    document.getElementById('resultado').className='resultado peligro';
    document.getElementById('resultado').textContent='No se pudo obtener la ubicación.';
    document.getElementById('detalle').textContent='Revisa permisos de GPS y HTTPS.';
  },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}

function adminData(){
  return normalizeData({
    eventName:document.getElementById('eventName').value,
    zone:Number(document.getElementById('zone').value),
    hemisphere:document.getElementById('hemisphere').value,
    radiusEquipos:Number(document.getElementById('radiusEquipos').value),
    radiusPersonal:Number(document.getElementById('radiusPersonal').value),
    date:document.getElementById('date').value,
    blasts:[
      {
        enabled:document.getElementById('b1Enabled').checked,
        name:document.getElementById('b1Name').value,
        utmX:Number(document.getElementById('b1UtmX').value),
        utmY:Number(document.getElementById('b1UtmY').value),
        time:document.getElementById('b1Time').value,
        angle:Number(document.getElementById('b1Angle').value)
      },
      {
        enabled:document.getElementById('b2Enabled').checked,
        name:document.getElementById('b2Name').value,
        utmX:Number(document.getElementById('b2UtmX').value),
        utmY:Number(document.getElementById('b2UtmY').value),
        time:document.getElementById('b2Time').value,
        angle:Number(document.getElementById('b2Angle').value)
      }
    ]
  });
}

function setAdminDefaults(){
  const d=normalizeData(DEFAULT_DATA);
  currentData=d;
  document.getElementById('eventName').value=d.eventName;
  document.getElementById('zone').value=d.zone;
  document.getElementById('hemisphere').value=d.hemisphere;
  document.getElementById('radiusEquipos').value=d.radiusEquipos;
  document.getElementById('radiusPersonal').value=d.radiusPersonal;
  document.getElementById('date').value=new Date().toISOString().slice(0,10);

  d.blasts.forEach((b,i)=>{
    const n=i+1;
    document.getElementById(`b${n}Enabled`).checked=b.enabled;
    document.getElementById(`b${n}Name`).value=b.name;
    document.getElementById(`b${n}UtmX`).value=b.utmX;
    document.getElementById(`b${n}UtmY`).value=b.utmY;
    document.getElementById(`b${n}Time`).value=b.time;
    document.getElementById(`b${n}Angle`).value=b.angle;
  });
}

function preview(){
  currentData=adminData();
  drawData(currentData);
}

function dateRoute(){
  const f=document.getElementById('date').value||new Date().toISOString().slice(0,10);
  return f.replaceAll('-','');
}

function generateLink(){
  currentData=adminData();
  drawData(currentData);
  const base=new URL('index.html', window.location.href).href.split('#')[0].split('?')[0];
  document.getElementById('publicLink').value=base+'?v='+dateRoute()+'#data='+enc(currentData);
}

async function copyLink(){
  const val=document.getElementById('publicLink').value;
  if(!val){alert('Primero genera el enlace.');return}
  try{await navigator.clipboard.writeText(val);alert('Enlace copiado.')}
  catch(e){alert('Copia manualmente el enlace.')}
}

function boot(){
  initMap();
  if(document.body.dataset.mode==='admin'){
    setAdminDefaults();
    drawData(currentData);
    document.getElementById('btnPreview').addEventListener('click',preview);
    document.getElementById('btnGenerate').addEventListener('click',generateLink);
    document.getElementById('btnCopy').addEventListener('click',copyLink);
  }else{
    currentData=dataFromHash();
    viewerData(currentData);
    drawData(currentData);
    document.getElementById('btnGPS').addEventListener('click',gps);
  }
}

window.addEventListener('load',boot);
window.addEventListener('resize',()=>map&&map.invalidateSize());
