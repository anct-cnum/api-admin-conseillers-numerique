import axios from 'axios';
import service from '../helpers/services';

const updateConseillersPG = (pool) => async (email, disponible, datePG) => {
  try {
    await pool.query(
      `
      UPDATE djapp_coach
      SET (
        disponible,
        updated
      )
      =
      ($2,$3)
      WHERE LOWER(email) = LOWER($1)`,
      [email, disponible, datePG],
    );
  } catch (error) {
    throw new Error(error);
  }
};

const deleteConseillerInCoordinateurs = (app) => async (conseiller) =>
  app.service(service.conseillers).Model.updateMany(
    {
      estCoordinateur: true,
      'listeSubordonnes.type': 'conseillers',
      'listeSubordonnes.liste': {
        $elemMatch: { $eq: conseiller._id },
      },
    },
    {
      $pull: {
        'listeSubordonnes.liste': conseiller._id,
      },
    },
  );

const deleteCoordinateurInConseillers = (app) => async (coordinateur) => {
  const conseillers = await app.service(service.conseillers).Model.find({
    coordinateurs: {
      $elemMatch: {
        id: coordinateur._id,
      },
    },
  });
  if (conseillers.length > 0) {
    for (const conseiller of conseillers) {
      if (conseiller.coordinateurs.length === 1) {
        app.service(service.conseillers).Model.updateMany(
          { _id: conseiller._id },
          {
            $unset: {
              coordinateurs: '',
            },
          },
        );
        app.service(service.misesEnRelation).Model.updateMany(
          { 'conseiller.$id': conseiller._id },
          {
            $unset: {
              'conseillerObj.coordinateurs': '',
            },
          },
        );
      } else {
        app.service(service.conseillers).Model.updateOne(
          { _id: conseiller._id },
          {
            $pull: {
              coordinateurs: {
                id: coordinateur._id,
              },
            },
          },
        );
        app.service(service.misesEnRelation).Model.updateMany(
          { 'conseiller.$id': conseiller._id },
          {
            $pull: {
              'conseillerObj.coordinateurs': {
                id: coordinateur._id,
              },
            },
          },
        );
      }
    }
  }
};

const deletePermanences = (app) => async (idConseiller) =>
  app.service(service.permanences).Model.deleteMany({
    conseillers: {
      $eq: [idConseiller],
    },
  });

const updatePermanences = (app) => async (idConseiller) =>
  app.service(service.users).Model.updateMany(
    { conseillers: { $elemMatch: { $eq: idConseiller } } },
    {
      $pull: {
        conseillers: idConseiller,
        lieuPrincipalPour: idConseiller,
        conseillersItinerants: idConseiller,
      },
    },
  );

const deletePermanencesInCras = (app) => async (idConseiller, updatedAt) =>
  app.service(service.cras).Model.updateMany(
    {
      'conseiller.$id': idConseiller._id,
    },
    { $set: { updatedAt } },
    { $unset: { permanence: '' } },
  );

const loginApi = async ({ mattermost }) => {
  const resultLogin = await axios({
    method: 'post',
    url: `${mattermost.endPoint}/api/v4/users/login`,
    headers: {
      'Content-Type': 'application/json',
    },
    data: { login_id: mattermost.login, password: mattermost.password },
  });

  return resultLogin.request.res.headers.token;
};

const deleteMattermostAccount = (app) => async (conseiller) => {
  const mattermost = app.get('mattermost');
  try {
    const token = await loginApi({ mattermost });

    // Query parameter permanent pour la suppression définitive (il faut que le paramètre ServiceSettings.EnableAPIUserDeletion soit configuré à true)
    await axios({
      method: 'delete',
      url: `${mattermost.endPoint}/api/v4/users/${conseiller.mattermost?.id}?permanent=true`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    await app.service(service.conseillers).Model.updateOne(
      { _id: conseiller._id },
      {
        $set: { 'mattermost.errorDeleteAccount': false },
      },
    );
  } catch (error) {
    await app.service(service.conseillers).Model.updateOne(
      { _id: conseiller._id },
      {
        $set: { 'mattermost.errorDeleteAccount': true },
      },
    );
    throw new Error(error);
  }
};

const deleteMailbox = (app) => async (conseillerId, login) => {
  const gandi = app.get('gandi');
  try {
    // Récuperation de l'id mailbox associé au login pour 'delete'
    const mailbox = await axios({
      method: 'get',
      url: `${gandi.endPoint}/mailboxes/${gandi.domain}?login=${login}`,
      headers: {
        Authorization: `Apikey ${gandi.token}`,
      },
    });

    // Si trouvé : suppression de la boite mail
    if (mailbox?.data.length === 1) {
      await axios({
        method: 'delete',
        url: `${gandi.endPoint}/mailboxes/${gandi.domain}/${mailbox.data[0].id}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Apikey ${gandi.token}`,
        },
      });
      await app.service(service.conseillers).Model.updateOne(
        { _id: conseillerId },
        {
          $set: { 'emailCN.deleteMailboxCNError': false },
        },
      );
    }
  } catch (error) {
    await app.service(service.conseillers).Model.updateOne(
      { _id: conseillerId },
      {
        $set: { 'emailCN.deleteMailboxCNError': true },
      },
    );
    throw new Error(error);
  }
};
export {
  updateConseillersPG,
  deleteConseillerInCoordinateurs,
  deleteCoordinateurInConseillers,
  deletePermanences,
  updatePermanences,
  deletePermanencesInCras,
  deleteMattermostAccount,
  deleteMailbox,
};
