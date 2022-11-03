import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const { Pool } = require('pg');

const updateSiretStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { siret } = req.body;
    const idUser = req.user?._id;
    const pool = new Pool();

    try {
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idStructure) });
      if (!structure) {
        res.statusMessage = "La strutucture n'existe pas";
        res.status(404).end();
        return;
      }
      await pool.query(
        `
      UPDATE djapp_hostorganization
      SET siret = $2
      WHERE id = $1`,
        [idStructure, siret],
      );
      await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          { _id: new ObjectId(idStructure) },
          {
            $set: { siret },
            $push: {
              historique: {
                data: {
                  ancienSiret:
                    structure?.siret === ''
                      ? 'non renseigné'
                      : structure?.siret,
                  nouveauSiret: req.body.siret,
                },
                changement: 'siret',
                date: new Date(),
                idAdmin: idUser,
              },
            },
          },
        );
      res.send({ siretUpdated: true });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      throw new Error(error);
    }
  };

export default updateSiretStructure;
