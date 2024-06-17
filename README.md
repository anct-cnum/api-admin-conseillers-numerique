# API du tableau de pilotage

API fournissant le dépôt [tableau de pilotage](https://github.com/anct-cnum/dashboard).

## Prérequis

- [Node.js LTS via NVM](https://nodejs.org/fr/download/package-manager) ;
- [Docker](https://get.docker.com/).

## Installation du projet

```bash
npm install
cp config/default.json config/local.json
```

## Installation des données dans MongoDB

```bash
npm run db:start
```

> ⚠ Attention si vous prenez les données de production, elles ne seront pas anonymisées donc à prendre avec précaution !

- Télécharger l'export sur Clever Cloud (prod ou recette) dans l'onglet `backups` ;
- Créer `datas/exports`, puis le copier dans ce dernier et renommer en `archive.gz` ;
- Se connecter sur le conteneur Docker MongoDB créé (via VSCode ou [Lazydocker](https://github.com/jesseduffield/lazydocker#binary-release-linuxosxwindows)) puis lancer la commande suivante `mongorestore --host=localhost --port=27017 --username=admin --password=admin --archive=/home --gzip --drop --noIndexRestore --nsFrom="[REMPLACER_PAR_LE_NOM_DE_LA_BASE_DE_DONNEES].*" --nsTo="test.*"` ;
- L'import ci-dessus exclue la création d'index (car ça ne fonctionne pas) donc il faut les importer dans un second temps avec `node api-conseiller-numerique/src/tools/indexes/index.js` via le dépôt `api-conseiller-numerique` ;
- Si vous avez pris la base de production alors le compte admin n'existe pas donc il faut le copier de recette vers votre base locale.

## Lancer l'application

```bash
npm run dev:local
```

## Lancer le linter

```bash
npm run lint
```
