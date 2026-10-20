# Pays du Monde : version 3

Cette version fait évoluer le quiz sans supprimer les fichiers des versions précédentes. Son point d’entrée est **index3.html**. Le jeu reste en HTML, CSS et JavaScript, sans serveur applicatif et sans compte utilisateur.

## Ajouter la V3 sur GitHub Pages

1. Décompresser `Pays-du-Monde-V3-GitHub.zip` sur l’ordinateur.
2. Ouvrir le dépôt <https://github.com/Lena411/PaysduMonde>.
3. Choisir **Add file → Upload files**.
4. Déposer **les fichiers décompressés** : `index3.html`, le dossier entier `v3/` et `README-V3.md`. Ne pas déposer seulement l’archive ZIP, ni un dossier parent contenant ces fichiers.
5. Valider avec **Commit changes**, puis attendre la fin du déploiement Pages.
6. Ouvrir directement <https://lena411.github.io/PaysduMonde/index3.html>.

Le ZIP ne contient volontairement **aucun index.html, index0.html ou index1.html**. Il ne remplace donc ni la page d’accueil ni les anciennes versions. Il n’y a pas de fichier index2.html : le nom index3.html est celui demandé pour cette V3.

Le lien ci-dessus est l’adresse à utiliser **après** avoir ajouté ces fichiers. La génération de ce ZIP ne modifie pas automatiquement le dépôt GitHub.

## Les versions, pour montrer l’évolution

| Étape | Page | Évolution |
|---|---|---|
| V1 | `index0.html` si conservé dans le dépôt | Quiz initial, carte SVG, saisie, pays colorés, compteur. |
| V2 | `index1.html` si conservé dans le dépôt | Fond bleu clair, niveaux, indices, compteur des pays restants. |
| V3 | `index3.html` | Responsive, fenêtre de règles, compte à rebours, résultats, GeoJSON, projections et cadrages adaptatifs. |

Dans le README principal du dépôt, on peut ajouter ces liens relatifs pour le professeur :

```markdown
## Évolution du projet
- [Première version](https://lena411.github.io/PaysduMonde/index0.html)
- [Deuxième version](https://lena411.github.io/PaysduMonde/index1.html)
- [Troisième version](https://lena411.github.io/PaysduMonde/index3.html)
```

## Jouer

- **Monde : 15 minutes** pour retrouver le maximum de pays.
- **Europe, Asie, Afrique, Amériques, Océanie : 10 minutes** par partie.
- Le chrono reste arrêté pendant le choix initial et commence seulement avec **Prêt ? GO !**.
- Écrire un nom de pays, puis Entrée ou le bouton de validation. Accents, majuscules, apostrophes et tirets ne sont pas bloquants. Plusieurs noms courants sont acceptés.
- Une bonne réponse ajoute le pays à la collection et le colore en vert. Les doublons ne rapportent pas de point.
- Le bouton **Un indice** donne la première lettre et le nombre de lettres d’un pays restant ; il ne révèle pas sa position. Le même indice reste proposé tant que ce pays n’est pas trouvé.
- Zoomer avec les boutons, la molette ou les gestes tactiles ; **Recentrer** rétablit le cadrage.
- Changer de mode ou recommencer pendant une partie demande confirmation. Le temps continue de s’écouler durant cette confirmation ou la relecture des règles.
- À zéro, le chrono s’arrête et une **vue de résultats distincte** s’ouvre automatiquement dans le même onglet : nombre trouvé, pourcentage, durée jouée, région et indices utilisés.
- **Revoir la carte et les réponses** révèle les pays manqués. **Rejouer** prépare une nouvelle partie.
- Le score est calculé par `pays trouvés / pays du mode × 100`, arrondi à une décimale. Les niveaux utilisent la proportion non arrondie pour ne pas annoncer un sans-faute prématurément.
- Le temps est calculé depuis une échéance absolue : laisser l’onglet en arrière-plan ne met pas le jeu en pause. Si le navigateur suspend totalement l’onglet, la fin est traitée à sa reprise.
- Les parties ne sont pas sauvegardées ; recharger la page remet le jeu à zéro.

## Structure des fichiers

```text
index3.html                 Structure HTML, règles, jeu et résultats
README-V3.md                Notice et historique
v3/
  style.css                 Responsive et couleurs
  jeu.js                    Réponses, états, chrono et dialogues
  carte.js                  Projection D3, découpage GeoJSON et zoom
  preparer-carte.cjs         Script facultatif de synchronisation GeoJSON → JS
  data/
    pays-jeu.js              Noms français, alias, continents et repères
    pays.geojson             Géométries GeoJSON modifiables
    pays-geojson.js           Copie JavaScript du même GeoJSON
  vendor/
    d3.min.js                Bibliothèque de projection et de dessin, locale
    polygon-clipping.min.js  Bibliothèque de découpage, locale
    D3-LICENSE.txt
    POLYGON-CLIPPING-LICENSE.md
```

