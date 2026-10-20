/* V3 / Carte : les pays sont des objets GeoJSON et non des chemins SVG écrits à la main.
   D3 calcule la projection et fitExtent adapte le cadrage à la taille réelle de l'écran.
   Polygon Clipping retire les territoires hors de la fenêtre géographique du continent. */
(function () {
  'use strict';
  const REGIONS = {
    europe:   { bounds: [-26, 33, 62, 82], center: [18, 54], type: 'conic' },
    asie:     { bounds: [25, -12, 180, 82], center: [100, 33], type: 'equal' },
    afrique:  { bounds: [-27, -36, 65, 39], center: [19, 0], type: 'mercator' },
    amerique: { bounds: [-180, -57, -30, 84], center: [-95, 15], type: 'equal' },
    oceanie:  { bounds: [110, -56, 210, 29], center: [160, -14], type: 'equal', pacific: true }
  };
  const makeCollection = features => ({type:'FeatureCollection',features});
  const byCode = new Map(COUNTRIES_V3.map(c => [c.code, c]));
  const cache = new Map();
  let mode = 'monde', found = new Set(), revealed = false;
  let width = 0, height = 0, projection, path, zoom, zoomLayer;
  const svg = d3.select('#worldMap');
  const viewport = document.getElementById('mapViewport');
  const tooltip = document.getElementById('mapTooltip');

  // Les données sont découpées en longitude/latitude AVANT d'être projetées.
  function cropFeature(feature, region) {
    const g = feature.geometry;
    if (!g || !['Polygon', 'MultiPolygon'].includes(g.type)) return null;
    const polygons = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    const shift = point => [region.pacific && point[0] < 0 ? point[0]+360 : point[0], point[1]];
    const shifted = polygons.map(poly => poly.map(ring => ring.map(shift))).filter(poly=>{
      // Après recentrage Pacifique, un polygone qui traverse Greenwich peut
      // artificiellement couvrir 350° de longitude : il est hors de cette vue.
      if (!region.pacific) return true;
      const xs=poly[0].map(point=>point[0]);
      return Math.max(...xs)-Math.min(...xs)<=180;
    });
    if (!shifted.length) return null;
    const [west, south, east, north] = region.bounds;
    const rectangle = [[[west,south],[east,south],[east,north],[west,north],[west,south]]];
    const clipped = polygonClipping.intersection(shifted, rectangle);
    if (!clipped.length) return null;
    // Polygon Clipping renvoie des anneaux antihoraires, D3 attend l'inverse.
    const coordinates = clipped.map(poly => poly.map(ring => ring.slice().reverse().map(([x,y]) => [x>180?x-360:x,y])));
    return { ...feature, geometry: {type:'MultiPolygon',coordinates} };
  }

  function featuresForMode() {
    if (mode === 'monde') return WORLD_GEOJSON.features;
    if (!cache.has(mode)) {
      const region = REGIONS[mode];
      cache.set(mode, WORLD_GEOJSON.features.map(f => cropFeature(f,region)).filter(Boolean));
    }
    return cache.get(mode);
  }

  function inWindow(point) {
    if (mode === 'monde') return true;
    const region = REGIONS[mode];
    const x = region.pacific && point[0]<0 ? point[0]+360 : point[0];
    const [w,s,e,n] = region.bounds;
    return x>=w && x<=e && point[1]>=s && point[1]<=n;
  }

  function isActive(feature) {
    const country = byCode.get(feature.id);
    return !!country && (mode === 'monde' || country.continent === mode);
  }

  function countryClass(feature, marker) {
    const classes = [marker ? 'country-marker' : 'land'];
    if (!isActive(feature)) classes.push('context');
    else if (found.has(feature.id)) classes.push('is-found');
    else if (revealed) classes.push('is-missing');
    return classes.join(' ');
  }

  function showTooltip(event, feature) {
    if (found.has(feature.id) || revealed) {
      tooltip.textContent = byCode.get(feature.id)?.name || feature.properties.name;
    } else {
      tooltip.textContent = isActive(feature) ? 'Un pays à retrouver' : 'Hors du quiz de cette région';
    }
    tooltip.hidden = false;
  }

  function render() {
    const rect = viewport.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    width = rect.width;
    height = rect.height;
    tooltip.hidden=true;
    const features = featuresForMode();
    if (mode === 'monde') {
      projection = d3.geoNaturalEarth1();
      projection.fitExtent([[20,24],[width-20,height-24]], {type:'Sphere'});
    } else {
      const region = REGIONS[mode];
      if (region.type === 'conic') {
        projection = d3.geoConicConformal().parallels([40,65]).rotate([-region.center[0],0]).center([0,region.center[1]]);
      } else if (region.type === 'mercator') {
        projection = d3.geoMercator().rotate([-region.center[0],0]).center([0,region.center[1]]);
      } else {
        projection = d3.geoAzimuthalEqualArea().rotate([-region.center[0],-region.center[1]]).clipAngle(179);
      }
      const focus = features.filter(f => isActive(f) || (mode==='asie' && f.id==='RU') || (mode==='amerique' && f.id==='GL'));
      // Les points des petits pays participent aussi au cadrage.
      const points = COUNTRIES_V3.filter(c => c.continent === mode && inWindow(c.coordinates)).map(c => ({type:'Feature',geometry:{type:'Point',coordinates:c.coordinates},properties:{}}));
      projection.fitExtent([[24,24],[width-24,height-24]],makeCollection([...focus,...points]));
    }
    projection.precision(.25);
    path = d3.geoPath(projection);
    svg.attr('viewBox',`0 0 ${width} ${height}`);
    svg.selectAll('g').remove();
    zoomLayer = svg.append('g').attr('class','map-layer');
    const grid = d3.geoGraticule().step([30,30]);
    if (mode === 'monde') zoomLayer.append('path').datum(grid()).attr('class','graticule').attr('d',path);
    zoomLayer.append('g').attr('class','countries')
      .selectAll('path').data(features).join('path')
      .attr('class',f=>countryClass(f,false)).attr('data-code',f=>f.id).attr('d',path)
      .on('pointerenter',showTooltip).on('pointerleave',()=>{tooltip.hidden=true;});

    const visible = new Map(features.filter(isActive).map(f => [f.id,f]));
    const markerFeatures = COUNTRIES_V3
      .filter(c => (mode==='monde' || c.continent===mode) && inWindow(c.coordinates))
      .filter(c => !visible.has(c.code) || path.area(visible.get(c.code)) < 22)
      .map(c => ({id:c.code,properties:{label:c.coordinates,name:c.name}}));
    zoomLayer.append('g').attr('class','island-markers')
      .selectAll('circle').data(markerFeatures).join('circle')
      .attr('class',f=>countryClass(f,true)).attr('data-code',f=>f.id)
      .attr('cx',f=>projection(f.properties.label)[0]).attr('cy',f=>projection(f.properties.label)[1]).attr('r',3.4)
      .on('pointerenter',showTooltip).on('pointerleave',()=>{tooltip.hidden=true;});

    zoom = d3.zoom().scaleExtent([1,7]).extent([[0,0],[width,height]])
      .translateExtent([[-width*.2,-height*.2],[width*1.2,height*1.2]])
      .on('zoom',event=>{
        zoomLayer.attr('transform',event.transform);
        zoomLayer.selectAll('circle').attr('r',3.4/event.transform.k).attr('stroke-width',1.3/event.transform.k);
      });
    svg.call(zoom).on('dblclick.zoom',null).call(zoom.transform,d3.zoomIdentity);
    svg.select('title').text(`Carte ${mode === 'monde' ? 'du monde' : 'de la région'}, ${found.size} pays trouvés. Les noms des pays non trouvés sont masqués.`);
    viewport.dataset.mode = mode;
  }

  function recolor() {
    if (!zoomLayer) return;
    zoomLayer.selectAll('.land').attr('class',f=>countryClass(f,false));
    zoomLayer.selectAll('circle').attr('class',f=>countryClass(f,true));
    svg.select('title').text(`Carte de la région : ${found.size} pays trouvés.`);
  }

  document.getElementById('zoomIn').addEventListener('click',()=>{if (zoom) svg.call(zoom.scaleBy,1.45);});
  document.getElementById('zoomOut').addEventListener('click',()=>{if (zoom) svg.call(zoom.scaleBy,1/1.45);});
  document.getElementById('fitMap').addEventListener('click',()=>{if (zoom) svg.call(zoom.transform,d3.zoomIdentity);});
  let resizeFrame;
  new ResizeObserver(()=>{
    cancelAnimationFrame(resizeFrame);
    resizeFrame=requestAnimationFrame(render);
  }).observe(viewport);

  window.QuizMap = {
    setMode(next) { mode=next;found=new Set();revealed=false;viewport.classList.toggle('regional',mode!=='monde');render(); },
    setProgress(codes,reveal=false) {found=new Set(codes);revealed=reveal;recolor();},
    refresh:render,
    inspect() {
      const features=featuresForMode().filter(isActive);
      return {mode,width,height,activeGeometries:features.length,markers:svg.selectAll('circle').size(),
        bounds:features.map(f=>({code:f.id,bounds:path.bounds(f)}))};
    }
  };
})();
