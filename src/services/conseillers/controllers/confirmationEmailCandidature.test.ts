import { beforeEach, describe, expect, it } from 'vitest';
import { viderLesCollections, host, requetePatch, champsObligatoiresFormConseiller } from '../../../tests/utils';
import {
  construireConseiller,
} from './creerCandidatureConseiller';
import app from '../../../app';

describe('Pouvoir confirmer mon adresse mail d’inscription', () => {
  it('Quand je valide mon e-mail d’inscription mais que le lien est invalide alors j’ai une erreur', async () => {
    //GIVEN
    const tokenInvalide = '1';
    const urlConfirmationEmail = '/confirmation-email-inscription';

    // WHEN
    const response = await requetePatch(
      `${urlConfirmationEmail}/${tokenInvalide}`,
    );

    // THEN
    expect(response.status).toBe(403);
    expect(response.data.message).toBe(
      'Impossible de valider l’e-mail, le lien a expiré ou est invalide.',
    );
  });

  it('Quand je valide mon e-mail d’inscription et que le lien est toujours actif alors je n’ai pas d’erreur', async () => {
    //GIVEN
    await viderLesCollections(app);
    const createUtilisateur = await construireConseiller(
      app,
      champsObligatoiresFormConseiller,
    );
    const result = await app.service('conseillers').create(createUtilisateur);
    const urlConfirmationEmail = '/confirmation-email-inscription';
    const tokenValide = result.emailConfirmationKey;

    // WHEN
    const response = await requetePatch(
      `${urlConfirmationEmail}/${tokenValide}`,
    );

    // THEN
    expect(response.status).toBe(200);
    expect(response.data).toBe(
      'Votre email a été confirmé et votre inscription est maintenant active. Vous serez contacté par mail ou par téléphone si une structure est intéressée par votre profil.',
    );
  });
});
