let map, blastMarker, userMarker, circleEquipos, circlePersonal, currentData = null, selectedFile = null, selectedFileDataUrl = null;
const DEFAULT_PLAN='plano-voladura.png';
const DEFAULT_DATA={id:'demo',blastName:'Voladura Atocongo',utmX:292925.533,utmY:8651156.600,zone:18,hemisphere:'S',radiusEquipos:300,radiusPersonal:500,date:'2026-06-02',time:'12:45',planUrl:DEFAULT_PLAN,planMime:'image/png'};

function q(name){return new URLSearchParams(location.search).get(name)}
async function loadViewerData(){
  const id=q('id');
  if(!id) return DEFAULT_DATA;
  try{
    const res=await fetch('data/'+encodeURIComponent(id)+'.json?ts='+Date.now());
    if(!res.ok) throw new Error('No data');
    return await res.json();
  }catch(e){
    document.getElementById('detalle').textContent='No se pudo cargar la información de la voladura. Verifica el enlace o espera 1 a 3 minutos después de guardar.';
    return DEFAULT_DATA;
  }
}
function utmToLatLon(easting,northing,zoneNumber,hemisphere){
 const a=6378137.0,e=0.00669438,k0=0.9996,ep=e/(1-e),e1=(1-Math.sqrt(1-e))/(1+Math.sqrt(1-e));let x=easting-500000,y=northing;if(hemisphere==='S')y-=10000000;
 const lo=(zoneNumber-1)*6-180+3,M=y/k0,mu=M/(a*(1-e/4-3*e*e/64-5*Math.pow(e,3)/256));
 const p=mu+(3*e1/2-27*Math.pow(e1,3)/32)*Math.sin(2*mu)+(21*e1*e1/16-55*Math.pow(e1,4)/32)*Math.sin(4*mu)+(151*Math.pow(e1,3)/96)*Math.sin(6*mu);
 const N=a/Math.sqrt(1-e*Math.sin(p)**2),T=Math.tan(p)**2,C=ep*Math.cos(p)**2,R=a*(1-e)/Math.pow(1-e*Math.sin(p)**2,1.5),D=x/(N*k0);
 let lat=p-(N*Math.tan(p)/R)*(D**2/2-(5+3*T+10*C-4*C**2-9*ep)*D**4/24+(61+90*T+298*C+45*T**2-252*ep-3*C**2)*D**6/720);lat=lat*180/Math.PI;
 let lon=(D-(1+2*T+C)*D**3/6+(5-2*C+28*T-3*C**2+8*ep+24*T**2)*D**5/120)/Math.cos(p);lon=lo+lon*180/Math.PI;return[lat,lon]
}
function initMap(){map=L.map('map',{zoomControl:true}).setView([-12.218,-76.923],15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:22,attribution:'&copy; OpenStreetMap'}).addTo(map);setTimeout(()=>map.invalidateSize(),300)}
function drawData(d){
 const [lat,lon]=utmToLatLon(Number(d.utmX),Number(d.utmY),Number(d.zone),d.hemisphere),center=L.latLng(lat,lon);
 [blastMarker,circleEquipos,circlePersonal].forEach(l=>{if(l)map.removeLayer(l)});
 blastMarker=L.marker(center).addTo(map).bindPopup('Punto de voladura');
 circleEquipos=L.circle(center,{radius:Number(d.radiusEquipos),color:'red',fillColor:'red',fillOpacity:.16,weight:3}).addTo(map).bindPopup('Radio equipos');
 circlePersonal=L.circle(center,{radius:Number(d.radiusPersonal),color:'lime',fillColor:'lime',fillOpacity:.08,weight:3}).addTo(map).bindPopup('Radio personal');
 map.fitBounds(circlePersonal.getBounds(),{padding:[25,25]});setTimeout(()=>map.invalidateSize(),300)
}
function renderPlan(d, previewUrl){
 const box=document.getElementById('planContainer');if(!box)return;box.innerHTML='';
 const url=previewUrl || d.planUrl || DEFAULT_PLAN;
 if((d.planMime||'').includes('pdf') || url.toLowerCase().includes('.pdf')){
   const f=document.createElement('iframe');f.src=url;box.appendChild(f);
 } else {
   const img=document.createElement('img');img.src=url;img.alt='Plano de referencia';img.onerror=()=>{box.innerHTML='<p class="hint">No se pudo cargar el plano.</p>'};box.appendChild(img);
 }
}
function viewerData(d){document.getElementById('vNombre').textContent=d.blastName||'-';document.getElementById('vFechaHora').textContent=(d.date||'-')+' / '+(d.time||'-');document.getElementById('vRadioEq').textContent=(d.radiusEquipos||'-')+' m';document.getElementById('vRadioPe').textContent=(d.radiusPersonal||'-')+' m'}
function evaluar(){if(!userMarker||!circlePersonal)return;const dist=userMarker.getLatLng().distanceTo(circlePersonal.getLatLng()),re=Number(currentData.radiusEquipos),rp=Number(currentData.radiusPersonal),res=document.getElementById('resultado'),det=document.getElementById('detalle');res.className='resultado';if(dist<=rp){res.classList.add('peligro');res.textContent=dist<=re?'🔴 DENTRO DEL RADIO DE EQUIPOS':'🔴 DENTRO DEL RADIO DE PERSONAL'}else{res.classList.add('ok');res.textContent='🟢 FUERA DEL RADIO'}det.textContent='Distancia aproximada: '+Math.round(dist)+' m. Radio equipos: '+re+' m. Radio personal: '+rp+' m.'}
function gps(){if(!navigator.geolocation){alert('Tu navegador no soporta GPS.');return}document.getElementById('resultado').className='resultado neutral';document.getElementById('resultado').textContent='Buscando ubicación GPS...';navigator.geolocation.getCurrentPosition(pos=>{const ll=L.latLng(pos.coords.latitude,pos.coords.longitude);if(userMarker)map.removeLayer(userMarker);userMarker=L.circleMarker(ll,{radius:9,color:'#2563eb',fillColor:'#2563eb',fillOpacity:.95}).addTo(map).bindPopup('Mi ubicación GPS').openPopup();evaluar();map.fitBounds(L.featureGroup([blastMarker,userMarker,circlePersonal]).getBounds(),{padding:[35,35]});document.getElementById('map').scrollIntoView({behavior:'smooth',block:'center'})},err=>{document.getElementById('resultado').className='resultado peligro';document.getElementById('resultado').textContent='No se pudo obtener la ubicación.';document.getElementById('detalle').textContent='Revisa permisos de GPS y HTTPS.'},{enableHighAccuracy:true,timeout:15000,maximumAge:0})}

