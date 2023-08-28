import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { GraphQLClient } from 'graphql-request';
import {
  IConfigurationDemarcheSimplifiee,
  IRequest,
} from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { queryGetDossierDemarcheSimplifiee } from '../repository/reconventionnement.repository';

const getDetailDemandeCoordinateur =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { idDemande } = req.query;
    try {
      if (!ObjectId.isValid(idStructure) || !ObjectId.isValid(idDemande)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne(
          {
            _id: new ObjectId(idStructure),
            demandesCoordinateur: {
              $elemMatch: {
                id: new ObjectId(idDemande),
              },
            },
          },
          {
            'demandesCoordinateur.$': 1,
            idPG: 1,
            nom: 1,
            contact: 1,
          },
        );
      if (!structure) {
        res.status(404).json({
          message: "La structure n'existe pas",
        });
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
      // les champs à ne pas afficher
      const champsFormulaire = dossier?.dossier?.champs // à modifier quand le formulaire DS sera publié
        ?.slice(5)
        ?.filter(
          (champ) =>
            champ.id !== 'Q2hhbXAtMzQ4MzAzOQ==' &&
            champ.id !== 'Q2hhbXAtMzI3MTQ1MA==' &&
            champ.id !== 'Q2hhbXAtMzI3MTQ0OQ==' &&
            champ.id !== 'Q2hhbXAtMzI3MTQxNQ==',
        );
      const structureFormat = structure.toObject();
      structureFormat.questionnaire = [];
      champsFormulaire.forEach((champ) => {
        if (champ?.checked === false) {
          Object.assign(champ, { stringValue: 'Non' });
        }
        if (champ?.checked === true) {
          Object.assign(champ, { stringValue: 'Oui' });
        }
        if (champ?.stringValue === '') {
          Object.assign(champ, { stringValue: 'Sans réponse' });
        }
        structureFormat.questionnaire.push({
          question: champ.label,
          reponse: champ.stringValue,
        });
      });
      res.status(200).json(structureFormat);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getDetailDemandeCoordinateur;
