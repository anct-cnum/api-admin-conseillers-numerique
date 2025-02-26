import dayjs from 'dayjs';
import { Application } from '@feathersjs/express';
import service from '../../helpers/services';
import { ICodesPostauxQuery } from '../../ts/interfaces/global.interfaces';

const labelsCorrespondance = require('../../../datas/themesCorrespondances.json');

interface TempsAccompagnement {
  nom: string;
  valeur: number;
  temps: string;
}

interface ThemesAccompagnement {
  nom: string;
  valeur: number;
  percent: number;
}

const sortByValueThenName = (a, b) => {
  if (a.valeur > b.valeur) {
    return -1;
  }
  if (a.valeur < b.valeur) {
    return 1;
  }
  const libelle1 =
    labelsCorrespondance.find((label) => label.nom === a.nom)?.correspondance ??
    a.nom;
  const libelle2 =
    labelsCorrespondance.find((label) => label.nom === b.nom)?.correspondance ??
    b.nom;
  return libelle1.localeCompare(libelle2, 'fr');
};

const getNombreCra = async (query, app) =>
  app.service(service.cras).Model.countDocuments(query);

const getCodesPostauxGrandReseau = async (
  codesPostauxQuery: ICodesPostauxQuery,
  ability,
  read: string,
  app: Application,
) => {
  const queryAccess = await app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .getQuery();

  const listeCodePostaux = await app.service(service.cras).Model.aggregate([
    { $match: { ...codesPostauxQuery, $and: [queryAccess] } },
    {
      $group: {
        _id: '$cra.codePostal',
        villes: {
          $addToSet: {
            ville: '$cra.nomCommune',
            codeCommune: '$cra.codeCommune',
          },
        },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        codePostal: '$_id',
        villes: '$villes',
      },
    },
  ]);
  const liste = listeCodePostaux.map((e) => {
    const removeDoublon = [
      ...new Map(e.villes.map((item) => [item.codeCommune, item])).values(),
    ];
    return {
      ...e,
      villes: removeDoublon,
      codeCommune: removeDoublon,
    };
  });
  return liste;
};

const getStructures = async (
  query,
  ability,
  read: string,
  app: Application,
) => {
  const crasQuery: any = {};
  if (query['cra.codePostal']) {
    crasQuery['cra.codePostal'] = query['cra.codePostal'];
  }
  if (query['cra.nomCommune']) {
    crasQuery['cra.nomCommune'] = query['cra.nomCommune'];
  }

  const queryAccess = await app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .getQuery();
  const structures = await app.service(service.cras).Model.aggregate([
    { $match: { ...crasQuery, $and: [queryAccess] } },
    {
      $project: {
        structureArray: { $objectToArray: '$structure' },
      },
    },
    {
      $unwind: '$structureArray',
    },
    {
      $match: { 'structureArray.k': '$id' },
    },
    {
      $group: {
        _id: null,
        uniqueStructures: { $addToSet: '$structureArray.v' },
      },
    },
    {
      $lookup: {
        from: 'structures',
        let: { uniqueStructureId: '$uniqueStructures' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$uniqueStructureId'],
              },
            },
          },
          {
            $project: {
              _id: 1,
              nom: 1,
              codePostal: 1,
            },
          },
        ],
        as: 'structures',
      },
    },
    {
      $project: {
        uniqueStructures: 0,
      },
    },
  ]);

  return structures;
};

const getConseillers = async (
  query,
  ability,
  read: string,
  app: Application,
) => {
  const crasQuery: any = {};
  if (query['cra.codePostal']) {
    crasQuery['cra.codePostal'] = query['cra.codePostal'];
  }
  if (query['cra.nomCommune']) {
    crasQuery['cra.nomCommune'] = query['cra.nomCommune'];
  }
  const queryAccess = await app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .getQuery();

  const conseillers = await app.service(service.cras).Model.aggregate([
    { $match: { ...crasQuery, $and: [queryAccess] } },
    {
      $project: {
        conseillerArray: { $objectToArray: '$conseiller' },
      },
    },
    {
      $unwind: '$conseillerArray',
    },
    {
      $match: { 'conseillerArray.k': '$id' },
    },
    {
      $group: {
        _id: null,
        uniqueConseillers: { $addToSet: '$conseillerArray.v' },
      },
    },
    {
      $lookup: {
        from: 'conseillers',
        let: { uniqueConseillerId: '$uniqueConseillers' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$uniqueConseillerId'],
              },
            },
          },
          {
            $project: {
              _id: 1,
              emailPro: '$emailPro',
            },
          },
        ],
        as: 'conseillers',
      },
    },
    {
      $project: {
        uniqueConseillers: 0,
      },
    },
  ]);
  return conseillers;
};

