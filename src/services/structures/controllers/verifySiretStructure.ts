import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { getEtablissementBySiretEntrepriseApiV3 } from '../../../utils/geography';

const verifySiretStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { siret } = req.params;
    try {
      const insee = await getEtablissementBySiretEntrepriseApiV3(
        siret,
        app.get('api_entreprise'),
      );
      if (insee instanceof Error || Object.keys(insee).length === 0) {
        return res.status(404).json({ message: 'Adresse insee non trouvée' });
      }
      const nomStructure =
        insee?.unite_legale?.personne_morale_attributs?.raison_sociale;
      return res.send({ nomStructure });
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

export default verifySiretStructure;
