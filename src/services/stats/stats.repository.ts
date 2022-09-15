import dayjs from 'dayjs';
import service from '../../helpers/services';

const getNombreCra = async (query, ability, read, app) =>
  app.service(service.cras).Model.countDocuments(query);

const getPersonnesRecurrentes = async (query, ability, read, app) =>
  app.service(service.cras).Model.aggregate([
    { $match: { ...query } },
    {
      $group: {
        _id: null,
        count: { $sum: '$cra.nbParticipantsRecurrents' },
      },
    },
    { $project: { valeur: '$count' } },
  ]);

const getStatsAccompagnements = async (query, ability, read, app) =>
  app.service(service.cras).Model.aggregate([
    { $unwind: '$cra.accompagnement' },
    { $match: { ...query } },
    {
      $group: {
        _id: 'accompagnement',
        individuel: { $sum: '$cra.accompagnement.individuel' },
        atelier: { $sum: '$cra.accompagnement.atelier' },
        redirection: { $sum: '$cra.accompagnement.redirection' },
      },
    },
  ]);

const getStatsActivites = async (query, ability, read, app) =>
  app.service(service.cras).Model.aggregate([
    { $unwind: '$cra.activite' },
    { $match: { ...query } },
    {
      $group: {
        _id: '$cra.activite',
        count: { $sum: 1 },
        nbParticipants: { $sum: '$cra.nbParticipants' },
      },
    },
  ]);

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

  const themes = await app
    .service(service.cras)
    .Model.aggregate([
      { $unwind: '$cra.themes' },
      { $match: { ...query } },
      { $group: { _id: '$cra.themes', count: { $sum: 1 } } },
      { $project: { _id: 0, nom: '$_id', valeur: '$count' } },
    ]);

  if (themes.length > 0) {
    statsThemes = statsThemes.map(
      (theme1) => themes.find((theme2) => theme1.nom === theme2.nom) || theme1,
    );
  }
  return statsThemes;
};

const getStatsLieux = async (query, ability, read, app) => {
  let statsLieux = [
    { nom: 'domicile', valeur: 0 },
    { nom: 'distance', valeur: 0 },
    { nom: 'rattachement', valeur: 0 },
    { nom: 'autre', valeur: 0 },
  ];

  const lieux = await app
    .service(service.cras)
    .Model.aggregate([
      { $unwind: '$cra.canal' },
      { $match: { ...query } },
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

const durees = async (query, ability, read, app) =>
  app
    .service(service.cras)
    .Model.aggregate([
      { $unwind: '$cra.duree' },
      { $match: { ...query, 'cra.duree': { $in: ['0-30', '30-60'] } } },
      { $group: { _id: '$cra.duree', count: { $sum: 1 } } },
      { $project: { _id: 0, nom: '$_id', valeur: '$count' } },
    ]);

const duree60 = async (query, ability, read, app) =>
  app.service(service.cras).Model.aggregate([
    {
      $match: {
        ...query,
        $and: [
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

const duree120 = async (query, ability, read, app) =>
  app.service(service.cras).Model.aggregate([
    {
      $match: {
        ...query,
        $and: [
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

  const d1560 = await durees(query, ability, read, app);
  const d60 = await duree60(query, ability, read, app);
  const d120 = await duree120(query, ability, read, app);

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

  const ages = await app.service(service.cras).Model.aggregate([
    { $match: { ...query } },
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

  const statuts = await app.service(service.cras).Model.aggregate([
    { $match: { ...query } },
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
  const statsReorientations = await app.service(service.cras).Model.aggregate([
    { $unwind: '$cra.accompagnement' },
    { $match: { ...query, 'cra.organisme': { $ne: null } } },
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
      lieu.valeur = totalReorientations > 0 ? ~~(lieu.valeur / totalReorientations * 100) : 0;
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
  const events = { 'conseiller.$id': false };
  const key = 'conseiller.$id';
  // Cas des stats par territoire ou par conseiller
  if (Object.prototype.hasOwnProperty.call(events, key)) {
    const cnfsIds = query['conseiller.$id'];
    matchQuery = { 'conseiller.$id': cnfsIds };
  }
  aggregateEvol = await app.service(service.cras).Model.aggregate([
    { $match: { ...matchQuery } },
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
    { $project: { mois: '$_id' } },
  ]);

  statsEvolutions = JSON.parse(
    `{"${dateFinEvoYear.toString()}": ${JSON.stringify(aggregateEvol)}}`,
  );

  // Si année glissante on récupère les données de l'année n-1
  if (dateDebutEvoYear !== dateFinEvoYear) {
    const aggregateEvolLastYear = await app
      .service(service.cras)
      .Model.aggregate([
        { $match: { ...matchQuery } },
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
        { $project: { mois: '$_id' } },
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
    data.valeur = total > 0
        ? Math.round((data.valeur / total) * 100)
        : 0;
    return data;
  });
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
};
