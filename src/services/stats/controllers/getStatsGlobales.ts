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
    const p = {
        nbAccompagnement: [],
        statsAccompagnements: [],
        statsRecurrence: [],
        statsActivites: [],
        statsThemes: [],
        statsLieux: [],
        statsDurees: [],
        statsAges: [],
        statsUsagers: [],
        statsReorientations: [],
        statsEvolutions: [],
      };
    const array = [
      { requete: getNombreCra(query, app), variable: 'nbAccompagnement'},
      { requete: getStatsAccompagnements(query, ability, action, app), variable: 'statsAccompagnements'},
      { requete: getPersonnesRecurrentes(query, ability, action, app), variable: 'statsRecurrence'},
      { requete: getStatsActivites(query, ability, action, app), variable: 'statsActivites'},
      { requete: getStatsThemes(query, ability, action, app), variable: 'statsThemes'},
      { requete: getStatsLieux(query, ability, action, app), variable: 'statsLieux'},
      { requete: getStatsDurees(query, ability, action, app), variable: 'statsDurees'},
      { requete: getStatsAges(query, ability, action, app), variable: 'statsAges'},
      { requete: getStatsStatuts(query, ability, action, app), variable: 'statsUsagers'},
      { requete: getStatsReorientations(query, ability, action, app), variable: 'statsReorientations'},
      { requete: getStatsEvolutions(query, ability, action, app), variable: 'statsEvolutions'},
     ];
    await Promise.allSettled(array.map(async i => {
      p[i.variable] = await i.requete;
    }));
    const {
      nbAccompagnement,
      statsAccompagnements,
      statsRecurrence,
      statsActivites,
      statsThemes,
      statsLieux,
      statsDurees,
      statsAges,
      statsUsagers,
      statsReorientations,
      statsEvolutions,
    } = p;
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
      statsDurees,
      statsAges,
      statsUsagers,
      statsReorientations,
      statsEvolutions,
      codesPostaux,
      structures,
      conseillers,
    };

    let totalParticipants = await getStatsTotalParticipants(donneesStats);
    let array2 = [
      { requete: getNbUsagersBeneficiantSuivi(donneesStats), variable: 'nbUsagersBeneficiantSuivi'},
      { requete: getStatsTauxAccompagnements(donneesStats.nbUsagersBeneficiantSuivi, totalParticipants), variable: 'tauxTotalUsagersAccompagnes'},
      { requete: conversionPourcentage(donneesStats.statsLieux, donneesStats.nbAccompagnement), variable: 'statsLieux'},
      { requete: conversionPourcentage(donneesStats.statsAges, totalParticipants), variable: 'statsAges'},
      { requete: conversionPourcentage(donneesStats.statsUsagers, totalParticipants), variable: 'statsUsagers'},
    ];
    donneesStats.tauxTotalUsagersAccompagnes = Math.round(
      await getStatsTauxAccompagnements(
        donneesStats.nbUsagersBeneficiantSuivi,
        totalParticipants,
      ),
    );
    await Promise.allSettled(array2.map(async i => {
      donneesStats[i.variable] = await i.requete;
    }));
    return donneesStats;
  } catch (error) {
    throw new Error(error);
  }
};

export default getStatsGlobales;