const getPersonnesRecurrentes = async (query, ability, read, app) => {
  const queryAccess = await app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .getQuery();

  return app.service(service.cras).Model.aggregate([
    { $match: { ...query, $and: [queryAccess] } },
    {
      $group: {
        _id: null,
        count: { $sum: '$cra.nbParticipantsRecurrents' },
      },
    },
    { $project: { valeur: '$count' } },
  ]);
};

const getStatsAccompagnements = async (query, ability, read, app) => {
  const queryAccess = await app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .getQuery();

  return app.service(service.cras).Model.aggregate([
    { $match: { ...query, $and: [queryAccess] } },
    { $unwind: '$cra.accompagnement' },
    {
      $group: {
        _id: 'accompagnement',
        individuel: { $sum: '$cra.accompagnement.individuel' },
        atelier: { $sum: '$cra.accompagnement.atelier' },
        redirection: { $sum: '$cra.accompagnement.redirection' },
      },
    },
  ]);
};

const getStatsActivites = async (query, ability, read, app) => {
  const queryAccess = await app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .getQuery();

  return app.service(service.cras).Model.aggregate([
    { $match: { ...query, $and: [queryAccess] } },
    { $unwind: '$cra.activite' },
    {
      $group: {
        _id: '$cra.activite',
        count: { $sum: 1 },
        nbParticipants: { $sum: '$cra.nbParticipants' },
      },
    },
  ]);
};
const getNbUsagersBeneficiantSuivi = (stats) =>
  stats.nbUsagersAccompagnementIndividuel +
  stats.nbUsagersAtelierCollectif +
  stats.nbReconduction;

const getStatsTotalParticipants = (stats) =>
  stats.nbTotalParticipant +
  stats.nbAccompagnementPerso +
  stats.nbDemandePonctuel;

const getStatsTauxAccompagnements = (
  nbUsagersBeneficiantSuivi,
  totalParticipants,
) =>
  totalParticipants > 0
    ? (nbUsagersBeneficiantSuivi / totalParticipants) * 100
    : 0;

const getStatsThemes = async (query, ability, read, app) => {
  let statsThemes: ThemesAccompagnement[] = [
    { nom: 'equipement informatique', valeur: 0, percent: 0 },
    { nom: 'internet', valeur: 0, percent: 0 },
    { nom: 'courriel', valeur: 0, percent: 0 },
    { nom: 'smartphone', valeur: 0, percent: 0 },
    { nom: 'contenus numeriques', valeur: 0, percent: 0 },
    { nom: 'vocabulaire', valeur: 0, percent: 0 },
    { nom: 'traitement texte', valeur: 0, percent: 0 },
    { nom: 'echanger', valeur: 0, percent: 0 },
    { nom: 'trouver emploi', valeur: 0, percent: 0 },
    { nom: 'accompagner enfant', valeur: 0, percent: 0 },
    { nom: 'tpe/pme', valeur: 0, percent: 0 },
    { nom: 'demarche en ligne', valeur: 0, percent: 0 },
    { nom: 'securite', valeur: 0, percent: 0 },
    { nom: 'fraude et harcelement', valeur: 0, percent: 0 },
    { nom: 'sante', valeur: 0, percent: 0 },
    { nom: 'espace-sante', valeur: 0, percent: 0 },
    { nom: 'budget', valeur: 0, percent: 0 },
    { nom: 'scolaire', valeur: 0, percent: 0 },
    { nom: 'diagnostic', valeur: 0, percent: 0 },
  ];

  const queryAccess = await app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .getQuery();

  const themes = await app
    .service(service.cras)
    .Model.aggregate([
      { $match: { ...query, $and: [queryAccess] } },
      { $unwind: '$cra.themes' },
      { $group: { _id: '$cra.themes', count: { $sum: 1 } } },
      { $project: { _id: 0, nom: '$_id', valeur: '$count' } },
    ]);

  const sousThemes = await app.service(service.cras).Model.aggregate([
    {
      $match: {
        ...query,
        'cra.sousThemes.sante': {
          $in: ['espace-sante'],
        },
        $and: [queryAccess],
      },
    },
    { $unwind: '$cra.sousThemes' },
    { $group: { _id: 'espace-sante', count: { $sum: 1 } } },
    { $project: { _id: 0, nom: '$_id', valeur: '$count' } },
  ]);

  if (themes?.length > 0) {
    statsThemes = statsThemes.map(
      (theme1) => themes.find((theme2) => theme1.nom === theme2.nom) || theme1,
    );
    if (sousThemes?.length > 0) {
      statsThemes[15].valeur = sousThemes[0].valeur;
    }
  }

  const totalThemes = statsThemes.reduce(
    (previousValue, currentValue) => previousValue + currentValue.valeur,
    0,
  );
  if (totalThemes > 0) {
    statsThemes.forEach((theme: ThemesAccompagnement, i: number) => {
      statsThemes[i].percent = Number(
        ((theme.valeur * 100) / totalThemes).toFixed(1),
      );
    });
  }
  return statsThemes.sort(sortByValueThenName);
};

