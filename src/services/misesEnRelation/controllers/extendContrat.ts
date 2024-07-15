import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { validCreationContrat } from '../../../schemas/contrat.schemas';

interface IExtensionRequest {
  dateDeFinActuelle: Date;
  dateDeFinSouhaitee: Date;
  dateDeLaDemande: Date;
  statut: string;
}

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
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          _id: id,
          statut: 'finalisee',
        });

      if (!miseEnRelation) {
        res.status(404).json({
          message: 'Contrat non trouvé ou statut non valide',
        });
        return;
      }
      const existingRequest = miseEnRelation.demandesDeProlongation?.find(
        (request: IExtensionRequest) => request.statut === 'initiee',
      );
      let updateResult;
      if (existingRequest) {
        updateResult = await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.update)
          .findOneAndUpdate(
            {
              _id: id,
              'demandesDeProlongation.statut': 'initiee',
            },
            {
              $set: {
                'demandesDeProlongation.$.dateDeFinSouhaitee': new Date(
                  dateFinDeContrat,
                ),
              },
            },
            {
              new: true,
            },
          );
      } else {
        updateResult = await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.update)
          .findOneAndUpdate(
            {
              _id: id,
            },
            {
              $push: {
                demandesDeProlongation: {
                  dateDeFinActuelle: miseEnRelation.dateFinDeContrat,
                  dateDeFinSouhaitee: new Date(dateFinDeContrat),
                  dateDeLaDemande: new Date(),
                  statut: 'initiee',
                },
              },
            },
            {
              new: true,
            },
          );
      }
      if (updateResult.modifiedCount === 0) {
        res.status(404).json({
          message: "Une erreur s'est produite lors de la validation",
        });
        return;
      }
      res.status(200).json(updateResult);
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default extendContrat;
