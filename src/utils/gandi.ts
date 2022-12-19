import axios from 'axios';
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

export default deleteMailbox;