const getStatsLieux = async (query, ability, read, app) => {
  let statsLieux = [
    { nom: 'domicile', valeur: 0 },
    { nom: 'distance', valeur: 0 },
    { nom: 'rattachement', valeur: 0 },
    { nom: 'autre lieu', valeur: 0 },
  ];

  const queryAccess = await app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .getQuery();

  const lieux = await app
    .service(service.cras)
    .Model.aggregate([
      { $match: { ...query, $and: [queryAccess] } },
      { $unwind: '$cra.canal' },
      { $group: { _id: '$cra.canal', count: { $sum: 1 } } },
      { $project: { _id: 0, nom: '$_id', valeur: '$count' } },
    ]);

  if (lieux.length > 0) {
    statsLieux = statsLieux.map(
      (canal1) => lieux.find((canal2) => canal1.nom === canal2.nom) || canal1,
    );
  }

  return statsLieux;
};

const durees = async (query, queryAccess, app) =>
  app.service(service.cras).Model.aggregate([
    {
      $match: {
        ...query,
        $and: [queryAccess],
        'cra.duree': { $in: ['0-30', '30-60'] },
      },
    },
    { $unwind: '$cra.duree' },
    { $group: { _id: '$cra.duree', count: { $sum: 1 } } },
    { $project: { _id: 0, nom: '$_id', valeur: '$count' } },
  ]);

const duree60 = async (query, queryAccess, app) =>
  app.service(service.cras).Model.aggregate([
    {
      $match: {
        ...query,
        $and: [
          queryAccess,
          { 'cra.duree': { $ne: ['0-30', '30-60'] } },
          {
            $or: [
              {
                'cra.duree': {
                  $gte: 60,
                  $lt: 120,
                },
              },
              { 'cra.duree': { $in: ['60', '90'] } }, // Correspond au bouton 1h pile et 1h 30 (60 cra v1 & 90 cra v2)
            ],
          },
        ],
      },
    },
    { $group: { _id: null, total: { $sum: 1 } } },
  ]);

const duree120 = async (query, queryAccess, app) =>
  app.service(service.cras).Model.aggregate([
    {
      $match: {
        ...query,
        $and: [
          queryAccess,
          { 'cra.duree': { $ne: ['0-30', '30-60'] } },
          {
            'cra.duree': {
              $gte: 120,
            },
          },
        ],
      },
    },
    { $group: { _id: null, total: { $sum: 1 } } },
  ]);

const getStatsDurees = async (query, ability, read, app) => {
  let statsDurees = [
    { nom: '0-30', valeur: 0 },
    { nom: '30-60', valeur: 0 },
    { nom: '60-120', valeur: 0 },
    { nom: '120+', valeur: 0 },
  ];

  const queryAccess = await app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .getQuery();

  const d1560 = await durees(query, queryAccess, app);
  const d60 = await duree60(query, queryAccess, app);
  const d120 = await duree120(query, queryAccess, app);

  if (d1560.length > 0) {
    statsDurees = statsDurees.map(
      (duree1) => d1560.find((duree2) => duree1.nom === duree2.nom) || duree1,
    );
  }
  statsDurees[statsDurees.findIndex((duree) => duree.nom === '60-120')].valeur =
    d60.length !== 0 ? d60[0].total : 0;
  statsDurees[statsDurees.findIndex((duree) => duree.nom === '120+')].valeur =
    d120.length !== 0 ? d120[0].total : 0;

  return statsDurees;
};

