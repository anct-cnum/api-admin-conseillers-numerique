import { Application } from '@feathersjs/express';
import { Response } from 'express';
import dayjs from 'dayjs';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validStatNationalesNouvelleCoop } from '../../../schemas/stats.schemas';

const axios = require('axios');

const getStatsNationalesNouvelleCoop =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const formatDate = (date) => dayjs(date).format('YYYY-MM-DD');
      const { role, ...rest } = req.query;
      const statsValidation = validStatNationalesNouvelleCoop.validate(rest);
      if (statsValidation.error) {
        return res.status(400).json({ message: statsValidation.error.message });
      }
      const coop = app.get('coop');
      const filterDate = `&filter[du]=${formatDate(req.query.dateDebut)}&filter[au]=${formatDate(req.query.dateFin)}`;
      const filterType = req.query.type
        ? `&filter[type]=${req.query.type}`
        : '';
      const donneesStats = await axios({
        method: 'get',
        url: `${coop.domain}${coop.endPoint}?filter[conseiller_numerique]=1${filterDate}${filterType}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${coop.token}`,
        },
      });
      return res.status(200).json(donneesStats.data);
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getStatsNationalesNouvelleCoop;
