// Radio de Voladura UNACEM V20
// Contorno final validado: geometría paramétrica de radio rojo 150 y verde 300.
// Los 37° se usan solo como referencia técnica interna para los laterales.

let map, layer, gpsMarker;
let currentPolygons = [];

const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom: 20});
const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {maxZoom: 20});

function arc(cx, cy, r, a1, a2, steps){
  const pts = [];
  const start = a1 * Math.PI / 180;
  const end = a2 * Math.PI / 180;
  for(let i=0;i<=steps;i++){
    const t = start + (end-start) * i / steps;
    pts.push([cx + r*Math.cos(t), cy + r*Math.sin(t)]);
  }
  return pts;
}

function rotatePoint(x,y,deg){
  const a = deg * Math.PI/180;
  return [x*Math.cos(a)-y*Math.sin(a), x*Math.sin(a)+y*Math.cos(a)];
}

function metersToLatLng(dx,dy,lat0,lng0){
  const R = 6378137;
  const lat = lat0 + (dy/R) * 180/Math.PI;
  const lng = lng0 + (dx/(R*Math.cos(lat0*Math.PI/180))) * 180/Math.PI;
  return [lat,lng];
}

function localToGeo(points, lat, lng, angle){
  return points.map(p => {
    const r = rotatePoint(p[0], p[1], angle);
    return metersToLatLng(r[0], r[1], lat, lng);
  });
}

// CONTORNO VERDE V20
// Base: radio 300 con sector superior abierto y círculo inferior completo conectado.
function greenTemplate(r=300){
  const cutA = 142; // controla intersección lateral
  const cutB = 38;
  const lower = arc(0,0,r,cutA,360+cutB,100);
  const top = arc(0,0,r,cutB,cutA,70);
  return [...lower, ...top];
}

// CONTORNO ROJO V20
// Base: radio 150, ampliado hacia la parte superior hasta alcanzar la línea de intersección del radio 300.
// Mantiene el arco inferior circular y laterales rectos.
function redTemplate(r=150, re=300){
  const sideAngleLeft = 142;
  const sideAngleRight = 38;

  const bottom = arc(0,0,r,270,90,70); // arco inferior circular radio 150, por lado derecho
  const topR = r * 1.18;
  const topCy = r * 0.18;
  const top = arc(0, topCy, topR, sideAngleRight, sideAngleLeft, 70);

  // Une el arco superior con el arco inferior por laterales rectos.
  const rightLower = [r*Math.cos(sideAngleRight*Math.PI/180), r*Math.sin(sideAngleRight*Math.PI/180)];
  const leftLower = [r*Math.cos(sideAngleLeft*Math.PI/180), r*Math.sin(sideAngleLeft*Math.PI/180)];

  return [
    ...bottom,
    ...top,
    leftLower
  ];
}

function dataFromInputs(){
  return [1,2].map(n => ({
    id:n,
    name:`Voladura ${n}`,
    lat: parseFloat(document.getElementById(`v${n}_lat`)?.value ?? (n===1?-12.043567:-12.048)),
    lng: parseFloat(document.getElementById(`v${n}_lng`)?.value ?? -76.870123),
    angle: parseFloat(document.getElementById(`v${n}_ang`)?.value ?? (n===1?15:195)),
    rp: parseFloat(document.getElementById(`v${n}_rp`)?.value ?? 150),
    re: parseFloat(document.getElementById(`v${n}_re`)?.value ?? 300),
    estado: document.getElementById(`v${n}_estado`)?.value ?? "Programada"
  }));
}

function dataFromHash(){
  try{
    if(location.hash.startsWith("#data=")){
      return JSON.parse(decodeURIComponent(escape(atob(location.hash.replace("#data=","")))));
    }
  }catch(e){}
  return [
    {id:1,name:"Voladura 1",lat:-12.043567,lng:-76.870123,angle:15,rp:150,re:300,estado:"Programada"},
    {id:2,name:"Voladura 2",lat:-12.048,lng:-76.870123,angle:195,rp:150,re:300,estado:"Programada"}
  ];
}

