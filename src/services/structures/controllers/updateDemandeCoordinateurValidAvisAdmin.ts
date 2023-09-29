import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { GraphQLClient } from 'graphql-request';
import dayjs from 'dayjs';
import {
  IConfigurationDemarcheSimplifiee,
  IRequest,
} from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { queryGetDossierDemarcheSimplifiee } from '../repository/reconventionnement.repository';
import { getCoselec } from '../../../utils';
import { IStructures } from '../../../ts/interfaces/db.interfaces';

const { Pool } = require('pg');

const updateStructurePG = (pool) => async (idPG: number, datePG: string) => {
  try {
    await pool.query(
      `
      UPDATE djapp_hostorganization
      SET (updated) = $2
      WHERE id = $1`,
      [idPG, datePG],
    );
  } catch (error) {
    throw new Error(error);
  }
};

const updateDemandeCoordinateurValidAvisAdmin =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const pool = new Pool();
    const { idDemandeCoordinateur } = req.body;
    if (
      !ObjectId.isValid(idStructure) ||
      !ObjectId.isValid(idDemandeCoordinateur)
    ) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }
    const updatedDemandeCoordinateur = {
      $set: {
        'demandesCoordinateur.$.statut': 'validee',
        'demandesCoordinateur.$.banniereValidationAvisAdmin': true,
        'demandesCoordinateur.$.banniereInformationAvisStructure': true,
      },
    };
    const updatedDemandeCoordinateurMiseEnRelation = {
      $set: {
        'structureObj.demandesCoordinateur.$.statut': 'validee',
        'structureObj.demandesCoordinateur.$.banniereValidationAvisAdmin': true,
        'structureObj.demandesCoordinateur.$.banniereInformationAvisStructure':
          true,
      },
    };
    try {
      const structure: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          _id: new ObjectId(idStructure),
          $or: [
            {
              statut: 'VALIDATION_COSELEC',
            },
            {
              coordinateurCandidature: true,
              statut: 'CREEE',
            },
          ],
          demandesCoordinateur: {
            $elemMatch: {
              id: { $eq: new ObjectId(idDemandeCoordinateur) },
            },
          },
        });
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      const demarcheSimplifiee: IConfigurationDemarcheSimplifiee = app.get(
        'demarche_simplifiee',
      );

      const graphQLClient = new GraphQLClient(demarcheSimplifiee.endpoint, {
        headers: {
          authorization: `Bearer ${demarcheSimplifiee.token_api}`,
          'content-type': 'application/json',
        },
      });
      const dossier: any | Error = await graphQLClient
        .request(queryGetDossierDemarcheSimplifiee(), {
          dossierNumber: structure.demandesCoordinateur[0].dossier.numero,
        })
        .catch(() => {
          return new Error("Le dossier n'existe pas");
        });
      if (dossier instanceof Error) {
        res.status(404).json({
          message: dossier.message,
        });
        return;
      }
      const champsFormulaire = dossier?.dossier?.champs?.filter(
        (champ) => champ.id === 'Q2hhbXAtMzQ2MzcxNQ==',
      );
      const coselec = getCoselec(structure);
      if (
        (champsFormulaire.length > 0 &&
          champsFormulaire[0].stringValue === 'Non') ||
        structure.statut === 'CREEE'
      ) {
        const nombreConseillersCoselec = coselec.nombreConseillersCoselec ?? 0;
        const nombreConseillersValider = Number(nombreConseillersCoselec) + 1;
        Object.assign(updatedDemandeCoordinateur, {
          $push: {
            coselec: {
              nombreConseillersCoselec: nombreConseillersValider,
              avisCoselec: 'POSITIF',
              insertedAt: new Date(),
            },
          },
        });
        Object.assign(updatedDemandeCoordinateurMiseEnRelation.$set, {
          $push: {
            'structureObj.coselec': {
              nombreConseillersCoselec: nombreConseillersValider,
              avisCoselec: 'POSITIF',
              insertedAt: new Date(),
            },
          },
        });
      }
      if (structure.statut === 'CREEE') {
        const updatedAt = new Date();
        const datePG = dayjs(updatedAt).format('YYYY-MM-DD');
        Object.assign(updatedDemandeCoordinateur.$set, {
          statut: 'VALIDATION_COSELEC',
          updatedAt,
        });
        Object.assign(updatedDemandeCoordinateurMiseEnRelation.$set, {
          'structureObj.statut': 'VALIDATION_COSELEC',
          'structureObj.updatedAt': updatedAt,
        });
        await updateStructurePG(pool)(structure.idPG, datePG);
      }
      const structureUpdated = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            _id: structure._id,
            demandesCoordinateur: {
              $elemMatch: {
                id: { $eq: new ObjectId(idDemandeCoordinateur) },
              },
            },
          },
          updatedDemandeCoordinateur,
        );
      if (structureUpdated.modifiedCount === 0) {
        res
          .status(404)
          .json({ message: "La structure n'a pas été mise à jour" });
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
                id: { $eq: new ObjectId(idDemandeCoordinateur) },
              },
            },
          },
          updatedDemandeCoordinateurMiseEnRelation,
        );
      res.status(200).json({ success: true });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateDemandeCoordinateurValidAvisAdmin;
