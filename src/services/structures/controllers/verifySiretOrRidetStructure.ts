import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { getEtablissementBySiretEntrepriseApiV3 } from '../../../utils/geography';
import { getRidetData } from '../repository/structures.repository';

const TAILLE_SIRET = 14;
const TAILLE_RIDET = [6, 7];

const verifySiretOrRidetStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { siretOrRidet } = req.params;
    let nomStructure = '';
    let adressStructure = '';
    let data = {
      denomination: '',
    };
    try {
      const isRidet = TAILLE_RIDET.includes(siretOrRidet.length);
      if (siretOrRidet.length === TAILLE_SIRET) {
        const insee = await getEtablissementBySiretEntrepriseApiV3(
          siretOrRidet,
          app.get('api_entreprise'),
        );
        if (insee instanceof Error || Object.keys(insee).length === 0) {
          return res.status(404).json({ message: 'Adresse insee non trouvée' });
        }
        nomStructure =
          insee?.unite_legale?.personne_morale_attributs?.raison_sociale;
        adressStructure = insee?.adresse
          ? `${insee.adresse.numero_voie || ''} ${insee.adresse.type_voie || ''} ${
              insee.adresse.libelle_voie || ''
            }, ${insee.adresse.code_postal || ''} ${
              insee.adresse.libelle_commune || ''
            }`.trim()
          : '';
      } else if (TAILLE_RIDET.includes(siretOrRidet.length)) {
        data = await getRidetData(siretOrRidet);
        nomStructure = data?.denomination;
        if (data instanceof Error) {
          return res.status(404).json({ message: 'Adresse non trouvée' });
        }
      }
      return res.send({ nomStructure, adressStructure, isRidet });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
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
