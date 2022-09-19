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
} from '../stats.repository';

const getStatsGlobales = async (query, ability, action, app, res) => {
  try {
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
      nbParticipantsRecurrents: statsRecurrence[0]?.count ?? 0,
      nbUsagersAccompagnementIndividuel:
        statsAccompagnements[0]?.individuel ?? 0,
      nbUsagersAtelierCollectif: statsAccompagnements[0]?.atelier ?? 0,
      nbReconduction: statsAccompagnements[0]?.redirection ?? 0,
      nbUsagersBeneficiantSuivi: 0,
      tauxTotalUsagersAccompagnes: 0,
      statsThemes,
      statsLieux,
      statsDurees,
      statsAges,
      statsUsagers,
      statsReorientations,
      statsEvolutions,
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
    if (error.name === 'ForbiddenError') {
      res.status(403).json('Accès refusé');
    }
    res.status(500).json(error.message);
    throw new Error(error);
  }
};

export default getStatsGlobales;
