import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { validCreationContrat } from '../../../schemas/contrat.schemas';
import { getCoselec } from '../../../utils';
import { countConseillersRecrutees } from '../misesEnRelation.repository';

const updateContratRecrutement =
  (app: Application) => async (req: IRequest, res: Response) => {
    const miseEnrelationId = req.params.id;
    const { typeDeContrat, dateDebutDeContrat, dateFinDeContrat, salaire } =
      req.body;

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
      const dernierCoselec = getCoselec(miseEnRelation.structureObj);
      if (dernierCoselec !== null) {
        // Nombre de candidats déjà recrutés pour cette structure
        const misesEnRelationRecrutees = await countConseillersRecrutees(
          app,
          req,
          miseEnRelation.structure.oid,
        );
        const countMisesEnRelationRecruteesFutur =
          misesEnRelationRecrutees.length + 1; // prendre en compte celui qui va être recruté dans le quota
        if (
          countMisesEnRelationRecruteesFutur >=
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
        },
      };
      if (miseEnRelation.statut === 'interessee') {
        Object.assign(contratUpdated.$set, {
          statut: 'recrutee',
          emetteurRecrutement: {
            email: req.user.name,
            date: new Date(),
          },
        });
      }
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
        miseEnRelation: miseEnRelationUpdated.value,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateContratRecrutement;
