# API du tableau de pilotage

API fournissant le dépôt [tableau de pilotage](https://github.com/anct-cnum/dashboard).

## Prérequis

- [Node.js LTS via NVM](https://nodejs.org/fr/download/package-manager) ;
- [Docker](https://get.docker.com/).

## Installation du projet

```bash
npm install
```

## Installation des données dans MongoDB

```bash
npm run db:start
```

> ⚠ Attention si vous prenez les données de production, elles ne seront pas anonymisées donc à prendre avec précaution !

- Télécharger l'export sur Clever Cloud (prod ou recette) dans l'onglet `backups` ;
- Lancer la commande `./import-data-mongo.sh [CHEMIN_DU_DUMP] [NOM_BASE_DE_DONNEES_D_ORIGINE]` ;

## Lancer l'application

```bash
npm run dev
```

## Lancer le linter

```bash
npm run lint
```

## Lancer les tests

```bash
npm run test
```

## Lancer le coverage des tests

```bash
npm run test:coverage
```
