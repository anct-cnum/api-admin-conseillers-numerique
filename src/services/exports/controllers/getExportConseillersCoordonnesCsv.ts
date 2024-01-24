import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import {
  filterRegionConseillerObj,
  filterDepartementConseillerObj,
  filterNomConseillerObj,
} from '../../misesEnRelation/misesEnRelation.repository';
import { filterNomStructure } from '../../conseillers/repository/conseillers.repository';
import { generateCsvConseillersCoordonnes } from '../exports.repository';
import { getNombreCras } from '../../cras/cras.repository';
import { action } from '../../../helpers/accessControl/accessList';

interface IConseillerCoordonne {
  _id: ObjectId;
  idPG: number;
  nom: string;
  prenom: string;
  emailPerso: string;
  emailCN: string;
  mattermostId: string;
  nomStructure: string;
  codePostal: string;
  certificationPix: string;
  nomSuperieurHierarchique: string;
  prenomSuperieurHierarchique: string;
  fonctionSuperieurHierarchique: string;
  emailSuperieurHierarchique: string;
  telephoneSuperieurHierarchique: string;
}

const getExportConseillersCoordonnesCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      ordre,
      nomOrdre,
      searchByConseiller,
      searchByStructure,
      region,
      departement,
    } = req.query;

    const dateDebut: Date = new Date(req.query.dateDebut as string);
    const dateFin: Date = new Date(req.query.dateFin as string);

    const items: { total: number; data: object } = {
      total: 0,
      data: [],
    };
    const sortColonne = JSON.parse(`{"conseillerObj.${nomOrdre}":${ordre}}`);

    try {
      const query = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .getQuery();

      const coordonnes = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $match: {
              statut: 'finalisee',
              ...filterNomStructure(searchByStructure),
              ...filterRegionConseillerObj(region),
              ...filterDepartementConseillerObj(departement),
              ...filterNomConseillerObj(searchByConseiller),
              $and: [query],
            },
          },
          {
            $project: {
              idPG: '$conseillerObj.idPG',
              nom: '$conseillerObj.nom',
              prenom: '$conseillerObj.prenom',
              emailPerso: '$conseillerObj.email',
              emailCN: '$conseillerObj.emailCN.address',
              mattermostId: '$conseillerObj.mattermost.id',
              nomStructure: '$structureObj.nom',
              codePostal: '$conseillerObj.codePostal',
              certificationPix: '$conseillerObj.certificationPixFormation',
              nomSuperieurHierarchique: '$conseillerObj.supHierarchique.nom',
              prenomSuperieurHierarchique:
                '$conseillerObj.supHierarchique.prenom',
              fonctionSuperieurHierarchique:
                '$conseillerObj.supHierarchique.fonction',
              emailSuperieurHierarchique:
                '$conseillerObj.supHierarchique.email',
              telephoneSuperieurHierarchique:
                '$conseillerObj.supHierarchique.numeroTelephone',
            },
          },
          {
            $sort: sortColonne,
          },
        ]);

      const promises = coordonnes.map(
        async (coordonne: IConseillerCoordonne) => {
          const craCount = await getNombreCras(app, req)(coordonne._id);
          const dernierCRA = await app
            .service(service.cras)
            .Model.findOne({
              'conseiller.$id': coordonne._id,
            })
            .sort({ createdAt: -1 })
            .limit(1);

          if (
            dernierCRA &&
            (dernierCRA.createdAt < dateDebut || dernierCRA.createdAt > dateFin)
          ) {
            return null;
          }
          return {
            ...coordonne,
            craCount,
          };
        },
      );

      const conseillersCoordonnes = await (
        await Promise.all(promises)
      ).filter((item) => item !== null);

      if (coordonnes.length > 0) {
        items.data = conseillersCoordonnes;
        items.total = conseillersCoordonnes.length;
      }

      generateCsvConseillersCoordonnes(conseillersCoordonnes, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportConseillersCoordonnesCsv;
