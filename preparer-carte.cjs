/* Facultatif : après avoir modifié v3/data/pays.geojson, lancer depuis la racine :
   node v3/preparer-carte.cjs
   Aucune installation npm n'est nécessaire.
   Le fichier .js est une copie locale du GeoJSON lisible même en ouverture file://. */
const fs = require('node:fs');
const path = require('node:path');
const folder = path.join(__dirname,'data');
const collection = JSON.parse(fs.readFileSync(path.join(folder,'pays.geojson'),'utf8'));
if (collection.type!=='FeatureCollection'||!Array.isArray(collection.features)) {
  throw new Error('Le fichier doit être une FeatureCollection GeoJSON.');
}
fs.writeFileSync(path.join(folder,'pays-geojson.js'),
  '// Copie de pays.geojson pour fonctionner aussi sans serveur local.\nwindow.WORLD_GEOJSON = '+JSON.stringify(collection)+';\n');
console.log('Carte mise à jour : '+collection.features.length+' objets géographiques.');
