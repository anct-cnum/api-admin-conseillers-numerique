import { Application } from '@feathersjs/express';
import { Response } from 'express';
import dayjs from 'dayjs';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validStatNationalesNouvelleCoop } from '../../../schemas/stats.schemas';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const axios = require('axios');

const formatDate = (date) => dayjs(date).format('YYYY-MM-DD');

const sortByName = (a, b) =>
  a.attributes.nom.toLowerCase().localeCompare(b.attributes.nom.toLowerCase());

const ignoredMediateur = (mediateur) =>
  mediateur.attributes.conseiller_numerique !== null;

const getStatsNationalesNouvelleCoop =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const { role, ...rest } = req.query;
      const coop = app.get('coop');
      const isAdmin = role === 'admin' && req?.user.roles?.includes('admin');

      const statsValidation = validStatNationalesNouvelleCoop.validate(rest);
      if (statsValidation.error) {
        return res.status(400).json({ message: statsValidation.error.message });
      }
      const filterDate = `&filter[du]=${formatDate(req.query.dateDebut)}&filter[au]=${formatDate(req.query.dateFin)}`;
      const filterTypes = req.query.types
        ? `&filter[types]=${req.query.types}`
        : '';
      const filterMediateurs =
        req.query.mediateurs && req.query.mediateurs !== '[object Object]'
          ? `&filter[mediateurs]=${req.query.mediateurs}`
          : '';
      const filterDepartements = req.query.departements
        ? `&filter[departements]=${req.query.departements}`
        : '';
      const donneesStats = await axios({
        method: 'get',
        url: `${coop.domain}${coop.endPointStatistique}?filter[conseiller_numerique]=1${filterDate}${filterTypes}${filterMediateurs}${filterDepartements}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${coop.token}`,
        },
      });
      donneesStats.data.isActiveSearchMediateur = isAdmin;
      donneesStats.data.initialMediateursOptions = [];
      if (!isAdmin) {
        const conseillersIds = await app
          .service(service.conseillers)
          .Model.accessibleBy(req.ability, action.read)
          .find({})
          .distinct('idPG');
        const idPGConseiller = conseillersIds.map((i) => i.toString());
        if (idPGConseiller.length >= 1) {
          const filters = `?filter[soft_deleted]=0&filter[conseiller_numerique_id_pg]=${idPGConseiller.join(',')}`;
          const initialMediateursOptions = await axios({
            method: 'get',
            url: `${coop.domain}${coop.endPointUtilisateur}${filters}`,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${coop.token}`,
            },
          });
          donneesStats.data.initialMediateursOptions =
            initialMediateursOptions.data.data
              .sort(sortByName)
              .filter(ignoredMediateur)
              .map(
                (mediateur) =>
                  mediateur.attributes.mediateur?.id && {
                    label: `${mediateur.attributes.conseiller_numerique.id_pg} - ${mediateur.attributes.prenom} ${mediateur.attributes.nom}`,
                    value: {
                      mediateurId: mediateur.attributes.mediateur.id,
                      email: mediateur.attributes.email,
                    },
                  },
              )
              .filter((mediateur) => mediateur);
          if (req.query.mediateur) {
            const mediateurRechercher = initialMediateursOptions.data.data.find(
              (mediateur) =>
                mediateur.attributes.mediateur?.id === req.query.mediateur,
            )?.attributes?.conseiller_numerique;
            const checkAuthorisedFiltreMediateur = idPGConseiller.includes(
              mediateurRechercher?.id_pg.toString(),
            );
            if (!checkAuthorisedFiltreMediateur) {
              return res.status(403).json({
                message: `Non autorisé à accéder aux statistiques de ${req.query.mediateur}`,
              });
            }
          }
        }
      }
      return res.status(200).json(donneesStats.data);
    } catch (error) {
      throw new Error(error);
    }
  };

export default getStatsNationalesNouvelleCoop;
