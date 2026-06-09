let map, userMarker, currentData = null;
let layers = [];

const DEFAULT_DATA = {
  eventName:'Voladuras Atocongo',
  zone:18,
  hemisphere:'S',
  date:'2026-06-02',
  time:'12:45',
  blasts:[
    {enabled:true, name:'Primera voladura', utmX:292925.533, utmY:8651156.600, angle:0},
    {enabled:false, name:'Segunda voladura', utmX:292925.533, utmY:8651156.600, angle:180}
  ]
};

/*
  PLANTILLA GEOMÉTRICA V18
  La geometría se construye como plantilla CAD compuesta:
  - Sector rojo: dos arcos R=300 unidos por brazos rectos.
  - Sector verde: dos arcos R=500 unidos por los mismos brazos.
  - Rotación: se aplica sobre toda la plantilla, sin deformarla.
*/
const R_EQUIPOS = 300;
const R_PERSONAL = 500;
const HALF_ANGLE = 53;       // equivalente a brazos a 37° respecto al eje vertical
const ARC_STEPS = 220;       // alto detalle para evitar forma tipo octágono

function enc(obj){return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function dec(str){str=str.replace(/-/g,'+').replace(/_/g,'/');while(str.length%4)str+='=';return JSON.parse(decodeURIComponent(escape(atob(str))))}
function dataFromHash(){try{const m=(location.hash||'').match(/data=([^&]+)/);return m?dec(m[1]):DEFAULT_DATA}catch(e){return DEFAULT_DATA}}

function utmToLatLon(E,N,Z,H){
  const a=6378137,e=0.00669438,k=0.9996,ep=e/(1-e),e1=(1-Math.sqrt(1-e))/(1+Math.sqrt(1-e));
  let x=E-500000,y=N;if(H==='S')y-=10000000;
  const lo=(Z-1)*6-180+3,M=y/k,mu=M/(a*(1-e/4-3*e*e/64-5*Math.pow(e,3)/256));
  const p=mu+(3*e1/2-27*Math.pow(e1,3)/32)*Math.sin(2*mu)+(21*e1*e1/16-55*Math.pow(e1,4)/32)*Math.sin(4*mu)+(151*Math.pow(e1,3)/96)*Math.sin(6*mu);
  const n=a/Math.sqrt(1-e*Math.sin(p)**2),T=Math.tan(p)**2,C=ep*Math.cos(p)**2,R=a*(1-e)/Math.pow(1-e*Math.sin(p)**2,1.5),D=x/(n*k);
  let lat=p-(n*Math.tan(p)/R)*(D**2/2-(5+3*T+10*C-4*C**2-9*ep)*D**4/24+(61+90*T+298*C+45*T**2-252*ep-3*C**2)*D**6/720);
  lat=lat*180/Math.PI;
  let lon=(D-(1+2*T+C)*D**3/6+(5-2*C+28*T-3*C**2+8*ep+24*T**2)*D**5/120)/Math.cos(p);
  lon=lo+lon*180/Math.PI;
  return [lat,lon]
}

function offsetLatLng(center,east,north){
  const latRad=center.lat*Math.PI/180;
  return L.latLng(center.lat + north/111320, center.lng + east/(111320*Math.cos(latRad)));
}

// Bearing: 0° hacia Norte, positivo horario.
function polar(radius,bearingDeg){
  const a=bearingDeg*Math.PI/180;
  return {x:radius*Math.sin(a), y:radius*Math.cos(a)};
}

function rotateLocal(p,deg){
  const a=deg*Math.PI/180; // horario
  return {x:p.x*Math.cos(a)+p.y*Math.sin(a), y:-p.x*Math.sin(a)+p.y*Math.cos(a)};
}

function arc(radius,startDeg,endDeg,steps){
  const pts=[];
  for(let i=0;i<=steps;i++){
    const t=startDeg+(endDeg-startDeg)*i/steps;
    pts.push(polar(radius,t));
  }
  return pts;
}

function templatePolygon(radius,angleDeg){
  // Forma base vertical, luego rotada.
  // 1) Arco superior de -53° a +53°
  // 2) Línea recta hacia arco inferior
  // 3) Arco inferior de 180+53° a 180-53° (sentido correcto)
  // 4) Línea recta de cierre
  const top=arc(radius,-HALF_ANGLE,HALF_ANGLE,ARC_STEPS);
  const bottom=arc(radius,180+HALF_ANGLE,180-HALF_ANGLE,ARC_STEPS);
  return [...top,...bottom].map(p=>rotateLocal(p,angleDeg));
}

function localToLatLngs(center,pts){return pts.map(p=>offsetLatLng(center,p.x,p.y))}

function initMap(){
  map=L.map('map',{zoomControl:true}).setView([-12.218,-76.923],15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:22,attribution:'&copy; OpenStreetMap'}).addTo(map);
  setTimeout(()=>map.invalidateSize(),300);
}

