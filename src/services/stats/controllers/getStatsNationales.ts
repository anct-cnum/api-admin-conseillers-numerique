import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
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

const getStatsNationales =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const dateDebut = new Date(String(req.query.dateDebut));
      dateDebut.setUTCHours(0, 0, 0, 0);
      const dateFin = new Date(String(req.query.dateFin));
      dateFin.setUTCHours(23, 59, 59, 59);
      const query = {
        'cra.dateAccompagnement': {
          $gte: dateDebut,
          $lte: dateFin,
        },
      };

      const nbAccompagnement = await getNombreCra(
        query,
        req.ability,
        action.read,
        app,
      );

      const statsAccompagnements = await getStatsAccompagnements(
        query,
        req.ability,
        action.read,
        app,
      );

      const statsRecurrence = await getPersonnesRecurrentes(
        query,
        req.ability,
        action.read,
        app,
      );

      const statsActivites = await getStatsActivites(
        query,
        req.ability,
        action.read,
        app,
      );

      const statsThemes = await getStatsThemes(
        query,
        req.ability,
        action.read,
        app,
      );

      const statsLieux = await getStatsLieux(
        query,
        req.ability,
        action.read,
        app,
      );

      const statsDurees = await getStatsDurees(
        query,
        req.ability,
        action.read,
        app,
      );

      const statsAges = await getStatsAges(
        query,
        req.ability,
        action.read,
        app,
      );

      const statsUsagers = await getStatsStatuts(
        query,
        req.ability,
        action.read,
        app,
      );

      const statsReorientations = await getStatsReorientations(
        query,
        req.ability,
        action.read,
        app,
      );

      const statsEvolutions = await getStatsEvolutions(
        query,
        req.ability,
        action.read,
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

      donneesStats.nbUsagersBeneficiantSuivi =
        await getNbUsagersBeneficiantSuivi(donneesStats);

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

      res.status(200).json(donneesStats);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      throw new Error(error);
    }
  };

export default getStatsNationales;
