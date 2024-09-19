import { beforeEach, describe, expect, it } from 'vitest';
import {
  viderLesCollections,
  host,
  requetePatch,
  champsObligatoireStructure,
  champsObligatoireStructureCoordinateur,
} from '../../../tests/utils';
import { construireStructure } from './creerCandidatureStructure';
import app from '../../../app';
import { construireStructureCoordinateur } from './creerCandidatureStructureCoordinateur';

describe('Pouvoir confirmer mon adresse mail d’inscription', () => {
  beforeEach(async () => {
    await viderLesCollections(app);
  });
  it('Quand je valide mon e-mail d’inscription mais que le lien est invalide alors j’ai une erreur', async () => {
    //GIVEN
    const tokenInvalide = '1';
    const urlConfirmationEmail = '/confirmation-email-inscription-structure';

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
// TODO: En attente de la PR number 660
  it.todo('En tant que structure - Quand je valide mon e-mail d’inscription et que le lien est toujours actif alors je n’ai pas d’erreur', async () => {
    //GIVEN
    const createUtilisateur = await construireStructure(
      app,
      champsObligatoireStructure,
    );
    const result = await app.service('structures').create(createUtilisateur);
    const urlConfirmationEmail = '/confirmation-email-inscription-structure';
    const tokenValide = result.emailConfirmationKey;

    // WHEN
    const response = await requetePatch(
      `${urlConfirmationEmail}/${tokenValide}`,
    );

    // THEN
    expect(response.status).toBe(200);
    expect(response.data).toBe(
      'Votre email a été confirmé et votre inscription est maintenant active.Vous recevrez un mail d’activation de votre espace structure lorsque votre candidature aura été validée.',
    );
  });

  it('En tant que structure coordinateur - Quand je valide mon e-mail d’inscription et que le lien est toujours actif alors je n’ai pas d’erreur', async () => {
    //GIVEN
    const createUtilisateur = await construireStructureCoordinateur(
      app,
      champsObligatoireStructureCoordinateur,
    );
    const result = await app.service('structures').create(createUtilisateur);
    const urlConfirmationEmail = '/confirmation-email-inscription-structure';
    const tokenValide = result.emailConfirmationKey;

    // WHEN
    const response = await requetePatch(
      `${urlConfirmationEmail}/${tokenValide}`,
    );

    // THEN
    expect(response.status).toBe(200);
    expect(response.data).toBe(
      'Votre email a été confirmé et votre inscription est maintenant active.Vous recevrez un mail d’activation de votre espace structure lorsque votre candidature aura été validée.',
    );
  });
});