function activeBlasts(d){return (d.blasts||[]).filter(b=>b&&b.enabled!==false&&Number.isFinite(Number(b.utmX))&&Number.isFinite(Number(b.utmY)))}
function clearLayers(){layers.forEach(l=>map.removeLayer(l));layers=[]}

function drawData(d){
  clearLayers();
  const group=[];
  activeBlasts(d).forEach((b,idx)=>{
    const [lat,lon]=utmToLatLon(Number(b.utmX),Number(b.utmY),Number(d.zone),d.hemisphere);
    const center=L.latLng(lat,lon);
    const angle=Number(b.angle||0);

    const greenPts=localToLatLngs(center,templatePolygon(R_PERSONAL,angle));
    const redPts=localToLatLngs(center,templatePolygon(R_EQUIPOS,angle));

    const green=L.polygon(greenPts,{color:'#16a34a',weight:4,fillColor:'#16a34a',fillOpacity:.18,smoothFactor:.2}).addTo(map).bindPopup(`${b.name||'Voladura'}<br>Radio de evacuación de personal`);
    const red=L.polygon(redPts,{color:'#ff0b00',weight:4,fillColor:'#ff0b00',fillOpacity:.30,smoothFactor:.2}).addTo(map).bindPopup(`${b.name||'Voladura'}<br>Sector de riesgo para equipos`);
    const marker=L.marker(center).addTo(map).bindPopup(`${b.name||'Voladura'}<br>Ángulo: ${angle}° horario`);

    b._greenPolygon=greenPts;b._redPolygon=redPts;b._center=center;
    layers.push(green,red,marker);group.push(green,red,marker);
  });
  if(group.length)map.fitBounds(L.featureGroup(group).getBounds(),{padding:[25,25]});
  setTimeout(()=>map.invalidateSize(),500);
}

function adminData(){
  return{
    eventName:document.getElementById('eventName').value,
    zone:Number(document.getElementById('zone').value),
    hemisphere:document.getElementById('hemisphere').value,
    date:document.getElementById('date').value,
    time:document.getElementById('time').value,
    blasts:[
      {enabled:document.getElementById('v1Enabled').value==='true',name:document.getElementById('v1Name').value,utmX:Number(document.getElementById('v1UtmX').value),utmY:Number(document.getElementById('v1UtmY').value),angle:Number(document.getElementById('v1Angle').value||0)},
      {enabled:document.getElementById('v2Enabled').value==='true',name:document.getElementById('v2Name').value,utmX:Number(document.getElementById('v2UtmX').value),utmY:Number(document.getElementById('v2UtmY').value),angle:Number(document.getElementById('v2Angle').value||0)}
    ]
  }
}

function setAdminDefaults(){
  const d=DEFAULT_DATA;currentData=d;
  ['eventName','zone','date','time'].forEach(id=>document.getElementById(id).value=d[id]);
  document.getElementById('hemisphere').value=d.hemisphere;
  d.blasts.forEach((b,i)=>{const n=i+1;document.getElementById(`v${n}Enabled`).value=b.enabled?'true':'false';document.getElementById(`v${n}Name`).value=b.name;document.getElementById(`v${n}UtmX`).value=b.utmX;document.getElementById(`v${n}UtmY`).value=b.utmY;document.getElementById(`v${n}Angle`).value=b.angle;});
}