function adminData(id, planPath, planMime){return{id:id||'',blastName:document.getElementById('blastName').value,utmX:Number(document.getElementById('utmX').value),utmY:Number(document.getElementById('utmY').value),zone:Number(document.getElementById('zone').value),hemisphere:document.getElementById('hemisphere').value,radiusEquipos:Number(document.getElementById('radiusEquipos').value),radiusPersonal:Number(document.getElementById('radiusPersonal').value),date:document.getElementById('date').value,time:document.getElementById('time').value,planUrl:planPath||DEFAULT_PLAN,planMime:planMime||'image/png'}}
function setAdminDefaults(){const d=DEFAULT_DATA;currentData=d;['blastName','utmX','utmY','zone','radiusEquipos','radiusPersonal','date','time'].forEach(id=>document.getElementById(id).value=d[id]);document.getElementById('hemisphere').value=d.hemisphere}
function preview(){currentData=adminData('', selectedFileDataUrl||DEFAULT_PLAN, selectedFile?selectedFile.type:'image/png');drawData(currentData);renderPlan(currentData, selectedFileDataUrl)}
function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(file)})}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file)})}
function safeExt(file){const n=file.name.toLowerCase();if(n.endsWith('.pdf'))return 'pdf';if(n.endsWith('.png'))return 'png';if(n.endsWith('.webp'))return 'webp';return 'jpg'}
function makeId(){const d=new Date();const p=n=>String(n).padStart(2,'0');return 'vol-'+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes())+p(d.getSeconds())}
async function githubPut(owner,repo,branch,path,contentB64,token,message){
 const url='https://api.github.com/repos/'+owner+'/'+repo+'/contents/'+path;
 const body={message,content:contentB64,branch};
 const res=await fetch(url,{method:'PUT',headers:{'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!res.ok){const t=await res.text();throw new Error(t)}
 return await res.json();
}
async function saveAndGenerate(){
 const owner=document.getElementById('ghOwner').value.trim(),repo=document.getElementById('ghRepo').value.trim(),branch=document.getElementById('ghBranch').value.trim(),token=document.getElementById('ghToken').value.trim();
 const status=document.getElementById('saveStatus');status.textContent='Guardando...';
 if(!owner||!repo||!branch||!token){alert('Completa usuario, repositorio, rama y token.');status.textContent='';return}
 if(!selectedFile){alert('Selecciona el plano PDF/JPG/PNG.');status.textContent='';return}
 const id=makeId(), ext=safeExt(selectedFile), assetPath='assets/'+id+'.'+ext, dataPath='data/'+id+'.json';
 try{
   const fileB64=await fileToBase64(selectedFile);
   await githubPut(owner,repo,branch,assetPath,fileB64,token,'Subir plano '+id);
   const d=adminData(id,assetPath,selectedFile.type);
   const jsonB64=btoa(unescape(encodeURIComponent(JSON.stringify(d,null,2))));
   await githubPut(owner,repo,branch,dataPath,jsonB64,token,'Crear datos '+id);
   const base=location.href.replace(/admin\.html.*/,'index.html').replace(/\?.*/,'').replace(/\#.*/,'');
   const link=base+'?id='+encodeURIComponent(id);
   document.getElementById('publicLink').value=link;
   status.textContent='Listo. GitHub Pages puede demorar 1 a 3 minutos en mostrar la voladura.';
 }catch(e){
   console.error(e); status.textContent='Error al guardar. Revisa token/permisos o conexión.';
   alert('No se pudo guardar en GitHub. Revisa que el token tenga permiso de escritura del repositorio.');
 }
}
async function copyLink(){const val=document.getElementById('publicLink').value;if(!val){alert('Primero guarda y genera el enlace.');return}try{await navigator.clipboard.writeText(val);alert('Enlace copiado.')}catch(e){alert('Copia manualmente el enlace.')}}
async function handleFile(e){selectedFile=e.target.files[0]; if(!selectedFile)return; selectedFileDataUrl=await fileToDataUrl(selectedFile); preview()}
async function boot(){initMap();if(document.body.dataset.mode==='admin'){document.getElementById('date').value=new Date().toISOString().slice(0,10);setAdminDefaults();drawData(currentData);renderPlan(currentData);document.getElementById('planFile').addEventListener('change',handleFile);document.getElementById('btnPreview').addEventListener('click',preview);document.getElementById('btnSave').addEventListener('click',saveAndGenerate);document.getElementById('btnCopy').addEventListener('click',copyLink)}else{currentData=await loadViewerData();viewerData(currentData);drawData(currentData);renderPlan(currentData);document.getElementById('btnGPS').addEventListener('click',gps)}}
window.addEventListener('load',boot);window.addEventListener('resize',()=>map&&map.invalidateSize())