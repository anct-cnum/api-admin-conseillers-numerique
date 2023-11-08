import { Application } from '@feathersjs/express';
import { Response } from 'express';
import dayjs from 'dayjs';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validTerritoireDetails } from '../../../schemas/territoires.schemas';
import { action } from '../../../helpers/accessControl/accessList';
import { checkAccessRequestStatsTerritoires } from '../../statsTerritoires/statsTerritoires.repository';

const getDepartement =
  (app: Application, req: IRequest) =>
  async (date: string, typeTerritoire: string, idTerritoire: string) =>
    app
      .service(service.statsTerritoires)
      .Model.accessibleBy(req.ability, action.read)
      .findOne({ date, [typeTerritoire]: idTerritoire });

const getRegion =
  (app: Application, checkRoleAccessStatsTerritoires) =>
  async (date: string, typeTerritoire: string, idTerritoire: string) =>
    app.service(service.statsTerritoires).Model.aggregate([
      {
        $match: {
          date,
          [typeTerritoire]: idTerritoire,
          $and: [checkRoleAccessStatsTerritoires],
        },
      },
      {
        $group: {
          _id: {
            codeRegion: '$codeRegion',
            nomRegion: '$nomRegion',
          },
          conseillerIds: { $push: '$conseillerIds' },
        },
      },
      {
        $addFields: {
          codeRegion: '$_id.codeRegion',
          nomRegion: '$_id.nomRegion',
        },
      },
      {
        $project: {
          _id: 0,
          codeRegion: 1,
          nomRegion: 1,
          conseillerIds: {
            $reduce: {
              input: '$conseillerIds',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] },
            },
          },
        },
      },
    ]);
const getStructuresMailles =
  (app: Application) => async (typeTerritoire: string, idTerritoire: string) =>
    app
      .service(service.structures)
      .Model.find({
        [typeTerritoire]: idTerritoire === '978' ? '00' : idTerritoire,
        statut: { $ne: 'CREEE' },
      })
      .distinct('_id');

const getStatsTerritoire =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { typeTerritoire, idTerritoire } = req.query;
    const dateFin: Date = new Date(req.query.dateFin);
    const dateFinFormat = dayjs(dateFin).format('DD/MM/YYYY');
    const statsValidation = validTerritoireDetails.validate({
      typeTerritoire,
      idTerritoire,
      dateFin,
    });

    if (statsValidation.error) {
      res.status(400).json({ message: statsValidation.error.message });
      return;
    }
    try {
      let territoire: { structureIds: any[] };
      const checkRoleAccessStatsTerritoires =
        await checkAccessRequestStatsTerritoires(app, req);
      const listStructureId = await getStructuresMailles(app)(
        typeTerritoire,
        idTerritoire,
      );
      if (typeTerritoire === 'codeDepartement') {
        territoire = await getDepartement(app, req)(
          dateFinFormat,
          typeTerritoire,
          String(idTerritoire),
        );
        territoire = {
          ...territoire[`${'_doc'}`],
          structureIds: listStructureId,
        };
        res.status(200).json(territoire);
      } else if (typeTerritoire === 'codeRegion') {
        territoire = await getRegion(app, checkRoleAccessStatsTerritoires)(
          dateFinFormat,
          typeTerritoire,
          String(idTerritoire),
        );
        territoire = {
          ...territoire[`${'_doc'}`],
          structureIds: listStructureId,
        };
        res.status(200).json(territoire);
      } else {
        res.status(400).json('le type de territoire est invalide');
      }
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getStatsTerritoire;
