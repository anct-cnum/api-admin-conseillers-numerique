import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { getEtablissementBySiretEntrepriseApiV3 } from '../../../utils/geography';
import { getRidetData } from '../repository/structures.repository';

const TAILLE_SIRET = 14;
const TAILLES_RIDET = [6, 7];

const getInseeValidity = (insee) => {
  return insee instanceof Error || Object.keys(insee).length === 0;
};

const getNomStructure = (insee) => {
  return insee?.unite_legale?.personne_morale_attributs?.raison_sociale;
};

const getAdresseStructure = (insee) => {
  return insee?.adresse
    ? `${insee.adresse.numero_voie || ''} ${insee.adresse.type_voie || ''} ${
        insee.adresse.libelle_voie || ''
      }, ${insee.adresse.code_postal || ''} ${
        insee.adresse.libelle_commune || ''
      }`.trim()
    : '';
};

const verifySiretOrRidetStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const { siretOrRidet } = req.params;
      let nomStructure = '';
      let adresseStructure = '';
      const isRidet = TAILLES_RIDET.includes(siretOrRidet.length);
      const isSiret = siretOrRidet.length === TAILLE_SIRET;
      if (isSiret) {
        const insee = await getEtablissementBySiretEntrepriseApiV3(
          siretOrRidet,
          app.get('api_entreprise'),
        );
        if (getInseeValidity(insee)) {
          return res.status(404).json({ message: 'Adresse insee non trouvée' });
        }
        nomStructure = getNomStructure(insee);
        adresseStructure = getAdresseStructure(insee);
      } else if (isRidet) {
        const ridetData = await getRidetData(siretOrRidet);
        nomStructure = ridetData?.denomination;
        if (ridetData instanceof Error) {
          return res.status(404).json({ message: 'Adresse non trouvée' });
        }
      }
      return res.send({ nomStructure, adresseStructure, isRidet });
    } catch (error) {
      if (error.status === 403) {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      if (error.status !== 200) {
        return res.status(400).json({ message: error.response.data.errors[0] });
      }
      res.status(500).json({ message: error.message });

      throw new Error(error);
    }
  };

export default verifySiretOrRidetStructure;
