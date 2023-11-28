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
    const [
      nbAccompagnement,
      statsAccompagnements,
      statsRecurrence,
      statsTempsAccompagnement,
      statsActivites,
      statsThemes,
      statsLieux,
      statsDurees,
      statsAges,
      statsUsagers,
      statsReorientations,
      statsEvolutions,
    ] = await Promise.all([
      getNombreCra(query, app),
      getStatsAccompagnements(query, ability, action, app),
      getPersonnesRecurrentes(query, ability, action, app),
      getStatsTempsAccompagnement(query, ability, action, app),
      getStatsActivites(query, ability, action, app),
      getStatsThemes(query, ability, action, app),
      getStatsLieux(query, ability, action, app),
      getStatsDurees(query, ability, action, app),
      getStatsAges(query, ability, action, app),
      getStatsStatuts(query, ability, action, app),
      getStatsReorientations(query, ability, action, app),
      getStatsEvolutions(query, ability, action, app),
    ]);
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
    const [
      nbUsagersBeneficiantSuivi,
      statsLieuxPourcentage,
      statsTempsAccompagnementPourcentage,
      statsAgesPourcentage,
      statsUsagersPourcentage,
    ] = await Promise.all([
      getNbUsagersBeneficiantSuivi(donneesStats),
      conversionPourcentage(
        donneesStats.statsLieux,
        donneesStats.nbAccompagnement,
      ),
      conversionPourcentage(
        donneesStats.statsTempsAccompagnement,
        donneesStats.statsTempsAccompagnement.find(
          (temps) => temps.nom === 'total',
        ).valeur,
      ),
      conversionPourcentage(donneesStats.statsAges, totalParticipants),
      conversionPourcentage(donneesStats.statsUsagers, totalParticipants),
    ]);
    donneesStats.tauxTotalUsagersAccompagnes = Math.round(
      await getStatsTauxAccompagnements(
        nbUsagersBeneficiantSuivi,
        totalParticipants,
      ),
    );
    donneesStats.nbUsagersBeneficiantSuivi = nbUsagersBeneficiantSuivi;
    // Conversion en %
    donneesStats.statsLieux = statsLieuxPourcentage;
    donneesStats.statsTempsAccompagnement = statsTempsAccompagnementPourcentage;
    donneesStats.statsAges = statsAgesPourcentage;
    donneesStats.statsUsagers = statsUsagersPourcentage;
    return donneesStats;
  } catch (error) {
    throw new Error(error);
  }
};

export default getStatsGlobales;
