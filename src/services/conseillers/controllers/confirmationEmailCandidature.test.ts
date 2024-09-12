import { beforeEach, describe, expect, it } from 'vitest';
import { viderLesCollections, host, requetePatch } from '../../../tests/utils';
import { construireConseiller, mailConfirmationAdresseMail } from './creerCandidatureConseiller';
import app from '../../../app';

describe('Pouvoir confirmer mon adresse mail d’inscription', () => {
  it(
    'Quand je valide mon e-mail d’inscription mais que le lien est invalide alors j’ai une erreur',
    async () => {
      //GIVEN
      const tokenInvalide = '1111111111111111111111';
      const urlConfirmationEmail = '/confirmation-email-inscription';

      // WHEN
      const response = await requetePatch(
        `${urlConfirmationEmail}/${tokenInvalide}`,
      );

      // THEN
      expect(response.data.message).toBe('Le lien est invalide.');
    },
  );

  it(
    'Quand je valide mon e-mail d’inscription et que le lien est toujours actif alors je n’ai pas d’erreur',
    async () => {

      //GIVEN
      await viderLesCollections(app);
      const champsObligatoires = {
        prenom: 'Jean',
        nom: 'Martin',
        email: 'jean.martin@example.com',
        nomCommune: 'Paris',
        codePostal: '75001',
        codeCommune: '75000',
        codeDepartement: '75',
        codeRegion: '75',
        codeCom: null,
        location: {
          type: 'Point',
          coordinates: [0, 0],
        },
        aUneExperienceMedNum: false,
        dateDisponibilite : new Date(),
        distanceMax: 5,
        motivation: 'Ma motivation',
        telephone: '',
        estDemandeurEmploi: true,
        estEnEmploi: false,
        estEnFormation: false,
        estDiplomeMedNum: false,
        nomDiplomeMedNum: '',
      };
      const createUtilisateur = await construireConseiller(app, champsObligatoires);
      const result = await app
      .service('conseillers')
      .create(createUtilisateur);
      const urlConfirmationEmail = '/confirmation-email-inscription';
      const tokenValide = result.emailConfirmationKey;

      // WHEN
      const response = await requetePatch(
        `${urlConfirmationEmail}/${tokenValide}`,
    );

      // THEN
      expect(response.data).toBe('E-mail confirmé.');
    },
  );

  it.todo('', () => {
    //GIVEN
    //WHEN
    //THEN
  });

  it.todo('', () => {
    //GIVEN
    //WHEN
    //THEN
  });
});