function draw(data){
  layer.clearLayers();
  currentPolygons = [];
  const bounds = [];

  data.forEach(v => {
    const green = localToGeo(greenTemplate(v.re), v.lat, v.lng, v.angle);
    const red = localToGeo(redTemplate(v.rp, v.re), v.lat, v.lng, v.angle);

    L.polygon(green, {
      color:"#ffffff",
      weight:2,
      fillColor:"#23b83f",
      fillOpacity:.74
    }).addTo(layer).bindPopup(`<b>${v.name}</b><br>Radio evacuación personal: ${v.re} m`);

    L.polygon(red, {
      color:"#ffffff",
      weight:2,
      fillColor:"#f02118",
      fillOpacity:.82
    }).addTo(layer).bindPopup(`<b>${v.name}</b><br>Sector riesgo equipos: ${v.rp} m`);

    const dir = localToGeo([[0,-v.re],[0,v.re]], v.lat, v.lng, v.angle);
    L.polyline(dir, {color:"#111",weight:2,dashArray:"8,7"}).addTo(layer);

    L.marker([v.lat,v.lng]).addTo(layer).bindPopup(`<b>${v.name}</b><br>${v.estado}`);

    currentPolygons.push({type:"red", name:v.name, points:red});
    currentPolygons.push({type:"green", name:v.name, points:green});
    green.concat(red).forEach(p=>bounds.push(p));
  });

  if(bounds.length) map.fitBounds(bounds, {padding:[30,30]});
}

function initMap(){
  map = L.map("map").setView([-12.045,-76.870123],15);
  sat.addTo(map);
  layer = L.layerGroup().addTo(map);

  map.on("mousemove", e => {
    const lat = document.getElementById("latInfo");
    const lng = document.getElementById("lngInfo");
    if(lat) lat.textContent = e.latlng.lat.toFixed(6);
    if(lng) lng.textContent = e.latlng.lng.toFixed(6);
  });

  const satBtn = document.getElementById("satBtn");
  const mapBtn = document.getElementById("mapBtn");
  if(satBtn && mapBtn){
    satBtn.onclick=()=>{map.removeLayer(osm);sat.addTo(map);satBtn.classList.add("active");mapBtn.classList.remove("active")};
    mapBtn.onclick=()=>{map.removeLayer(sat);osm.addTo(map);mapBtn.classList.add("active");satBtn.classList.remove("active")};
  }
}

function iniciarAdmin(){ initMap(); draw(dataFromInputs()); }
function iniciarUsuario(){ initMap(); draw(dataFromHash()); }
function actualizar(){ draw(dataFromInputs()); }

function generarEnlace(){
  const data = dataFromInputs();
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  const base = location.href.replace("admin.html","usuario.html").split("#")[0];
  document.getElementById("shareLink").value = base + "#data=" + encoded;
}

function pointInPolygon(point, vs){
  const x = point[1], y = point[0];
  let inside = false;
  for(let i=0,j=vs.length-1;i<vs.length;j=i++){
    const xi=vs[i][1], yi=vs[i][0];
    const xj=vs[j][1], yj=vs[j][0];
    const intersect = ((yi>y)!=(yj>y)) && (x < (xj-xi)*(y-yi)/((yj-yi)||1e-12)+xi);
    if(intersect) inside = !inside;
  }
  return inside;
}

function activarGPS(){
  const status = document.getElementById("estadoGPS");
  if(!navigator.geolocation){
    status.className="gps danger"; status.textContent="El navegador no soporta GPS.";
    return;
  }
  navigator.geolocation.watchPosition(pos=>{
    const lat=pos.coords.latitude, lng=pos.coords.longitude;
    if(!gpsMarker) gpsMarker=L.marker([lat,lng]).addTo(layer).bindPopup("Mi ubicación");
    else gpsMarker.setLatLng([lat,lng]);

    let red=false, green=false;
    currentPolygons.forEach(poly=>{
      if(pointInPolygon([lat,lng], poly.points)){
        if(poly.type==="red") red=true;
        if(poly.type==="green") green=true;
      }
    });

    if(red){ status.className="gps danger"; status.textContent="ALERTA: Usted está dentro del sector rojo de riesgo."; }
    else if(green){ status.className="gps warn"; status.textContent="Atención: Usted está dentro del radio verde de evacuación."; }
    else { status.className="gps safe"; status.textContent="Usted está fuera del radio de voladura."; }
  }, err=>{
    status.className="gps danger"; status.textContent="No se pudo activar GPS: "+err.message;
  }, {enableHighAccuracy:true, maximumAge:5000});
}