function preview(){currentData=adminData();drawData(currentData)}
function dateRoute(){const f=document.getElementById('date').value||new Date().toISOString().slice(0,10);const h=document.getElementById('time').value||'0000';return f.replaceAll('-','')+'-'+h.replace(':','')}
function generateLink(){currentData=adminData();drawData(currentData);const base=new URL('index.html',window.location.href).href.split('#')[0].split('?')[0];document.getElementById('publicLink').value=base+'?v='+dateRoute()+'#data='+enc(currentData)}
async function copyLink(){const val=document.getElementById('publicLink').value;if(!val){alert('Primero genera el enlace.');return}try{await navigator.clipboard.writeText(val);alert('Enlace copiado.')}catch(e){alert('Copia manualmente el enlace.')}}

function viewerData(d){
  document.getElementById('vEvento').textContent=d.eventName||'-';
  document.getElementById('vFechaHora').textContent=(d.date||'-')+' / '+(d.time||'-');
  const act=activeBlasts(d);
  document.getElementById('vCantidad').textContent=act.length;
  document.getElementById('blastList').innerHTML=act.map((b,i)=>`<div class="blast-item"><strong>${i+1}. ${b.name||'Voladura'}</strong><span>Ángulo: ${b.angle||0}° horario</span><span>UTM: ${Number(b.utmX).toFixed(3)}, ${Number(b.utmY).toFixed(3)}</span></div>`).join('')||'<p class="hint">No hay voladuras activas.</p>';
}

function pointInPolygon(ll,poly){
  const x=ll.lng,y=ll.lat;let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].lng,yi=poly[i].lat,xj=poly[j].lng,yj=poly[j].lat;
    const intersect=((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi);
    if(intersect)inside=!inside;
  }
  return inside;
}

function evaluar(){
  if(!userMarker||!currentData)return;
  const ll=userMarker.getLatLng();let red=[],green=[];
  activeBlasts(currentData).forEach((b,i)=>{
    if(b._redPolygon&&pointInPolygon(ll,b._redPolygon))red.push(b.name||`Voladura ${i+1}`);
    else if(b._greenPolygon&&pointInPolygon(ll,b._greenPolygon))green.push(b.name||`Voladura ${i+1}`);
  });
  const res=document.getElementById('resultado'),det=document.getElementById('detalle');res.className='resultado';
  if(red.length){res.classList.add('peligro');res.textContent='🔴 DENTRO DEL SECTOR DE RIESGO PARA EQUIPOS';det.textContent='Coincide con: '+red.join(', ');}
  else if(green.length){res.classList.add('advertencia');res.textContent='🟡 DENTRO DEL RADIO DE EVACUACIÓN DE PERSONAL';det.textContent='Coincide con: '+green.join(', ');}
  else{res.classList.add('ok');res.textContent='🟢 FUERA DE LOS RADIOS DE VOLADURA';det.textContent='Tu ubicación no intersecta las zonas activas.';}
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
    const all=[...layers,userMarker];if(all.length)map.fitBounds(L.featureGroup(all).getBounds(),{padding:[35,35]});
    document.getElementById('map').scrollIntoView({behavior:'smooth',block:'center'});
  },err=>{
    document.getElementById('resultado').className='resultado peligro';
    document.getElementById('resultado').textContent='No se pudo obtener la ubicación.';
    document.getElementById('detalle').textContent='Revisa permisos de GPS y HTTPS.';
  },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}

function boot(){
  initMap();
  if(document.body.dataset.mode==='admin'){
    document.getElementById('date').value=new Date().toISOString().slice(0,10);
    setAdminDefaults();drawData(currentData);
    document.getElementById('btnPreview').addEventListener('click',preview);
    document.getElementById('btnGenerate').addEventListener('click',generateLink);
    document.getElementById('btnCopy').addEventListener('click',copyLink);
  }else{
    currentData=dataFromHash();viewerData(currentData);drawData(currentData);
    document.getElementById('btnGPS').addEventListener('click',gps);
  }
}
window.addEventListener('load',boot);
window.addEventListener('resize',()=>map&&map.invalidateSize());
