import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { getCoselec } from '../../../utils';

const getCandidatByIdStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;

    try {
      if (!ObjectId.isValid(idConseiller)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne();

      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      // Attention : pas d'access control car tout le monde peut voir tous les candidats
      const candidat = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $match: {
              'conseiller.$id': new ObjectId(idConseiller),
              'structure.$id': structure._id,
            },
          },
          {
            $lookup: {
              localField: 'conseillerObj._id',
              from: 'conseillers',
              foreignField: '_id',
              as: 'conseiller',
            },
          },
          { $unwind: '$conseiller' },
          {
            $project: {
              statut: 1,
              dateRecrutement: 1,
              dateRupture: 1,
              motifRupture: 1,
              estDiplomeMedNum: '$conseiller.estDiplomeMedNum',
              prenom: '$conseiller.prenom',
              nom: '$conseiller.nom',
              email: '$conseiller.email',
              telephone: '$conseiller.telephone',
              nomCommune: '$conseiller.nomCommune',
              estEnEmploi: '$conseiller.estEnEmploi',
              dateDisponibilite: '$conseiller.dateDisponibilite',
              distanceMax: '$conseiller.distanceMax',
              codePostal: '$conseiller.codePostal',
              nomDiplomeMedNum: '$conseiller.nomDiplomeMedNum',
              aUneExperienceMedNum: '$conseiller.aUneExperienceMedNum',
              pix: '$conseiller.pix',
              cv: '$conseiller.cv',
              idConseiller: '$conseiller._id',
              idPG: '$conseiller.idPG',
            },
          },
        ]);

      if (candidat.length === 0) {
        res.status(404).json({ message: 'Candidat non trouvé' });
        return;
      }
      const candidatFormat = {
        ...candidat[0],
        miseEnRelation: {
          _id: candidat[0]._id,
          statut: candidat[0].statut,
          dateRecrutement: candidat[0].dateRecrutement,
          dateRupture: candidat[0].dateRupture,
          motifRupture: candidat[0].motifRupture,
        },
        _id: candidat[0].idConseiller,
        coselec: getCoselec(structure),
      };
      delete candidatFormat.idConseiller;
      delete candidatFormat.statut;
      delete candidatFormat.dateRecrutement;
      delete candidatFormat.dateRupture;
      delete candidatFormat.motifRupture;
      res.status(200).json(candidatFormat);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getCandidatByIdStructure;
