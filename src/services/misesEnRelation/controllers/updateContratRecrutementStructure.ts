import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { validCreationContrat } from '../../../schemas/contrat.schemas';
import { getCoselec } from '../../../utils';
import {
  countConseillersRecrutees,
  countCoordinateurRecrutees,
} from '../misesEnRelation.repository';
import getMiseEnRelationConseiller from './getMiseEnRelationConseiller';
import getMiseEnRelation from './getMiseEnRelation';
import {
  IMisesEnRelation,
  IStructures,
} from '../../../ts/interfaces/db.interfaces';

const updateContratRecrutementStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const miseEnrelationId = req.params.id;
    const {
      typeDeContrat,
      dateDebutDeContrat,
      dateFinDeContrat,
      salaire,
      isRecrutementCoordinateur,
    } = req.body;

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
        isRecrutementCoordinateur,
      });
      if (creationContrat.error) {
        res.status(400).json({ message: creationContrat.error.message });
        return;
      }
      const miseEnRelation: IMisesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(miseEnrelationId) });
      if (!miseEnRelation) {
        res.status(404).json({ message: "La mise en relation n'existe pas" });
        return;
      }
      const structure: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          _id: miseEnRelation.structureObj._id,
          statut: 'VALIDATION_COSELEC',
        });
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      const dernierCoselec = getCoselec(structure);
      if (dernierCoselec !== null) {
        // Nombre de candidats déjà recrutés pour cette structure
        const misesEnRelationRecrutees = await countConseillersRecrutees(
          app,
          req,
          structure._id,
        );
        let countMisesEnRelationRecruteesFutur =
          misesEnRelationRecrutees.length;
        if (miseEnRelation.statut === 'interessee') {
          countMisesEnRelationRecruteesFutur += 1; // prendre en compte celui qui va être recruté dans le quota
        }
        if (
          countMisesEnRelationRecruteesFutur >
          dernierCoselec.nombreConseillersCoselec
        ) {
          res.status(409).json({
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
      if (salaire) {
        contratUpdated.$set.salaire = Number(salaire.replace(',', '.'));
      } else {
        contratUpdated.$unset = { salaire: '' };
      }
      if (isRecrutementCoordinateur) {
        const misesEnRelationRecruteesCoordinateur =
          await countCoordinateurRecrutees(app, req, structure._id);
        let countMisesEnRelationRecruteesCoordinateurFutur =
          misesEnRelationRecruteesCoordinateur;
        if (miseEnRelation.statut === 'interessee') {
          countMisesEnRelationRecruteesCoordinateurFutur += 1; // prendre en compte celui qui va être recruté dans le quota
        }
        const countDemandesCoordinateurValider =
          structure.demandesCoordinateur.filter(
            (demande) => demande.statut === 'validee',
          ).length;
        if (
          countMisesEnRelationRecruteesCoordinateurFutur >
          countDemandesCoordinateurValider
        ) {
          res.status(409).json({
            message:
              'Action non autorisée : quota atteint de coordinateurs validés par rapport au nombre de postes attribués',
          });
          return;
        }
        contratUpdated.$set.contratCoordinateur = isRecrutementCoordinateur;
        if (!miseEnRelation?.contratCoordinateur) {
          const structureUpdated = await app
            .service(service.structures)
            .Model.accessibleBy(req.ability, action.update)
            .updateOne(
              {
                _id: structure._id,
                demandesCoordinateur: {
                  $elemMatch: {
                    statut: 'validee',
                    miseEnRelationId: { $exists: false },
                  },
                },
              },
              {
                $set: {
                  'demandesCoordinateur.$.miseEnRelationId': miseEnRelation._id,
                },
              },
            );
          if (structureUpdated.modifiedCount === 0) {
            res.status(404).json({
              message: "La structure n'a pas été mise à jour",
            });
            return;
          }
          await app
            .service(service.misesEnRelation)
            .Model.accessibleBy(req.ability, action.update)
            .updateMany(
              {
                'structure.$id': structure._id,
                'structureObj.demandesCoordinateur': {
                  $elemMatch: {
                    statut: 'validee',
                    miseEnRelationId: { $exists: false },
                  },
                },
              },
              {
                $set: {
                  'structureObj.demandesCoordinateur.$.miseEnRelationId':
                    miseEnRelation._id,
                },
              },
            );
        }
      } else {
        contratUpdated.$unset = { contratCoordinateur: '' };
        if (miseEnRelation?.contratCoordinateur) {
          const structureUpdated = await app
            .service(service.structures)
            .Model.accessibleBy(req.ability, action.update)
            .updateOne(
              {
                _id: structure._id,
                demandesCoordinateur: {
                  $elemMatch: {
                    statut: 'validee',
                    miseEnRelationId: miseEnRelation._id,
                  },
                },
              },
              {
                $unset: {
                  'demandesCoordinateur.$.miseEnRelationId': '',
                },
              },
            );
          if (structureUpdated.modifiedCount === 0) {
            res.status(404).json({
              message: "La structure n'a pas été mise à jour",
            });
            return;
          }
          await app
            .service(service.misesEnRelation)
            .Model.accessibleBy(req.ability, action.update)
            .updateMany(
              {
                'structure.$id': structure._id,
                'structureObj.demandesCoordinateur': {
                  $elemMatch: {
                    statut: 'validee',
                    miseEnRelationId: miseEnRelation._id,
                  },
                },
              },
              {
                $unset: {
                  'structureObj.demandesCoordinateur.$.miseEnRelationId': '',
                },
              },
            );
        }
      }
      const miseEnRelationUpdated = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: miseEnRelation._id,
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
      if (
        miseEnRelation.conseillerObj?.statut === 'RECRUTE' ||
        miseEnRelation.conseillerObj?.statut === 'RUPTURE'
      ) {
        await getMiseEnRelationConseiller(app)(req, res);
        return;
      }
      await getMiseEnRelation(app)(req, res);
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateContratRecrutementStructure;
