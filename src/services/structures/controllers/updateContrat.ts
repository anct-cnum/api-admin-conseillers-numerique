import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { validCreationContrat } from '../../../schemas/contrat.schemas';

const updateContrat =
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
      const editContrat = validCreationContrat.validate({
        typeDeContrat,
        dateDebutDeContrat,
        dateFinDeContrat,
        salaire,
      });
      if (editContrat.error) {
        res.status(400).json({ message: editContrat.error.message });
        return;
      }
      const contratUpdated: any = {
        $set: {
          typeDeContrat,
          dateDebutDeContrat: new Date(dateDebutDeContrat),
          salaire: Number(salaire),
        },
      };
      if (dateFinDeContrat !== null) {
        contratUpdated.$set.dateFinDeContrat = new Date(dateFinDeContrat);
      } else {
        contratUpdated.$unset = { dateFinDeContrat: '' };
      }
      const miseEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: id,
            statut: 'renouvellement_initié',
          },
          contratUpdated,
          {
            new: true,
            rawResult: true,
          },
        );
      if (miseEnRelation.lastErrorObject.n === 0) {
        res.status(404).json({
          message: "Le contrat n'a pas été mise à jour",
        });
        return;
      }
      res.status(200).json(miseEnRelation.value);
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateContrat;
