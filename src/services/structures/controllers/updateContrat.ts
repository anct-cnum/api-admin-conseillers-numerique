import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const updateContrat =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      body: { typeDeContrat, dateDebut, dateFin, salaire },
    } = req;
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }
    try {
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          { _id: id },
          {
            $set: {
              typeDeContrat,
              dateDebut,
              dateFin,
              salaire,
            },
          },
        );
      res.status(200).json({ message: 'Contrat mis à jour' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

export default updateContrat;
