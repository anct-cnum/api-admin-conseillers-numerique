import {
  getNombreCra,
  getStatsAccompagnements,
  getPersonnesRecurrentes,
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
  getCodesPostauxGrandReseau,
  getStructures,
  getConseillers,
  getStatsTempsAccompagnement,
} from '../stats.repository';

const getStatsGlobales = async (
  query,
  ability,
  action,
  app,
  pilotage = false,
  codesPostauxQuery = null,
) => {
  try {
    let codesPostaux = [];
    let structures = [];
    let conseillers = [];

    if (pilotage) {
      codesPostaux = await getCodesPostauxGrandReseau(
        codesPostauxQuery,
        ability,
        action,
        app,
      );

      structures = await getStructures(query, ability, action, app);

      conseillers = await getConseillers(query, ability, action, app);
    }
    const nbAccompagnement = await getNombreCra(query, app);

    const statsAccompagnements = await getStatsAccompagnements(
      query,
      ability,
      action,
      app,
    );

    const statsRecurrence = await getPersonnesRecurrentes(
      query,
      ability,
      action,
      app,
    );

    const statsTempsAccompagnement = await getStatsTempsAccompagnement(
      query,
      ability,
      action,
      app,
    );

    const statsActivites = await getStatsActivites(query, ability, action, app);

    const statsThemes = await getStatsThemes(query, ability, action, app);

    const statsLieux = await getStatsLieux(query, ability, action, app);

    const statsDurees = await getStatsDurees(query, ability, action, app);

    const statsAges = await getStatsAges(query, ability, action, app);

    const statsUsagers = await getStatsStatuts(query, ability, action, app);

    const statsReorientations = await getStatsReorientations(
      query,
      ability,
      action,
      app,
    );

    const statsEvolutions = await getStatsEvolutions(
      query,
      ability,
      action,
      app,
    );

    const donneesStats = {
      nbAccompagnement,
      nbAteliers:
        statsActivites?.find((activite) => activite._id === 'collectif')
          ?.count ?? 0,
      nbTotalParticipant:
        statsActivites?.find((activite) => activite._id === 'collectif')
          ?.nbParticipants ?? 0,
      nbAccompagnementPerso:
        statsActivites?.find((activite) => activite._id === 'individuel')
          ?.count ?? 0,
      nbDemandePonctuel:
        statsActivites?.find((activite) => activite._id === 'ponctuel')
          ?.count ?? 0,
      nbParticipantsRecurrents: statsRecurrence[0]?.valeur ?? 0,
      nbUsagersAccompagnementIndividuel:
        statsAccompagnements[0]?.individuel ?? 0,
      nbUsagersAtelierCollectif: statsAccompagnements[0]?.atelier ?? 0,
      nbReconduction: statsAccompagnements[0]?.redirection ?? 0,
      nbUsagersBeneficiantSuivi: 0,
      tauxTotalUsagersAccompagnes: 0,
      statsThemes,
      statsLieux,
      statsTempsAccompagnement,
      statsDurees,
      statsAges,
      statsUsagers,
      statsReorientations,
      statsEvolutions,
      codesPostaux,
      structures,
      conseillers,
    };

    const totalParticipants = await getStatsTotalParticipants(donneesStats);

    donneesStats.nbUsagersBeneficiantSuivi = await getNbUsagersBeneficiantSuivi(
      donneesStats,
    );

    donneesStats.tauxTotalUsagersAccompagnes = Math.round(
      await getStatsTauxAccompagnements(
        donneesStats.nbUsagersBeneficiantSuivi,
        totalParticipants,
      ),
    );

    // Conversion en %
    donneesStats.statsLieux = await conversionPourcentage(
      donneesStats.statsLieux,
      donneesStats.nbAccompagnement,
    );
    donneesStats.statsTempsAccompagnement = await conversionPourcentage(
      donneesStats.statsTempsAccompagnement,
      donneesStats.statsTempsAccompagnement.find(
        (temps) => temps.nom === 'total',
      ).valeur,
    );
    donneesStats.statsAges = await conversionPourcentage(
      donneesStats.statsAges,
      totalParticipants,
    );
    donneesStats.statsUsagers = await conversionPourcentage(
      donneesStats.statsUsagers,
      totalParticipants,
    );

    return donneesStats;
  } catch (error) {
    throw new Error(error);
  }
};

export default getStatsGlobales;
