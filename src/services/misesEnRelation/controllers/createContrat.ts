import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import { validCreationContrat } from '../../../schemas/contrat.schemas';
import {
  PhaseConventionnement,
  StatutConventionnement,
} from '../../../ts/enum';

const createContrat =
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

    const structureId = req.user?.entity?.oid;

    if (!ObjectId.isValid(miseEnrelationId)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }

    if (!ObjectId.isValid(structureId)) {
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
      const getStructure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne();

      if (!getStructure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }

      const phaseConventionnement =
        getStructure.conventionnement.statut ===
        StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ
          ? PhaseConventionnement.PHASE_2
          : '1';

      const duplicateMiseEnRelation = {
        ...miseEnRelation.toObject(),
        _id: new ObjectId(),
        typeDeContrat,
        dateDebutDeContrat: new Date(dateDebutDeContrat),
        salaire: Number(salaire.replace(',', '.')),
        banniereValidationRenouvellement: false,
        emetteurRenouvellement: {
          date: new Date(),
          email: req.user?.name,
        },
        miseEnRelationConventionnement: miseEnRelation._id,
        statut: 'renouvellement_initiee',
        phaseConventionnement,
      };
      const canCreate = req.ability.can(
        action.create,
        ressource.misesEnRelation,
      );
      if (!canCreate) {
        res.status(403).json({
          message: `Accès refusé, vous n'êtes pas autorisé à créer un contrat`,
        });
        return;
      }
      if (typeDeContrat !== 'CDI') {
        duplicateMiseEnRelation.dateFinDeContrat = new Date(dateFinDeContrat);
      }
      const newMiseEnRelation = await app
        .service(service.misesEnRelation)
        .create(duplicateMiseEnRelation);

      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          { _id: miseEnRelation._id },
          {
            $set: {
              miseEnRelationReconventionnement: newMiseEnRelation._id,
            },
          },
        );

      res.status(200).json({ message: 'Contrat créé' });
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default createContrat;
