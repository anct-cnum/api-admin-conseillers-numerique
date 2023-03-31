import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import {
  checkAccessReadRequestStructures,
  formatAdresseStructure,
  formatQpv,
  formatType,
} from '../repository/structures.repository';
import {
  checkAccessRequestCras,
  getNombreAccompagnementsByArrayConseillerId,
  getNombreCrasByArrayConseillerId,
} from '../../cras/cras.repository';
import { getCoselec } from '../../../utils';

const getDetailStructureById =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    try {
      if (!ObjectId.isValid(idStructure)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const checkAccessStructure = await checkAccessReadRequestStructures(
        app,
        req,
      );
      const structure = await app.service(service.structures).Model.aggregate([
        {
          $match: {
            _id: new ObjectId(idStructure),
            $and: [checkAccessStructure],
          },
        },
        {
          $lookup: {
            from: 'misesEnRelation',
            let: {
              idStructure: '$_id',
            },
            as: 'misesEnRelation',
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      $expr: {
                        $eq: ['$$idStructure', '$structureObj._id'],
                      },
                    },
                    {
                      $expr: {
                        $or: [
                          { $eq: ['finalisee', '$statut'] },
                          { $eq: ['nouvelle_rupture', '$statut'] },
                          { $eq: ['recrutee', '$statut'] },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                $project: {
                  _id: 0,
                  statut: 1,
                  'conseillerObj.idPG': 1,
                  'conseillerObj.nom': 1,
                  'conseillerObj._id': 1,
                  'conseillerObj.prenom': 1,
                },
              },
            ],
          },
        },
        {
          $project: {
            idPG: 1,
            nom: 1,
            qpvStatut: 1,
            statut: 1,
            insee: 1,
            type: 1,
            siret: 1,
            codePostal: 1,
            createdAt: 1,
            coselec: 1,
            contact: 1,
            conseillers: '$misesEnRelation',
          },
        },
      ]);
      const checkAccessCras = await checkAccessRequestCras(app, req);

      const craCount = await getNombreCrasByArrayConseillerId(
        app,
        req,
      )(structure[0].conseillers?.map((conseiller) => conseiller._id));
      const accompagnementsCount =
        await getNombreAccompagnementsByArrayConseillerId(
          app,
          checkAccessCras,
        )(structure[0].conseillers?.map((conseiller) => conseiller._id));

      const users = await app.service(service.users).Model.aggregate([
        {
          $match: {
            'entity.$id': new ObjectId(idStructure),
          },
        },
        { $project: { name: 1, roles: 1, passwordCreated: 1 } },
      ]);
      const coselec = getCoselec(structure[0]);
      structure[0].posteValiderCoselec = coselec?.nombreConseillersCoselec;
      structure[0].craCount = craCount;
      structure[0].accompagnementCount = accompagnementsCount[0]?.total;
      structure[0].qpvStatut = formatQpv(structure[0].qpvStatut);
      structure[0].type = formatType(structure[0].type);
      structure[0].adresseFormat = formatAdresseStructure(structure[0].insee);
      structure[0].users = users;
      structure[0].conseillers = structure[0].conseillers?.map((conseiller) => {
        return {
          idPG: conseiller?.conseillerObj?.idPG,
          nom: conseiller?.conseillerObj?.nom,
          prenom: conseiller?.conseillerObj?.prenom,
          _id: conseiller?.conseillerObj?._id,
          statut: conseiller?.statut,
        };
      });
      structure[0].conseillersValider = structure[0].conseillers?.filter(
        (conseiller) => conseiller.statut === 'recrutee',
      );
      structure[0].conseillersRecruter = structure[0].conseillers?.filter(
        (conseiller) =>
          conseiller.statut === 'finalisee' ||
          conseiller.statut === 'nouvelle_rupture',
      );
      delete structure[0].conseillers;

      if (structure.length === 0) {
        res.status(404).json({ message: 'Structure non trouvée' });
        return;
      }

      res.status(200).json(structure[0]);
      return;
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getDetailStructureById;
