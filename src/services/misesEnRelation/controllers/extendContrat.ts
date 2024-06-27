import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { validCreationContrat } from '../../../schemas/contrat.schemas';

const extendContrat =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      body: { typeDeContrat, dateDebutDeContrat, dateFinDeContrat, salaire },
    } = req;
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }
    try {
      const validExtendContrat = validCreationContrat.validate({
        typeDeContrat,
        dateDebutDeContrat,
        dateFinDeContrat,
        salaire,
      });
      if (validExtendContrat.error) {
        res.status(400).json({ message: validExtendContrat.error.message });
        return;
      }
      const miseEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: id,
            statut: 'finalisee',
          },
          {
            $set: {
              nouvelleDateFinDeContrat: {
                dateSouhaitee: new Date(dateFinDeContrat),
                dateDeLaDemande: new Date(),
              },
            },
          },
          {
            new: true,
            includeResultMetadata: true,
          },
        );
      if (miseEnRelation.lastErrorObject.n === 0) {
        res.status(404).json({
          message: "Une erreur s'est produite lors de la demande",
        });
        return;
      }
      res.status(200).json(miseEnRelation.value);
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default extendContrat;
