import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

import {
  getCodesPostauxStatistiquesCras,
  checkAccessRequestCras,
  createArrayForFiltreCodePostaux,
} from '../cras.repository';
import service from '../../../helpers/services';
import {
  IConseillers,
  IMisesEnRelation,
} from '../../../ts/interfaces/db.interfaces';

const getFiltresConseillerCrasParcoursRecrutement =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const idConseiller = req.query?.id;
      if (!ObjectId.isValid(idConseiller)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const conseiller: IConseillers = await app
        .service(service.conseillers)
        .Model.findOne({
          _id: new ObjectId(idConseiller),
          disponible: true,
        });
      if (!conseiller) {
        res.status(404).json({
          message: "Le conseiller n'existe pas ou il est non disponible",
        });
        return;
      }
      const structure = await app.service(service.structures).Model.findOne({
        _id: new ObjectId(req.user?.entity?.oid),
        statut: 'VALIDATION_COSELEC',
      });
      if (!structure) {
        res
          .status(404)
          .json({ message: "La structure n'existe pas ou n'est plus validée" });
        return;
      }
      const checkAccess = checkAccessRequestCras(app, req);
      const listCodePostaux = await getCodesPostauxStatistiquesCras(
        app,
        checkAccess,
      )([conseiller._id]);
      const miseEnRelations: IMisesEnRelation[] = await app
        .service(service.misesEnRelation)
        .Model.find({
          'conseiller.$id': idConseiller,
          statut: {
            $in: ['finalisee', 'finalisee_rupture', 'terminee_naturelle'],
          },
        });
      const listeStructures = miseEnRelations.map((miseEnRelation) => {
        return {
          structureId: miseEnRelation.structure.oid,
          nom: miseEnRelation.structureObj.nom,
          codePostal: miseEnRelation.structureObj.codePostal,
        };
      });
      const listeCodesPostaux =
        createArrayForFiltreCodePostaux(listCodePostaux);

      res.status(200).json({ listeCodesPostaux, listeStructures });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getFiltresConseillerCrasParcoursRecrutement;
