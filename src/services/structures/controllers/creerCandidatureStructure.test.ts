import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { viderLesCollections, host, convertionDateIsoHoraire } from '../../../tests/utils';

import app from '../../../app';

const champsObligatoires = {
  type: 'PRIVATE',
  nom: 'MAIRIE',
  siret: '12345678910',
  aIdentifieCandidat: false,
  dateDebutMission: "2024-01-01T00:00:00.000Z",
  contact : {
    prenom : "camélien",
    nom : "rousseau",
    fonction : "PRESIDENTE",
    email : "camlien_rousseau74@example.net",
    telephone : "+33751756469"
},
  nomCommune: "Paris",
  codePostal: "75001",
  codeCommune: "75000",
  codeDepartement: "75",
  codeRegion: "75",
  codeCom: '',
  location: {
    type: "Point",
    coordinates: [0, 0],
  },
  nombreConseillersSouhaites: 1
}

describe('recevoir et valider une candidature structure', () => {
  beforeEach(async () => {
    await viderLesCollections(app);
  })

  it('si j’envoie un formulaire avec tous les champs obligatoires alors il est validé', async () => {
    // GIVEN
    const envoiUtilisateur = {
      ...champsObligatoires,
    }

    // WHEN
    const response = await axios({
      method: "POST",
      url: `${host}/candidature-structure`,
      data: envoiUtilisateur,
      validateStatus: (status) => status < 500,
    });

    // THEN
    expect(response.headers['content-type']).toBe(
        'application/json; charset=utf-8',
    );
    expect(response.status).toBe(200);
    expect(response.data.nom).toBe('MAIRIE');
    expect(response.data.siret).toBe('12345678910');
    expect(response.data.aIdentifieCandidat).toBe(false);
    expect(response.data.dateDebutMission).toBe("2024-01-01T00:00:00.000Z");
    expect(response.data.contact.prenom).toBe("camélien");
    expect(response.data.contact.nom).toBe("rousseau");
    expect(response.data.contact.fonction).toBe("PRESIDENTE");
    expect(response.data.contact.email).toBe("camlien_rousseau74@example.net");
    expect(response.data.contact.telephone).toBe("+33751756469");
    expect(response.data.codeCommune).toBe("75000");
    expect(response.data.codeDepartement).toBe("75");
    expect(response.data.codePostal).toBe("75001");
    expect(response.data.codeRegion).toBe("75");
    expect(response.data.codeCom).toBe("");
    expect(response.data.location).toStrictEqual({
      coordinates: [0, 0],
      type: "Point",
    });
    expect(response.data.idPG).toBe(1);
    expect(response.data.userCreated).toBe(false);
    expect(response.data.statut).toBe('CREEE');
    expect(response.data.estLabelliseFranceServices).toBe('NON');
    expect(response.data.estZRR).toBe(null);
    expect(response.data.prefet).toStrictEqual([]);
    expect(response.data.coselec).toStrictEqual([]);

    // A voir si on garde ou non...
    expect(response.data.createdAt).toBe(convertionDateIsoHoraire(response.data.createdAt));
    expect(response.data.updatedAt).toBe(convertionDateIsoHoraire(response.data.updatedAt));
  });
  it.todo('si j’envoie la totalité des champs possibles alors il est validé');
  it.todo('');
  it.todo('');
  it.todo('');
  it.todo('');
});
