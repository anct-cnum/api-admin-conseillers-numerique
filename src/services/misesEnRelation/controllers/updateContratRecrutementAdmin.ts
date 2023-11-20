import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { validCreationContrat } from '../../../schemas/contrat.schemas';
import getCandidatContratById from '../../conseillers/controllers/getCandidatContratById';

const updateContratRecrutementAdmin =
  (app: Application) => async (req: IRequest, res: Response) => {
    const miseEnrelationId = req.params.idMiseEnRelation;
    const conseillerId = req.params.idConseiller;
    const {
      typeDeContrat,
      dateDebutDeContrat,
      dateFinDeContrat,
      salaire,
      isRecrutementCoordinateur,
    } = req.body;

    if (
      !ObjectId.isValid(miseEnrelationId) ||
      !ObjectId.isValid(conseillerId)
    ) {
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
      const miseEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(miseEnrelationId) });
      if (!miseEnRelation) {
        res.status(404).json({ message: "La mise en relation n'existe pas" });
        return;
      }
      const conseiller = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          _id: new ObjectId(conseillerId),
        });
      if (!conseiller) {
        res.status(404).json({ message: 'Candidat non trouvé' });
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
        contratUpdated.$set.salaire = Number(salaire.replace(',', '.'));
      } else {
        contratUpdated.$unset = { salaire: '' };
      }
      if (isRecrutementCoordinateur) {
        contratUpdated.$set.contratCoordinateur = isRecrutementCoordinateur;
      } else {
        contratUpdated.$unset = { contratCoordinateur: '' };
        if (miseEnRelation?.contratCoordinateur) {
          const structureUpdated = await app
            .service(service.structures)
            .Model.accessibleBy(req.ability, action.update)
            .updateOne(
              {
                _id: miseEnRelation.structureObj._id,
                demandesCoordinateur: {
                  $elemMatch: {
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
                'structure.$id': miseEnRelation.structureObj._id,
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
            statut: 'recrutee',
            'conseiller.$id': conseiller._id,
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
      await getCandidatContratById(app)(req, res);
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateContratRecrutementAdmin;
