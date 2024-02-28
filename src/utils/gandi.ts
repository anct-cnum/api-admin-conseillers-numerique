import axios from 'axios';
import { ObjectId } from 'mongodb';
import { action } from '../helpers/accessControl/accessList';
import service from '../helpers/services';

const deleteMailbox = (app, req) => async (conseillerId, login) => {
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
      await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          { _id: conseillerId },
          {
            $set: { 'emailCN.deleteMailboxCNError': false },
          },
        );
    }
  } catch (error) {
    await app
      .service(service.conseillers)
      .Model.accessibleBy(req.ability, action.update)
      .updateOne(
        { _id: conseillerId },
        {
          $set: { 'emailCN.deleteMailboxCNError': true },
        },
      );
    throw new Error(error);
  }
};

const deleteMailboxCloture = (app) => async (conseillerId, login) => {
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

const createMailbox =
  (app) =>
  async ({
    conseillerId,
    login,
    password,
  }: {
    conseillerId: ObjectId;
    login: string;
    password: string;
  }) => {
    const gandi = app.get('gandi');
    try {
      await axios({
        method: 'post',
        url: `${gandi.endPoint}/mailboxes/${gandi.domain}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Apikey ${gandi.token}`,
        },
        data: {
          login,
          mailbox_type: gandi.type,
          password,
          aliases: [],
        },
      }).catch((error) => {
        throw new Error(error);
      });
      const conseiller = await app.service(service.conseillers).Model.updateOne(
        { _id: conseillerId },
        {
          $set: {
            emailCNError: false,
            emailCN: { address: `${login}@${gandi.domain}` },
          },
        },
      );
      if (conseiller.modifiedCount === 0) {
        throw new Error('Conseiller non trouvé');
      }
      await app.service(service.misesEnRelation).Model.updateMany(
        {
          'conseiller.$id': conseillerId,
        },
        {
          $set: {
            'conseillerObj.emailCNError': false,
            'conseillerObj.emailCN': { address: `${login}@${gandi.domain}` },
          },
        },
      );
      return true;
    } catch (e) {
      await app.service(service.conseillers).Model.updateOne(
        { _id: conseillerId },
        {
          $set: { emailCNError: true },
        },
      );
      return new Error(e);
    }
  };

const fixHomonymesCreateMailbox = (app) => async (nom, prenom) => {
  const gandi = app.get('gandi');
  let login = `${prenom}.${nom}`;
  let conseillerNumber = await app
    .service(service.conseillers)
    .Model.countDocuments({
      'emailCN.address': `${login}@${gandi.domain}`,
      statut: 'RECRUTE',
    });
  if (conseillerNumber > 0) {
    let indexLoginConseiller = 1;
    do {
      login = `${prenom}.${nom}${indexLoginConseiller}`;
      // eslint-disable-next-line no-await-in-loop
      conseillerNumber = await app
        .service(service.conseillers)
        .Model.countDocuments({
          'emailCN.address': `${login}@${gandi.domain}`,
          statut: 'RECRUTE',
        });
      indexLoginConseiller += 1;
    } while (conseillerNumber !== 0);
  }

  return login;
};

export {
  deleteMailbox,
  deleteMailboxCloture,
  createMailbox,
  fixHomonymesCreateMailbox,
};