const getStatsAges = async (query, ability, read, app) => {
  let statsAges = [
    { nom: '-12', valeur: 0 },
    { nom: '12-18', valeur: 0 },
    { nom: '18-35', valeur: 0 },
    { nom: '35-60', valeur: 0 },
    { nom: '+60', valeur: 0 },
  ];

  const queryAccess = await app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .getQuery();

  const ages = await app.service(service.cras).Model.aggregate([
    { $match: { ...query, $and: [queryAccess] } },
    {
      $group: {
        _id: 'age',
        moins12ans: { $sum: '$cra.age.moins12ans' },
        de12a18ans: { $sum: '$cra.age.de12a18ans' },
        de18a35ans: { $sum: '$cra.age.de18a35ans' },
        de35a60ans: { $sum: '$cra.age.de35a60ans' },
        plus60ans: { $sum: '$cra.age.plus60ans' },
      },
    },
    {
      $project: {
        _id: 0,
        moins12ans: '$moins12ans',
        de12a18ans: '$de12a18ans',
        de18a35ans: '$de18a35ans',
        de35a60ans: '$de35a60ans',
        plus60ans: '$plus60ans',
      },
    },
  ]);

  if (ages.length > 0) {
    statsAges = [
      { nom: '-12', valeur: ages[0].moins12ans },
      { nom: '12-18', valeur: ages[0].de12a18ans },
      { nom: '18-35', valeur: ages[0].de18a35ans },
      { nom: '35-60', valeur: ages[0].de35a60ans },
      { nom: '+60', valeur: ages[0].plus60ans },
    ];
  }

  return statsAges;
};

const getStatsStatuts = async (query, ability, read, app) => {
  let statsUsagers = [
    { nom: 'etudiant', valeur: 0 },
    { nom: 'sans emploi', valeur: 0 },
    { nom: 'en emploi', valeur: 0 },
    { nom: 'retraite', valeur: 0 },
    { nom: 'heterogene', valeur: 0 },
  ];

  const queryAccess = await app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .getQuery();

  const statuts = await app.service(service.cras).Model.aggregate([
    { $match: { ...query, $and: [queryAccess] } },
    {
      $group: {
        _id: 'statut',
        etudiant: { $sum: '$cra.statut.etudiant' },
        sansEmploi: { $sum: '$cra.statut.sansEmploi' },
        enEmploi: { $sum: '$cra.statut.enEmploi' },
        retraite: { $sum: '$cra.statut.retraite' },
        heterogene: { $sum: '$cra.statut.heterogene' },
      },
    },
    {
      $project: {
        _id: 0,
        etudiant: '$etudiant',
        sansEmploi: '$sansEmploi',
        enEmploi: '$enEmploi',
        retraite: '$retraite',
        heterogene: '$heterogene',
      },
    },
  ]);

  if (statuts.length > 0) {
    statsUsagers = [
      { nom: 'etudiant', valeur: statuts[0].etudiant },
      { nom: 'sans emploi', valeur: statuts[0].sansEmploi },
      { nom: 'en emploi', valeur: statuts[0].enEmploi },
      { nom: 'retraite', valeur: statuts[0].retraite },
      { nom: 'heterogene', valeur: statuts[0].heterogene },
    ];
  }

  return statsUsagers;
};