Tout ce qui est nécessaire au jeu et à la carte est fourni localement. Les polices Google Fonts sont facultatives : si Internet manque, le navigateur utilise les polices de remplacement.

Il n’est plus nécessaire d’utiliser les fichiers `map-data.js` ou `world.svg` pour la V3. **Ne pas les supprimer** du dépôt : les anciennes versions peuvent encore en avoir besoin.

## Pourquoi GeoJSON ?

Chaque pays possède un code, des propriétés et une géométrie. Les noms français et réponses sont séparés du dessin dans `pays-jeu.js`. Modifier une réponse ou son alias ne demande donc pas de toucher au tracé de carte.

Le fichier `pays.geojson` est la donnée géographique de référence. `pays-geojson.js` contient exactement la même FeatureCollection dans une variable JavaScript. Cette copie permet d’ouvrir le jeu par double-clic sans requête `fetch` bloquée par `file://` et sans serveur. Elle ne transforme pas la carte en image ou en ancien SVG : D3 génère les chemins à partir du GeoJSON à chaque cadrage.

Après modification du GeoJSON, synchroniser sa copie avec :

```sh
node v3/preparer-carte.cjs
```

Node n’est nécessaire que pour ce script facultatif, **pas pour jouer ni pour publier**.

## Le cadrage des continents

La V3 n’utilise plus les anciennes valeurs fixes de `viewBox`. Elle :

1. choisit une fenêtre en longitude et latitude ;
2. découpe les géométries pour enlever les portions hors de cette région ;
3. choisit une projection adaptée ;
4. utilise `fitExtent` sur les pays et repères pour les faire tenir dans la surface disponible ;
5. recalcule ce cadrage avec `ResizeObserver` lors d’un changement de taille.

En Océanie, les longitudes sont recentrées sur le Pacifique avant le découpage. Les îles de part et d’autre du méridien 180° ne sont donc plus séparées aux deux extrémités du monde. Les petits pays sont accompagnés d’un point lorsque leur surface devient trop petite à l’écran.

Les frontières des pays transcontinentaux sont découpées dans la région visible. Par exemple, l’Europe montre la partie occidentale de la Russie, pas toute sa partie asiatique ; cela évite d’écraser la carte de l’Europe. Les territoires étrangers au quiz sont en gris pâle.

## Liste des pays et conventions

Le jeu comporte **197 réponses** : la liste précédente a été conservée et Trinité-et-Tobago, absent des données de la V2, a été ajouté. Les totaux réels sont : Europe 47, Asie 47, Afrique 54, Amériques 35, Océanie 14.

Le décompte de 197 correspond aux 193 membres de l’ONU, au Vatican, à la Palestine, au Kosovo et à Taïwan. La présence de ces réponses n’exprime pas de position sur leur statut.

Pour maintenir les modes des versions précédentes, Russie, Turquie et Chypre sont en Europe ; Arménie, Azerbaïdjan et Géorgie en Asie. Ce découpage est une convention du quiz, pas une classification politique universelle. Les territoires ne sont pas des réponses distinctes.

## Sources et licences

- Données géographiques : Natural Earth, Admin-0 Countries 50m, domaine public. Fichier utilisé : <https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson>. Copie téléchargée le 20 octobre 2026, simplifiée avec Mapshaper (18 %, conservation des petites formes, coordonnées arrondies à 0,001°), puis limitée aux propriétés utiles au quiz.
- Présentation du jeu de données : <https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/>.
- D3 7.9.0 : <https://github.com/d3/d3>. Licence ISC incluse dans `v3/vendor/D3-LICENSE.txt`.
- Documentation du cadrage `fitExtent` : <https://d3js.org/d3-geo/projection>.
- Polygon Clipping 0.15.7 : <https://github.com/mfogel/polygon-clipping>. Licence MIT incluse.
- Polices Fraunces et Nunito Sans : <https://fonts.google.com/specimen/Fraunces> et <https://fonts.google.com/specimen/Nunito+Sans>.

Les contours Natural Earth sont généralisés et peuvent refléter des choix de représentation de frontières contestées. Il s’agit d’un support de jeu, pas d’une carte juridique.
