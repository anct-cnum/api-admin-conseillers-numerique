import { Application } from '@feathersjs/express';
import { Response } from 'express';
import dayjs from 'dayjs';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validStatNationalesNouvelleCoop } from '../../../schemas/stats.schemas';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const axios = require('axios');

const formatDate = (date) => dayjs(date).format('YYYY-MM-DD');

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
      const filterDate = `filter[du]=${formatDate(req.query.dateDebut)}&filter[au]=${formatDate(req.query.dateFin)}`;
      const filterType = req.query.type
        ? `&filter[type]=${req.query.type}`
        : '';
      const filterMediateur = req.query.mediateur
        ? `&filter[mediateur]=${req.query.mediateur}`
        : '';
      const donneesStats = await axios({
        method: 'get',
        url: `${coop.domain}${coop.endPointStatistique}?${filterDate}${filterType}${filterMediateur}`,
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
          .find()
          .distinct('_id');
        const idsConseillerFilter = `?filter[conseiller_numerique_id]=${conseillersIds.map((i) => i.toString()).join(',')}`;

        const initialMediateursOptions = await axios({
          method: 'get',
          url: `${coop.domain}${coop.endPointUtilisateur}${idsConseillerFilter}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${coop.token}`,
          },
        });
        donneesStats.data.initialMediateursOptions =
          initialMediateursOptions.data.data.map((mediateur) => ({
            label: `${mediateur.attributes.conseiller_numerique.id_pg} - ${mediateur.attributes.prenom} ${mediateur.attributes.nom}`,
            value: {
              mediateurId: mediateur.attributes.mediateur?.id,
              email: mediateur.attributes.email,
            },
          }));

        if (req.query.mediateur) {
          const mediateurRechercher = initialMediateursOptions.data.data.find(
            (mediateur) =>
              mediateur.attributes.mediateur?.id === req.query.mediateur,
          )?.attributes?.conseiller_numerique;
          const checkAuthorisedFiltreMediateur = conseillersIds
            .map((id) => id.toString())
            .includes(mediateurRechercher.id);
          if (!checkAuthorisedFiltreMediateur) {
            return res.status(403).json({
              message: `Non autorisé pour accéder aux statistiques de ${mediateurRechercher.id_pg}`,
            });
          }
        }
      }
      return res.status(200).json(donneesStats.data);
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getStatsNationalesNouvelleCoop;
