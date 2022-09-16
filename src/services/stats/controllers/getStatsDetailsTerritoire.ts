import { Application } from '@feathersjs/express';
import { Response } from 'express';
import dayjs from 'dayjs';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { validTerritoireDetails } from '../../../schemas/territoires.schemas';
import { action } from '../../../helpers/accessControl/accessList';

const checkAccessRequestStatsTerritoires = async (
  app: Application,
  req: IRequest,
) =>
  app
    .service(service.statsTerritoires)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

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

const getStatsTerritoireDetail =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { typeTerritoire, idTerritoire } = req.query;
    const dateFin: Date = new Date(req.query.dateFin as string);
    const dateFinFormat = dayjs(dateFin).format('DD/MM/YYYY');
    const emailValidation = validTerritoireDetails.validate({
      typeTerritoire,
      idTerritoire,
      dateFin,
    });

    if (emailValidation.error) {
      res.statusMessage = emailValidation.error.message;
      res.status(400).end();
      return;
    }
    try {
      let territoire: any[];
      const checkRoleAccessStatsTerritoires =
        await checkAccessRequestStatsTerritoires(app, req);
      if (typeTerritoire === 'codeDepartement') {
        territoire = await getDepartement(app, req)(
          dateFinFormat,
          typeTerritoire,
          String(idTerritoire),
        );
      } else if (typeTerritoire === 'codeRegion') {
        territoire = await getRegion(app, checkRoleAccessStatsTerritoires)(
          dateFinFormat,
          typeTerritoire,
          String(idTerritoire),
        );
      }
      res.send(territoire[0]);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
    }
  };

export default getStatsTerritoireDetail;
