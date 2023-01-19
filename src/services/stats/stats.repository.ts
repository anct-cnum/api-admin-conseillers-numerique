import dayjs from 'dayjs';
import { Application } from '@feathersjs/express';
import service from '../../helpers/services';
import {
  ICodesPostauxQuery,
  IStructuresQuery,
  IConseillersQuery,
} from '../../ts/interfaces/global.interfaces';

const labelsCorrespondance = require('../../../datas/themesCorrespondances.json');

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

  return app.service(service.cras).Model.aggregate([
    { $match: { ...codesPostauxQuery, $and: [queryAccess] } },
    {
      $group: {
        _id: '$cra.codePostal',
        villes: { $addToSet: '$cra.nomCommune' },
      },
    },
    { $sort: { _id: 1, villes: 1 } },
    {
      $project: {
        _id: 0,
        codePostal: '$_id',
        villes: '$villes',
      },
    },
  ]);
};

const getStructures = async (
  query,
  ability,
  read: string,
  app: Application,
) => {
  const structuresQuery: IStructuresQuery = {};
  if (query['cra.codePostal']) {
    structuresQuery.codePostal = query['cra.codePostal'];
  }
  if (query['cra.nomCommune']) {
    structuresQuery.nomCommune = query['cra.nomCommune'];
  }
  const queryAccess = await app
    .service(service.structures)
    .Model.accessibleBy(ability, read)
    .getQuery();
  return app
    .service(service.structures)
    .Model.aggregate([
      { $match: { ...structuresQuery, $and: [queryAccess] } },
      { $sort: { nom: 1 } },
      { $project: { nom: 1 } },
    ]);
};

const getConseillers = async (
  query,
  ability,
  read: string,
  app: Application,
) => {
  const conseillersQuery: IConseillersQuery = {};
  if (query['cra.codePostal']) {
    conseillersQuery.codePostal = query['cra.codePostal'];
  }
  if (query['cra.nomCommune']) {
    conseillersQuery.nomCommune = query['cra.nomCommune'];
  }
  const queryAccess = await app
    .service(service.conseillers)
    .Model.accessibleBy(ability, read)
    .getQuery();
  return app
    .service(service.conseillers)
    .Model.aggregate([
      { $match: { ...conseillersQuery, $and: [queryAccess] } },
      { $sort: { email: 1 } },
      { $project: { email: 1 } },
    ]);
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
    { $unwind: '$cra.accompagnement' },
    { $match: { ...query, $and: [queryAccess] } },
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
    { $unwind: '$cra.activite' },
    { $match: { ...query, $and: [queryAccess] } },
    {
      $group: {
        _id: '$cra.activite',
        count: { $sum: 1 },
        nbParticipants: { $sum: '$cra.nbParticipants' },
      },
    },
  ]);
};
const getNbUsagersBeneficiantSuivi = async (stats) =>
  stats.nbUsagersAccompagnementIndividuel +
  stats.nbUsagersAtelierCollectif +
  stats.nbReconduction;

const getStatsTotalParticipants = async (stats) =>
  stats.nbTotalParticipant +
  stats.nbAccompagnementPerso +
  stats.nbDemandePonctuel;

const getStatsTauxAccompagnements = async (
  nbUsagersBeneficiantSuivi,
  totalParticipants,
) =>
  totalParticipants > 0
    ? (nbUsagersBeneficiantSuivi / totalParticipants) * 100
    : 0;

const getStatsThemes = async (query, ability, read, app) => {
  let statsThemes = [
    { nom: 'equipement informatique', valeur: 0 },
    { nom: 'internet', valeur: 0 },
    { nom: 'courriel', valeur: 0 },
    { nom: 'smartphone', valeur: 0 },
    { nom: 'contenus numeriques', valeur: 0 },
    { nom: 'vocabulaire', valeur: 0 },
    { nom: 'traitement texte', valeur: 0 },
    { nom: 'echanger', valeur: 0 },
    { nom: 'trouver emploi', valeur: 0 },
    { nom: 'accompagner enfant', valeur: 0 },
    { nom: 'tpe/pme', valeur: 0 },
    { nom: 'demarche en ligne', valeur: 0 },
    { nom: 'securite', valeur: 0 },
    { nom: 'fraude et harcelement', valeur: 0 },
    { nom: 'sante', valeur: 0 },
  ];

  const queryAccess = await app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .getQuery();

  const themes = await app
    .service(service.cras)
    .Model.aggregate([
      { $unwind: '$cra.themes' },
      { $match: { ...query, $and: [queryAccess] } },
      { $group: { _id: '$cra.themes', count: { $sum: 1 } } },
      { $project: { _id: 0, nom: '$_id', valeur: '$count' } },
    ]);

  if (themes.length > 0) {
    statsThemes = statsThemes.map(
      (theme1) => themes.find((theme2) => theme1.nom === theme2.nom) || theme1,
    );
  }

  return statsThemes.sort(sortByValueThenName);
};