const getStatsReorientations = async (query, ability, read, app) => {
  const queryAccess = await app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .getQuery();

  const statsReorientations = await app.service(service.cras).Model.aggregate([
    {
      $match: {
        ...query,
        $and: [queryAccess],
        'cra.organismes': { $ne: null },
      },
    },
    { $unwind: '$cra.organismes' },
    { $project: { _id: 0, organismes: '$cra.organismes' } },
  ]);

  const reorientations = [];
  let totalReorientations = 0;
  statsReorientations.forEach((statsReorientation) => {
    if (
      reorientations.filter(
        (reorientation) =>
          reorientation.nom ===
          String(Object.keys(statsReorientation.organismes)[0]),
      )?.length > 0
    ) {
      reorientations.filter(
        (reorientation) =>
          reorientation.nom === Object.keys(statsReorientation.organismes)[0],
      )[0].valeur +=
        statsReorientation.organismes[
          Object.keys(statsReorientation.organismes)[0]
        ];
    } else {
      reorientations.push({
        nom: String(Object.keys(statsReorientation.organismes)[0]),
        valeur:
          statsReorientation.organismes[
            Object.keys(statsReorientation.organismes)[0]
          ],
      });
    }
    totalReorientations +=
      statsReorientation.organismes[
        Object.keys(statsReorientation.organismes)[0]
      ];
  });

  // Conversion en % total
  if (reorientations.length > 0) {
    return reorientations.map((lieu) => {
      // eslint-disable-next-line no-param-reassign
      lieu.valeur =
        totalReorientations > 0
          ? Math.round((lieu.valeur / totalReorientations) * 100)
          : 0;
      return lieu;
    });
  }

  return reorientations;
};

const getStatsEvolutions = async (query, ability, read, app) => {
  let statsEvolutions = {};
  let aggregateEvol = [];
  const dateFinEvo = new Date();
  const dateDebutEvo = new Date(String(dayjs(new Date()).subtract(4, 'month')));
  const dateDebutEvoYear = dateDebutEvo.getFullYear();
  const dateFinEvoYear = dateFinEvo.getFullYear();
  let matchQuery = { ...query };
  let collection = service.statsConseillersCras;
  let statCrasMailleStructures = [];
  const queryAccess = await app
    .service(service.statsConseillersCras)
    .Model.accessibleBy(ability, read)
    .getQuery();

  // Cas des stats par territoire à la maille structures || Cas des stats par structure
  if (Object.prototype.hasOwnProperty.call(query, 'structure.$id')) {
    collection = service.cras;
    statCrasMailleStructures = [
      {
        $group: {
          _id: {
            mois: { $month: '$cra.dateAccompagnement' },
            annee: { $year: '$cra.dateAccompagnement' },
          },
          countCras: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.annee',
          annee: { $push: { mois: '$_id.mois', totalCras: '$countCras' } },
        },
      },
      {
        $group: {
          _id: null,
          data: { $push: { k: { $toString: '$_id' }, v: '$annee' } },
        },
      },
      { $replaceRoot: { newRoot: { $arrayToObject: '$data' } } },
    ];
    matchQuery = { 'structure.$id': query['structure.$id'] };
  } else if (Object.prototype.hasOwnProperty.call(query, 'conseiller.$id')) {
    // Pour le filtre par CN (grand reseaux) || stat par CN
    const cnfsIds = query['conseiller.$id'];
    matchQuery = { 'conseiller.$id': cnfsIds };
  } else {
    // Pour les stats Nationales
    matchQuery = {};
  }
  aggregateEvol = await app.service(collection).Model.aggregate([
    { $match: { ...matchQuery, $and: [queryAccess] } },
    ...statCrasMailleStructures,
    { $unwind: `$${dateFinEvoYear}` },
    {
      $group: {
        _id: `$${dateFinEvoYear}.mois`,
        totalCras: { $sum: `$${dateFinEvoYear}.totalCras` },
      },
    },
    {
      $addFields: { mois: '$_id', annee: dateFinEvoYear },
    },
  ]);
  if (collection === service.cras) {
    aggregateEvol = aggregateEvol.map((i) => {
      return {
        ...i,
        mois: i.mois - 1,
      };
    });
  }

  if (dateDebutEvoYear !== dateFinEvoYear) {
    // Si année glissante on récupère les données de l'année n-1
    let aggregateEvolLastYear = await app.service(collection).Model.aggregate([
      { $match: { ...matchQuery, $and: [queryAccess] } },
      ...statCrasMailleStructures,
      { $unwind: `$${dateDebutEvoYear}` },
      {
        $group: {
          _id: `$${dateDebutEvoYear}.mois`,
          totalCras: { $sum: `$${dateDebutEvoYear}.totalCras` },
        },
      },
      {
        $addFields: { mois: '$_id', annee: dateDebutEvoYear },
      },
    ]);
    if (collection === service.cras) {
      aggregateEvolLastYear = aggregateEvolLastYear.map((i) => {
        return {
          ...i,
          mois: i.mois - 1,
        };
      });
    }
    statsEvolutions = JSON.parse(
      `{"${dateDebutEvoYear.toString()}": ${JSON.stringify(
        aggregateEvolLastYear,
      )},"${dateFinEvoYear.toString()}": ${JSON.stringify(aggregateEvol)}}`,
    );
  } else {
    statsEvolutions = JSON.parse(
      `{"${dateFinEvoYear.toString()}": ${JSON.stringify(aggregateEvol)}}`,
    );
  }

  return statsEvolutions;
};

