import { Application } from '@feathersjs/express';
import { Response } from 'express';
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
import {
  PhaseConventionnement,
  StatutConventionnement,
} from '../../../ts/enum';
import {
  findDepartementNameByNumDepartement,
  findRegionNameByNumDepartement,
} from '../../../helpers/commonQueriesFunctions';
import { getCoselec, getCoselecConventionnement } from '../../../utils';

const formatAvenant = (avenant, structure) => {
  const item = { ...avenant };
  item.idPG = structure.idPG;
  item.siret = structure.siret;
  item.dateSorted = avenant.emetteurAvenant?.date;
  item.nbPostesAvantDemande = avenant.nbPostesAvantDemande ?? 0;
  item.nbPostesApresDemande =
    avenant.type === 'ajout'
      ? (avenant.nbPostesAvantDemande || 0) +
        (avenant.nombreDePostesAccordes || 0)
      : (avenant.nbPostesAvantDemande || 0) -
        (avenant.nombreDePostesRendus || 0);
  item.variation =
    (item.nbPostesApresDemande || 0) - (avenant.nbPostesAvantDemande || 0);
  item.numeroDossierDS =
    structure.conventionnement?.statut ===
    StatutConventionnement.CONVENTIONNEMENT_VALIDÉ
      ? structure.conventionnement?.dossierConventionnement?.numero
      : structure.conventionnement?.dossierReconventionnement?.numero;
  item.codeDepartement = structure.codeDepartement;
  item.departement = findDepartementNameByNumDepartement(
    structure.codeDepartement,
    structure.codeCom,
  );
  item.region = findRegionNameByNumDepartement(
    structure.codeDepartement,
    structure.codeCom,
  );

  return item;
};

const getExportHistoriqueDossiersConventionCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    const {
      type,
      nomOrdre,
      ordre,
      searchByNomStructure,
      region,
      departement,
      avisANCT,
    } = req.query;
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
      avisANCT,
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
                filterDateDemandeAndStatutHistorique(
                  type,
                  dateDebut,
                  dateFin,
                  avisANCT,
                ),
                filterSearchBar(searchByNomStructure),
              ],
              ...filterRegion(region),
              ...filterDepartement(departement),
            },
          },
          {
            $project: {
              _id: 1,
              siret: 1,
              idPG: 1,
              type: 1,
              codeRegion: 1,
              codeDepartement: 1,
              statut: 1,
              conventionnement: 1,
              coselec: 1,
              demandesCoselec: 1,
              codeCom: 1,
            },
          },
        ]);
      if (type === 'avenantAjoutPoste' || type === 'toutes') {
        const structureWithAvenant = structures.filter(
          (structure) => structure?.demandesCoselec?.length > 0,
        );
        if (structureWithAvenant.length > 0) {
          const avenantsAjoutPoste = await Promise.all(
            structureWithAvenant.map(async (structure) => {
              const avenants = structure.demandesCoselec.filter(
                (demande) =>
                  (demande.statut === 'validee' ||
                    demande.statut === 'refusee') &&
                  demande.type === 'ajout',
              );
              if (avenants.length === 0) {
                return [];
              }
              const avenantsFormat = avenants.map((avenant) => {
                const avenantFormat = formatAvenant(avenant, structure);
                avenantFormat.nbPostesSouhaites =
                  avenant.nombreDePostesAccordes;
                avenantFormat.statut = 'Avenant · ajout de poste';

                return avenantFormat;
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
              const avenantsFormat = avenants.map((avenant) => {
                const avenantFormat = formatAvenant(avenant, structure);
                avenantFormat.nbPostesSouhaites = avenant.nombreDePostesRendus;
                avenantFormat.statut = 'Avenant · poste rendu';

                return avenantFormat;
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
      const conventionnementTypes = [
        'toutes',
        'conventionnement',
        'reconventionnement',
      ];
      if (conventionnementTypes.includes(type)) {
        const filterStructures = structures.filter(
          (structure) =>
            structure?.conventionnement?.statut ===
              StatutConventionnement.CONVENTIONNEMENT_VALIDÉ ||
            structure?.conventionnement?.statut ===
              StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ,
        );
        const conventionnement = await Promise.all(
          filterStructures.map(async (structure) => {
            const item = { ...structure };
            if (
              item.conventionnement.statut ===
              StatutConventionnement.CONVENTIONNEMENT_VALIDÉ
            ) {
              const dossierConventionnement =
                item.conventionnement?.dossierConventionnement;
              item.dateSorted = dossierConventionnement?.dateDeCreation;
              item.phaseConventionnement = PhaseConventionnement.PHASE_1;
              item.type = 'Conventionnement initial';
              item.numeroDossierDS = dossierConventionnement?.numero;
              item.nbPostesAvantDemande = 0;
              item.nbPostesApresDemande =
                getCoselecConventionnement(item)?.nombreConseillersCoselec ?? 0;
              item.variation = item.nbPostesApresDemande;
            }
            if (
              item.conventionnement.statut ===
              StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ
            ) {
              const dossierReconventionnement =
                item.conventionnement?.dossierReconventionnement;
              const valideCoselec =
                getCoselec(item)?.nombreConseillersCoselec ?? 0;
              item.dateSorted = dossierReconventionnement?.dateDeCreation;
              item.phaseConventionnement = PhaseConventionnement.PHASE_2;
              item.type = 'Reconventionnement';
              item.numeroDossierDS = dossierReconventionnement?.numero;
              item.nbPostesAvantDemande = valideCoselec;
              item.nbPostesApresDemande = valideCoselec;
              item.variation = 0;
            }
            item.departement = findDepartementNameByNumDepartement(
              structure.codeDepartement,
              structure.codeCom,
            );
            item.region = findRegionNameByNumDepartement(
              structure.codeDepartement,
              structure.codeCom,
            );
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
