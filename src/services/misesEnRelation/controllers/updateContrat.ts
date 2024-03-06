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
        },
      };
      if (dateFinDeContrat !== null) {
        contratUpdated.$set.dateFinDeContrat = new Date(dateFinDeContrat);
      } else {
        contratUpdated.$unset = { dateFinDeContrat: '' };
      }
      if (salaire) {
        if (Number(salaire) < Number(app.get('contrat_smic'))) {
          res.status(400).json({
            message:
              'Le salaire doit être égal ou plus élevé que le minimum brut légal',
          });
          return;
        }
        contratUpdated.$set.salaire = Number(salaire.replace(',', '.'));
      } else {
        contratUpdated.$unset = { salaire: '' };
      }
      const miseEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: id,
            statut: 'renouvellement_initiee',
          },
          contratUpdated,
          {
            new: true,
            includeResultMetadata: true,
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