const conversionPourcentage = (datas, total) =>
  datas.map((obj) =>
    Object.assign(obj, {
      valeur: total > 0 ? Math.round((obj.valeur / total) * 100) : 0,
    }),
  );

const getPersonnesAccompagnees = async (statsActivites) => {
  const nbTotalParticipant =
    statsActivites?.find((activite) => activite._id === 'collectif')
      ?.nbParticipants ?? 0;
  const nbAccompagnementPerso =
    statsActivites?.find((activite) => activite._id === 'individuel')?.count ??
    0;
  const nbDemandePonctuel =
    statsActivites?.find((activite) => activite._id === 'ponctuel')?.count ?? 0;

  return nbTotalParticipant + nbAccompagnementPerso + nbDemandePonctuel;
};

const formatMinutes = (minutes: number) => {
  if (minutes > 0) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const formatStringHours = hours.toLocaleString().replace(/,/g, ' ');
    if (remainingMinutes === 0) {
      return `${formatStringHours}h`;
    }
    return `${formatStringHours}h ${remainingMinutes}min`;
  }
  return '0h';
};

const getStatsTempsAccompagnement = async (query, ability, read, app) => {
  const queryAccess = await app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .getQuery();
  const tempsAccompagnement: TempsAccompagnement[] = [
    { nom: 'total', valeur: 0, temps: '0h' },
    { nom: 'collectif', valeur: 0, temps: '0h' },
    { nom: 'individuel', valeur: 0, temps: '0h' },
    { nom: 'ponctuel', valeur: 0, temps: '0h' },
  ];
  const dureeTotalParActiviter: Array<{ nom: string; valeur: number }> =
    await app.service(service.cras).Model.aggregate([
      {
        $match: {
          ...query,
          $and: [queryAccess],
        },
      },
      { $unwind: '$cra.duree' },
      {
        $group: {
          _id: '$cra.activite',
          count: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ['$cra.duree', '0-30'] }, then: 30 },
                  { case: { $eq: ['$cra.duree', '30-60'] }, then: 60 },
                  { case: { $eq: ['$cra.duree', '60'] }, then: 60 },
                  { case: { $eq: ['$cra.duree', '90'] }, then: 90 },
                ],
                default: '$cra.duree',
              },
            },
          },
        },
      },
      { $project: { _id: 0, nom: '$_id', valeur: '$count' } },
    ]);

  if (dureeTotalParActiviter?.length === 0) {
    return tempsAccompagnement;
  }
  dureeTotalParActiviter.forEach((dureeActiviter, index: number) => {
    tempsAccompagnement.map((tempAccompagnement: TempsAccompagnement) => {
      const item = tempAccompagnement;
      if (tempAccompagnement.nom === dureeActiviter.nom) {
        item.valeur = dureeActiviter.valeur;
        item.temps = formatMinutes(item.valeur);
      }
      return item;
    });
    tempsAccompagnement.map((accompagnement: TempsAccompagnement) => {
      const item = accompagnement;
      if (accompagnement.nom === 'total') {
        item.valeur += dureeActiviter.valeur;
        if (index === dureeTotalParActiviter.length - 1) {
          item.temps = formatMinutes(item.valeur);
        }
      }
      return item;
    });
  });

  return tempsAccompagnement;
};

export {
  getNombreCra,
  getPersonnesRecurrentes,
  getStatsAccompagnements,
  getStatsActivites,
  getNbUsagersBeneficiantSuivi,
  getStatsTotalParticipants,
  getStatsTauxAccompagnements,
  getStatsThemes,
  getStatsLieux,
  getStatsDurees,
  getStatsAges,
  getStatsStatuts,
  getStatsReorientations,
  getStatsEvolutions,
  conversionPourcentage,
  getPersonnesAccompagnees,
  getCodesPostauxGrandReseau,
  getStructures,
  getConseillers,
  getStatsTempsAccompagnement,
};
