import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { validCreationContrat } from '../../../schemas/contrat.schemas';
import { getCoselec } from '../../../utils';

const createContratRecrutement =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      body: {
        typeDeContrat,
        dateDebutDeContrat,
        dateFinDeContrat,
        salaire,
        miseEnrelationId,
      },
    } = req;

    if (!ObjectId.isValid(miseEnrelationId)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }

    try {
      const creationContrat = validCreationContrat.validate({
        typeDeContrat,
        dateDebutDeContrat,
        dateFinDeContrat,
        salaire,
      });
      if (creationContrat.error) {
        res.status(400).json({ message: creationContrat.error.message });
        return;
      }
      const miseEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(miseEnrelationId) });
      if (!miseEnRelation) {
        res.status(404).json({ message: "La mise en relation n'existe pas" });
        return;
      }
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne();
      const dernierCoselec = getCoselec(structure);
      if (dernierCoselec !== null) {
        // Nombre de candidats déjà recrutés pour cette structure
        const misesEnRelationRecrutees = await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.read)
          .find({
            query: {
              statut: { $in: ['recrutee', 'finalisee'] },
            },
          });
        if (
          misesEnRelationRecrutees.length >=
          dernierCoselec.nombreConseillersCoselec
        ) {
          res.status(400).json({
            message:
              'Action non autorisée : quota atteint de conseillers validés par rapport au nombre de postes attribués',
          });
          return;
        }
      }
      const contratUpdated: any = {
        $set: {
          typeDeContrat,
          dateDebutDeContrat: new Date(dateDebutDeContrat),
          salaire: Number(salaire.replace(',', '.')),
          statut: 'recrutee',
          emetteurRecrutement: {
            email: req.user.name,
            date: new Date(),
          },
        },
      };
      if (dateFinDeContrat !== null) {
        contratUpdated.$set.dateFinDeContrat = new Date(dateFinDeContrat);
      } else {
        contratUpdated.$unset = { dateFinDeContrat: '' };
      }

      const miseEnRelationUpdated = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: miseEnrelationId,
            statut: { $in: ['interessee', 'recrutee'] },
          },
          contratUpdated,
          {
            new: true,
            rawResult: true,
          },
        );
      if (miseEnRelationUpdated.lastErrorObject.n === 0) {
        res.status(404).json({
          message: "Le contrat n'a pas été mise à jour",
        });
        return;
      }

      res.status(200).json({
        message: 'Le contrat a bien été enregistré',
        miseEnRelation: miseEnRelationUpdated.value,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default createContratRecrutement;
