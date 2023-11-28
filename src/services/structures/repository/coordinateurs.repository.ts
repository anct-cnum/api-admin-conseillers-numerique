import { ObjectId } from 'mongodb';
import { Application } from '@feathersjs/express';
import {
  IDemandesCoordinateur,
  IStructures,
} from '../../../ts/interfaces/db.interfaces';
import { getTimestampByDate } from '../../../utils';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { countCoordinateurRecrutees } from '../../misesEnRelation/misesEnRelation.repository';

export interface ExtendedDemandesCoordinateur extends IDemandesCoordinateur {
  nomStructure?: string;
  codePostal?: string;
  idPG?: number;
  idStructure?: ObjectId;
}

const formatStatutDemandeCoordinateur = (statut: string) => {
  switch (statut) {
    case 'en_cours':
      return 'Nouvelle candidature';
    case 'validee':
      return 'Candidature validée';
    case 'refusee':
      return 'Non validée';
    default:
      return 'Non renseigné';
  }
};

const filterAvisPrefet = (avisPrefet: string | undefined) => {
  if (avisPrefet === undefined) {
    return {};
  }
  if (avisPrefet === 'sans-avis') {
    return { avisPrefet: { $exists: false } };
  }
  return { avisPrefet: { $eq: avisPrefet } };
};

const checkAvisPrefet = (
  filtreAvisPrefet: string,
  avisPrefet: string | undefined,
) => {
  if (filtreAvisPrefet === 'sans-avis' && avisPrefet === undefined) {
    return true;
  }
  if (avisPrefet === filtreAvisPrefet || filtreAvisPrefet === undefined) {
    return true;
  }
  return false;
};

const sortDemandesCoordinateurs = (
  demandesCoordinateurs: ExtendedDemandesCoordinateur[],
  nomOrdre: string,
  ordre: number,
) =>
  demandesCoordinateurs.sort((a, b) => {
    if (nomOrdre === 'codePostal') {
      if (a.codePostal < b.codePostal) {
        return ordre < 0 ? 1 : -1;
      }
      if (a.codePostal > b.codePostal) {
        return ordre;
      }
      return 0;
    }
    if (
      getTimestampByDate(a.dossier.dateDeCreation) <
      getTimestampByDate(b.dossier.dateDeCreation)
    ) {
      return ordre < 0 ? 1 : -1;
    }
    if (
      getTimestampByDate(a.dossier.dateDeCreation) >
      getTimestampByDate(b.dossier.dateDeCreation)
    ) {
      return ordre;
    }
    return 0;
  });

const checkQuotaRecrutementCoordinateur = async (
  app: Application,
  req: IRequest,
  structure: IStructures,
  idMiseEnRelation: ObjectId,
) => {
  const demandeCoordinateurValider: IDemandesCoordinateur[] | undefined =
    structure?.demandesCoordinateur?.filter(
      (demande) => demande.statut === 'validee',
    );
  if (demandeCoordinateurValider?.length > 0) {
    const countCoordinateurs = await countCoordinateurRecrutees(
      app,
      req,
      structure._id,
    );
    const quotaCoordinateurDisponible =
      demandeCoordinateurValider.length - countCoordinateurs;
    return {
      demandeCoordinateurValider: demandeCoordinateurValider.find(
        (demande) =>
          demande?.miseEnRelationId?.toString() === idMiseEnRelation.toString(),
      ),
      quotaCoordinateurDisponible,
    };
  }
  return {
    demandeCoordinateurValider: undefined,
    quotaCoordinateurDisponible: 0,
  };
};

const filterStatutAndAvisPrefetDemandesCoordinateur = (
  statutDemande: string,
  avisPrefet: string,
) => {
  if (statutDemande !== 'toutes') {
    return {
      demandesCoordinateur: {
        $elemMatch: {
          statut: { $eq: statutDemande },
          ...filterAvisPrefet(avisPrefet),
        },
      },
    };
  }
  return {
    demandesCoordinateur: {
      $elemMatch: {
        statut: { $in: ['en_cours', 'refusee', 'validee'] },
        ...filterAvisPrefet(avisPrefet),
      },
    },
  };
};

export {
  sortDemandesCoordinateurs,
  checkAvisPrefet,
  formatStatutDemandeCoordinateur,
  checkQuotaRecrutementCoordinateur,
  filterStatutAndAvisPrefetDemandesCoordinateur,
};