const getStatsLieux = async (query, ability, read, app) => {
  let statsLieux = [
    { nom: 'domicile', valeur: 0 },
    { nom: 'distance', valeur: 0 },
    { nom: 'rattachement', valeur: 0 },
    { nom: 'autre', valeur: 0 },
  ];

  const queryAccess = await app
    .service(service.cras)
    .Model.accessibleBy(ability, read)
    .getQuery();

  const lieux = await app
    .service(service.cras)
    .Model.aggregate([
      { $unwind: '$cra.canal' },
      { $match: { ...query, $and: [queryAccess] } },
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
    { $unwind: '$cra.duree' },
    {
      $match: {
        ...query,
        $and: [queryAccess],
        'cra.duree': { $in: ['0-30', '30-60'] },
      },
    },
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
    { $unwind: '$cra.accompagnement' },
    {
      $match: {
        ...query,
        $and: [queryAccess],
        'cra.organisme': { $ne: null },
      },
    },
    {
      $group: {
        _id: '$cra.organisme',
        redirection: { $sum: '$cra.accompagnement.redirection' },
      },
    },
    { $project: { _id: 0, nom: '$_id', valeur: '$redirection' } },
  ]);

  const totalReorientations = statsReorientations.reduce(
    (previousValue, currentValue) => previousValue + currentValue.valeur,
    0,
  );

  // Conversion en % total
  if (statsReorientations.length > 0) {
    return statsReorientations.map((lieu) => {
      // eslint-disable-next-line
      lieu.valeur =
        totalReorientations > 0
          ? Math.round((lieu.valeur / totalReorientations) * 100)
          : 0;
      return lieu;
    });
  }

  return statsReorientations;
};

const getStatsEvolutions = async (query, ability, read, app) => {
  let statsEvolutions = {};
  let aggregateEvol = [];
  const dateFinEvo = new Date();
  const dateDebutEvo = new Date(String(dayjs(new Date()).subtract(4, 'month')));
  const dateDebutEvoYear = dateDebutEvo.getFullYear();
  const dateFinEvoYear = dateFinEvo.getFullYear();
  let matchQuery = {};

  const queryAccess = await app
    .service(service.statsConseillersCras)
    .Model.accessibleBy(ability, read)
    .getQuery();

  // Cas des stats par territoire ou par
  if (Object.prototype.hasOwnProperty.call(query, 'conseiller.$id')) {
    const cnfsIds = query['conseiller.$id'];
    matchQuery = { 'conseiller.$id': cnfsIds };
  }

  aggregateEvol = await app
    .service(service.statsConseillersCras)
    .Model.aggregate([
      { $match: { ...matchQuery, $and: [queryAccess] } },
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

  statsEvolutions = JSON.parse(
    `{"${dateFinEvoYear.toString()}": ${JSON.stringify(aggregateEvol)}}`,
  );

  // Si année glissante on récupère les données de l'année n-1
  if (dateDebutEvoYear !== dateFinEvoYear) {
    const aggregateEvolLastYear = await app
      .service(service.statsConseillersCras)
      .Model.aggregate([
        { $match: { ...matchQuery, $and: [queryAccess] } },
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
    statsEvolutions = JSON.parse(
      `{"${dateDebutEvoYear.toString()}": ${JSON.stringify(
        aggregateEvolLastYear,
      )},"${dateFinEvoYear.toString()}": ${JSON.stringify(aggregateEvol)}}`,
    );
  }

  return statsEvolutions;
};

const conversionPourcentage = async (datas, total) => {
  return datas.map((data) => {
    // eslint-disable-next-line
    data.valeur = total > 0 ? Math.round((data.valeur / total) * 100) : 0;
    return data;
  });
};

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
};
