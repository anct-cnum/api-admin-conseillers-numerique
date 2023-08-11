import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { generateCsvHistoriqueDossiersConvention } from '../exports.repository';
import { validHistoriqueConvention } from '../../../schemas/reconventionnement.schemas';
import {
  checkAccessReadRequestStructures,
  filterDepartement,
  filterRegion,
  filterSearchBar,
} from '../../structures/repository/structures.repository';
import {
  filterDateDemandeAndStatutHistorique,
  sortArrayConventionnement,
} from '../../structures/repository/reconventionnement.repository';
import { getCoselec } from '../../../utils';
import { StatutConventionnement } from '../../../ts/enum';
import { checkAccessReadRequestMisesEnRelation } from '../../misesEnRelation/misesEnRelation.repository';

const formatStatutDemande = (statut: string) => {
  switch (statut) {
    case StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ:
    case StatutConventionnement.CONVENTIONNEMENT_VALIDÉ:
    case 'validee':
      return 'Validée';
    case StatutConventionnement.RECONVENTIONNEMENT_REFUSÉ:
    case 'refusee':
      return 'Refusée';
    default:
      return statut;
  }
};

const getContratsRecruterRenouveler =
  (app: Application, checkAccess) => async (idStructure: ObjectId) =>
    app.service(service.misesEnRelation).Model.aggregate([
      {
        $match: {
          $and: [checkAccess],
          'structure.$id': idStructure,
          statut: { $in: ['terminee', 'finalisee'] },
        },
      },
      {
        $group: {
          _id: '$statut',
          count: { $sum: 1 },
        },
      },
    ]);

const getExportHistoriqueDossiersConventionCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { type, nomOrdre, ordre, searchByNomStructure, region, departement } =
      req.query;
    const dateDebut: Date = new Date(req.query.dateDebut);
    const dateFin: Date = new Date(req.query.dateFin);
    dateDebut.setUTCHours(0, 0, 0, 0);
    dateFin.setUTCHours(23, 59, 59, 59);
    let structuresFormat = [];

    const pageValidation = validHistoriqueConvention.validate({
      type,
      dateDebut,
      dateFin,
      nomOrdre,
      ordre,
      searchByNomStructure,
      region,
      departement,
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
          { $addFields: { idPGStr: { $toString: '$idPG' } } },
          {
            $match: {
              $and: [
                checkAccessStructure,
                filterDateDemandeAndStatutHistorique(type, dateDebut, dateFin),
                filterSearchBar(searchByNomStructure),
              ],
              ...filterRegion(region),
              ...filterDepartement(departement),
            },
          },
          {
            $project: {
              _id: 1,
              nom: 1,
              idPG: 1,
              type: 1,
              codeRegion: 1,
              codeDepartement: 1,
              statut: 1,
              conventionnement: 1,
              coselec: 1,
              demandesCoselec: 1,
            },
          },
        ]);
      const checkAccess = checkAccessReadRequestMisesEnRelation(app, req);
      if (type === 'avenantAjoutPoste' || type === 'toutes') {
        const structureWithAvenant = structures.filter(
          (structure) => structure?.demandesCoselec?.length > 0,
        );
        if (structureWithAvenant.length > 0) {
          const avenantsAjoutPoste = await Promise.all(
            structureWithAvenant.map(async (structure) => {
              const avenants = structure.demandesCoselec.filter(
                (demande) =>
                  demande.type === 'ajout' && demande.statut === 'validee',
              );
              if (avenants.length === 0) {
                return [];
              }
              const misesEnRelation = await getContratsRecruterRenouveler(
                app,
                checkAccess,
              )(structure._id);
              const coselec = getCoselec(structure);
              const avenantsFormat = avenants.map((avenant) => {
                const item = { ...avenant };
                item.idPG = structure.idPG;
                item.nom = structure.nom;
                item.nbPostesSouhaites = avenant.nombreDePostesAccordes;
                item.nbPostesAttribuees =
                  coselec?.nombreConseillersCoselec ?? 0;
                item.dateDeCreation = avenant.emetteurAvenant.date;
                item.dateSorted = avenant.emetteurAvenant.date;
                item.statut = 'Avenant · ajout de poste';
                item.statutDemande = formatStatutDemande(avenant.statut);
                item.codeDepartement = structure.codeDepartement;
                item.codeRegion = structure.codeRegion;
                item.statutStructure = structure.statut;
                item.nbContratsValides =
                  misesEnRelation.find(
                    (miseEnRelation) => miseEnRelation?._id === 'finalisee',
                  )?.count ?? 0;
                item.nbContratsRenouveles =
                  misesEnRelation.find(
                    (miseEnRelation) => miseEnRelation?._id === 'terminee',
                  )?.count ?? 0;
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
                (demande) =>
                  demande.type === 'retrait' && demande.statut === 'validee',
              );
              if (avenants.length === 0) {
                return [];
              }
              const misesEnRelation = await getContratsRecruterRenouveler(
                app,
                checkAccess,
              )(structure._id);
              const coselec = getCoselec(structure);
              const avenantsFormat = avenants.map((avenant) => {
                const item = { ...avenant };
                item.idPG = structure.idPG;
                item.statut = structure.statut;
                item.nom = structure.nom;
                item.nbPostesSouhaites = avenant.nombreDePostesRendus;
                item.nbPostesAttribuees =
                  coselec?.nombreConseillersCoselec ?? 0;
                item.dateDeCreation = avenant.emetteurAvenant.date;
                item.dateSorted = avenant.emetteurAvenant.date;
                item.statut = 'Avenant · poste rendu';
                item.codeDepartement = structure.codeDepartement;
                item.codeRegion = structure.codeRegion;
                item.statutStructure = structure.statut;
                item.statutDemande = formatStatutDemande(avenant.statut);
                item.nbContratsValides =
                  misesEnRelation.find(
                    (miseEnRelation) => miseEnRelation._id === 'finalisee',
                  )?.count ?? 0;
                item.nbContratsRenouveles =
                  misesEnRelation.find(
                    (miseEnRelation) => miseEnRelation._id === 'terminee',
                  )?.count ?? 0;
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
        const filterStructures = structures.filter(
          (structure) =>
            structure?.conventionnement?.statut ===
              StatutConventionnement.CONVENTIONNEMENT_VALIDÉ ||
            structure?.conventionnement?.statut ===
              StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ ||
            structure?.conventionnement?.statut ===
              StatutConventionnement.RECONVENTIONNEMENT_REFUSÉ,
        );
        const conventionnement = await Promise.all(
          filterStructures.map(async (structure) => {
            const item = { ...structure };
            const misesEnRelation = await getContratsRecruterRenouveler(
              app,
              checkAccess,
            )(structure._id);
            const coselec = getCoselec(item);
            if (
              item.conventionnement.statut ===
              StatutConventionnement.CONVENTIONNEMENT_VALIDÉ
            ) {
              item.dateSorted =
                item.conventionnement?.dossierConventionnement?.dateDeCreation;
              item.statut = 'Conventionnement';
            }
            if (
              item.conventionnement.statut ===
                StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ ||
              item.conventionnement.statut ===
                StatutConventionnement.RECONVENTIONNEMENT_REFUSÉ
            ) {
              item.dateSorted =
                item.conventionnement?.dossierReconventionnement
                  ?.dateDeCreation;
              item.dateFinPremierContrat =
                item.conventionnement?.dossierReconventionnement
                  ?.dateFinProchainContrat;
              item.statut = 'Reconventionnement';
            }
            item.statutDemande = formatStatutDemande(
              item?.conventionnement?.statut,
            );
            item.statutStructure = structure.statut;
            item.nbPostesAttribuees = coselec?.nombreConseillersCoselec ?? 0;
            item.nbContratsValides =
              misesEnRelation.find(
                (miseEnRelation) => miseEnRelation?._id === 'finalisee',
              )?.count ?? 0;
            item.nbContratsRenouveles =
              misesEnRelation.find(
                (miseEnRelation) => miseEnRelation?._id === 'terminee',
              )?.count ?? 0;
            return item;
          }),
        );
        if (conventionnement.length > 0) {
          structuresFormat = structuresFormat.concat(conventionnement);
        }
      }
      const structureSort = sortArrayConventionnement(structuresFormat, ordre);
      generateCsvHistoriqueDossiersConvention(structureSort, res);
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
