import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import { validCreationContrat } from '../../../schemas/contrat.schemas';
import { PhaseConventionnement } from '../../../ts/enum';

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
      const miseEnRelationObject = miseEnRelation.toObject();
      // suppression du champ reconventionnement pour le traitement des fins de contrats naturels
      // sinon ils ne seront pas pris en compte dans le script de fin de contrat pour les phases 2
      delete miseEnRelationObject.reconventionnement;
      if (typeDeContrat === 'CDI') {
        delete miseEnRelationObject.dateFinDeContrat;
      }
      if (!salaire) {
        delete miseEnRelationObject.salaire;
      }
      if (Number(salaire) < Number(app.get('contrat_smic'))) {
        res.status(400).json({
          message:
            'Le salaire doit être égal ou plus élevé que le minimum brut légal',
        });
        return;
      }
      const miseEnRelationRenouvellementInitiee = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          statut: 'renouvellement_initiee',
          'conseiller.$id': miseEnRelation.conseiller.oid,
        });
      if (miseEnRelationRenouvellementInitiee) {
        res.status(409).json({
          message: `Renouvellement déjà effectué pour le conseiller ${miseEnRelation.conseillerObj.nom} ${miseEnRelation.conseillerObj.prenom}`,
        });
        return;
      }
      const duplicateMiseEnRelation = {
        ...miseEnRelationObject,
        _id: new ObjectId(),
        typeDeContrat,
        dateDebutDeContrat: new Date(dateDebutDeContrat),
        banniereValidationRenouvellement: false,
        emetteurRenouvellement: {
          date: new Date(),
          email: req.user?.name,
        },
        miseEnRelationConventionnement: miseEnRelation._id,
        statut: 'renouvellement_initiee',
        phaseConventionnement: PhaseConventionnement.PHASE_2,
        createdAt: new Date(),
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
      if (salaire) {
        duplicateMiseEnRelation.salaire = Number(salaire.replace(',', '.'));
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
