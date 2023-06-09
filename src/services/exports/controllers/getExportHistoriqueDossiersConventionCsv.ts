import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { generateCsvHistoriqueDossiersConvention } from '../exports.repository';
import { validHistoriqueConvention } from '../../../schemas/reconventionnement.schemas';
import { checkAccessReadRequestStructures } from '../../structures/repository/structures.repository';
import { filterDateDemandeAndStatutHistorique } from '../../structures/repository/reconventionnement.repository';
import { getCoselec } from '../../../utils';

const getExportHistoriqueDossiersConventionCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { type } = req.query;
    const dateDebut: Date = new Date(req.query.dateDebut);
    const dateFin: Date = new Date(req.query.dateFin);
    dateDebut.setUTCHours(0, 0, 0, 0);
    dateFin.setUTCHours(23, 59, 59, 59);
    const pageValidation = validHistoriqueConvention.validate({
      type,
      dateDebut,
      dateFin,
    });
    if (pageValidation.error) {
      res.status(400).json({ message: pageValidation.error.message });
      return;
    }
    try {
      const checkAccessStructure = await checkAccessReadRequestStructures(
        app,
        req,
      );
      const structures: any[] = await app
        .service(service.structures)
        .Model.aggregate([
          {
            $match: {
              $and: [checkAccessStructure],
              ...filterDateDemandeAndStatutHistorique(type, dateDebut, dateFin),
            },
          },
          {
            $project: {
              _id: 1,
              nom: 1,
              idPG: 1,
              nombreConseillersSouhaites: 1,
              statut: 1,
              conventionnement: 1,
              coselec: 1,
              demandesCoselec: 1,
            },
          },
        ]);
      let structuresFormat = [];
      if (type === 'avenantAjoutPoste' || type === 'toutes') {
        const structureWithAvenant = structures.filter(
          (structure) => structure?.demandesCoselec?.length > 0,
        );
        if (structureWithAvenant.length > 0) {
          const avenantsAjoutPoste = await Promise.all(
            structureWithAvenant.map(async (structure) => {
              const avenants = structure.demandesCoselec.filter(
                (demande) => demande.type === 'ajout',
              );
              if (avenants.length === 0) {
                return [];
              }
              const avenantsFormat = avenants.map((avenant) => {
                const item = { ...avenant };
                item._id = structure._id;
                item.nom = structure.nom;
                item.nbPostesAttribuees = avenant.nombreDePostesAccorder;
                item.dateDeCreation = avenant.emetteurAvenant.date;
                item.statut = 'Avenant · ajout de poste';
                return item;
              });
              return avenantsFormat;
            }),
          );
          const avenantsAjoutPosteFlat = avenantsAjoutPoste.flat(1);
          if (avenantsAjoutPosteFlat.length > 0) {
            structuresFormat = structuresFormat.concat(avenantsAjoutPosteFlat);
          }
        }
      }
      if (type === 'avenantRenduPoste' || type === 'toutes') {
        const structureWithAvenant = structures.filter(
          (structure) => structure?.demandesCoselec?.length > 0,
        );
        if (structureWithAvenant.length > 0) {
          const avenantsRenduPoste = await Promise.all(
            structureWithAvenant.map(async (structure) => {
              const avenants = structure.demandesCoselec.filter(
                (demande) => demande.type === 'rendu',
              );
              if (avenants.length === 0) {
                return [];
              }
              const avenantsFormat = avenants.map((avenant) => {
                const item = { ...avenant };
                item._id = structure._id;
                item.nom = structure.nom;
                item.nbPostesAttribuees = avenant.nombreDePostesAccorder;
                item.dateDeCreation = avenant.emetteurAvenant.date;
                item.statut = 'Avenant · poste rendu';
                return item;
              });
              return avenantsFormat;
            }),
          );
          const avenantsRenduPosteFlat = avenantsRenduPoste.flat(1);
          if (avenantsRenduPosteFlat.length > 0) {
            structuresFormat = structuresFormat.concat(avenantsRenduPosteFlat);
          }
        }
      }
      if (type === 'toutes' || type.includes('tionnement')) {
        const conventionnement = await Promise.all(
          structures.map(async (structure) => {
            const item = { ...structure };
            if (item.conventionnement.statut === 'CONVENTIONNEMENT_VALIDÉ') {
              const coselec = getCoselec(item);
              item.nbPostesAttribuees = coselec?.nombreConseillersCoselec ?? 0;
              item.dateDeCreation =
                item.conventionnement.dossierConventionnement.dateDeCreation;
              item.statut = 'Conventionnement';

              return item;
            }
            item.nbPostesAttribuees =
              item.conventionnement.dossierReconventionnement.nbPostesAttribuees;
            item.dateDeCreation =
              item.conventionnement.dossierReconventionnement.dateDeCreation;
            item.statut = 'Reconventionnement';

            return item;
          }),
        );
        if (conventionnement.length > 0) {
          structuresFormat = structuresFormat.concat(conventionnement);
        }
      }
      generateCsvHistoriqueDossiersConvention(structuresFormat, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportHistoriqueDossiersConventionCsv;
