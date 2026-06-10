// Plantillas geométricas del contorno real UNACEM.
// Coordenadas locales en metros, centro = (0,0), eje Y = línea de perforación.
// Se escalan según radio configurado y se rotan según ángulo de giro.

const TEMPLATE_PERSONAS_150 = [
  [-90, 120], [-240, 320], [-155, 410], [0, 450],
  [155, 410], [240, 320], [90, 120], [150, -150],
  [0, -300], [-150, -150]
];

const TEMPLATE_EQUIPOS_300 = [
  [-180, 240], [-420, 560], [-260, 700], [0, 730],
  [260, 700], [420, 560], [180, 240], [300, -300],
  [0, -600], [-300, -300]
];

function rotatePoint(x, y, degrees){
  const a = degrees * Math.PI / 180;
  return [
    x * Math.cos(a) - y * Math.sin(a),
    x * Math.sin(a) + y * Math.cos(a)
  ];
}

function scaleTemplate(template, targetRadius, baseRadius){
  const k = targetRadius / baseRadius;
  return template.map(p => [p[0] * k, p[1] * k]);
}

// Conversión simplificada UTM referencial a Lat/Lng para zona 18S.
// Para producción con precisión topográfica, reemplazar por proj4js.
function utmToLatLng(easting, northing){
  const lat0 = -12.0;
  const lng0 = -76.95;
  const e0 = 368000;
  const n0 = 8678000;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(lat0 * Math.PI / 180);
  const lat = lat0 + (northing - n0) / metersPerDegLat;
  const lng = lng0 + (easting - e0) / metersPerDegLng;
  return [lat, lng];
}

function localMetersToLatLng(centerLat, centerLng, dx, dy){
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(centerLat * Math.PI / 180);
  return [
    centerLat + dy / metersPerDegLat,
    centerLng + dx / metersPerDegLng
  ];
}

function buildContour(template, baseRadius, targetRadius, centerEste, centerNorte, angle){
  const center = utmToLatLng(centerEste, centerNorte);
  const scaled = scaleTemplate(template, targetRadius, baseRadius);
  return scaled.map(([x,y]) => {
    const [xr, yr] = rotatePoint(x, y, angle);
    return localMetersToLatLng(center[0], center[1], xr, yr);
  });
}

function polygonContains(point, polygon){
  const x = point[1], y = point[0];
  let inside = false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const xi=polygon[i][1], yi=polygon[i][0];
    const xj=polygon[j][1], yj=polygon[j][0];
    const intersect=((yi>y)!=(yj>y))&&(x < (xj-xi)*(y-yi)/((yj-yi)||1e-12)+xi);
    if(intersect) inside=!inside;
  }
  return inside;
}
