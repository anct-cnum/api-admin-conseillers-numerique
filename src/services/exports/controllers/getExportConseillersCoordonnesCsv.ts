import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import {
  filterRegionConseillerObj,
  filterDepartementConseillerObj,
  checkAccessReadRequestMisesEnRelation,
} from '../../misesEnRelation/misesEnRelation.repository';
import {
  filterNomAndEmailConseiller,
  filterNomStructure,
} from '../../conseillers/repository/conseillers.repository';
import { generateCsvConseillersCoordonnes } from '../exports.repository';
import { getNombreCras } from '../../cras/cras.repository';

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

    const sortColonne = JSON.parse(`{"conseillerObj.${nomOrdre}":${ordre}}`);

    const checkAccessMiseEnRelation =
      await checkAccessReadRequestMisesEnRelation(app, req);

    try {
      const coordonnes = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $addFields: {
              nomPrenomStr: {
                $concat: ['$conseillerObj.nom', ' ', '$conseillerObj.prenom'],
              },
            },
          },
          {
            $addFields: {
              prenomNomStr: {
                $concat: ['$conseillerObj.prenom', ' ', '$conseillerObj.nom'],
              },
            },
          },
          { $addFields: { idPGStr: { $toString: '$conseillerObj.idPG' } } },
          {
            $match: {
              statut: 'finalisee',
              ...filterNomStructure(searchByStructure),
              ...filterRegionConseillerObj(region),
              ...filterDepartementConseillerObj(departement),
              ...filterNomAndEmailConseiller(searchByConseiller),
              $and: [checkAccessMiseEnRelation],
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
          const compteCoopActif = coordonne.emailCN && coordonne.mattermostId;
          return {
            ...coordonne,
            compteCoopActif,
            craCount,
          };
        },
      );

      const conseillersCoordonnes = await (
        await Promise.all(promises)
      ).filter((item) => item !== null);

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
