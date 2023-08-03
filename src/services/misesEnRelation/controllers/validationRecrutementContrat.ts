import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { DBRef, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { getCoselec } from '../../../utils';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import { countConseillersRecrutees } from '../misesEnRelation.repository';

const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const updateConseillersPG =
  (pool) => async (email: string, disponible: boolean) => {
    try {
      await pool.query(
        `
      UPDATE djapp_coach
      SET disponible = $2
      WHERE LOWER(email) = LOWER($1)`,
        [email, disponible],
      );
    } catch (error) {
      throw new Error(error);
    }
  };

const validationRecrutementContrat =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idMiseEnRelation = req.params.id;
    if (!ObjectId.isValid(idMiseEnRelation)) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }
    const pool = new Pool();
    let user: IUser | null = null;
    const connect = app.get('mongodb');
    const database = connect.substr(connect.lastIndexOf('/') + 1);
    try {
      const miseEnRelationVerif = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idMiseEnRelation), statut: 'recrutee' });
      if (!miseEnRelationVerif) {
        res.status(404).json({ message: 'Mise en relation non trouvée' });
        return;
      }
      const conseillerVerif = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          _id: miseEnRelationVerif.conseillerObj._id,
          statut: 'RECRUTE',
        });
      if (conseillerVerif) {
        res.status(400).json({
          message:
            'Action non autorisée : le conseiller est déjà recruté par une autre structure',
        });
        return;
      }
      if (
        !miseEnRelationVerif?.dateDebutDeContrat ||
        !miseEnRelationVerif?.typeDeContrat ||
        !miseEnRelationVerif?.salaire
      ) {
        res.status(400).json({
          message: "Action non autorisée : le contrat n'est pas renseigné",
        });
        return;
      }
      if (
        miseEnRelationVerif?.typeDeContrat !== 'CDI' &&
        !miseEnRelationVerif?.dateFinDeContrat
      ) {
        res.status(400).json({
          message: "Action non autorisée : le contrat n'est pas renseigné",
        });
        return;
      }
      const misesEnRelationRecrutees = await countConseillersRecrutees(
        app,
        req,
        miseEnRelationVerif.structure.oid,
      );
      const coselec = getCoselec(miseEnRelationVerif.structureObj);
      const nombreConseillersCoselec = coselec?.nombreConseillersCoselec ?? 0;
      const dateRupture =
        miseEnRelationVerif.conseillerObj?.ruptures?.slice(-1)[0]?.dateRupture;
      if (
        dateRupture &&
        dateRupture > miseEnRelationVerif?.dateDebutDeContrat
      ) {
        res.status(400).json({
          message:
            'La date de rupture est postérieure à la date de début de contrat',
        });
        return;
      }
      if (misesEnRelationRecrutees.length > nombreConseillersCoselec) {
        res.status(400).json({
          message:
            'Action non autorisée : quota atteint de conseillers validés par rapport au nombre de postes attribués',
        });
        return;
      }
      await updateConseillersPG(pool)(
        miseEnRelationVerif.conseillerObj.email,
        false,
      );
      const userAccount = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          name: miseEnRelationVerif.conseillerObj.email,
          roles: { $in: ['candidat'] },
        });
      const passwordHash = bcrypt.hashSync(uuidv4(), 10);
      if (userAccount === null) {
        const canCreate = req.ability.can(action.create, ressource.users);
        if (!canCreate) {
          res.status(403).json({
            message: `Accès refusé, vous n'êtes pas autorisé à créer un utilisateur`,
          });
          return;
        }
        user = await app.service(service.users).create({
          name: miseEnRelationVerif.conseillerObj.email,
          prenom: miseEnRelationVerif.conseillerObj.prenom,
          nom: miseEnRelationVerif.conseillerObj.nom,
          password: passwordHash, // random password (required to create user)
          roles: Array('conseiller'),
          entity: new DBRef(
            'conseillers',
            miseEnRelationVerif.conseillerObj._id,
            database,
          ),
          token: uuidv4(),
          mailSentDate: null,
          passwordCreated: false,
          createdAt: new Date(),
        });
        if (!user) {
          res.status(400).json({
            message: "L'utilisateur n'a pas été créé",
          });
          return;
        }
      } else {
        const userUpdated = await app
          .service(service.users)
          .Model.accessibleBy(req.ability, action.update)
          .findOneAndUpdate(
            { name: miseEnRelationVerif.conseillerObj?.email },
            {
              $set: {
                prenom: miseEnRelationVerif.conseillerObj?.prenom, // nécessaire si compte candidat pas sur le même doublon avec renseignements différents
                nom: miseEnRelationVerif.conseillerObj?.nom,
                password: passwordHash,
                roles: Array('conseillers'),
                token: uuidv4(),
                mailSentDate: null,
                passwordCreated: false,
                entity: new DBRef(
                  'conseillers',
                  miseEnRelationVerif.conseillerObj._id,
                  database,
                ),
              },
            },
            { returnOriginal: false, rawResult: true },
          );
        if (userUpdated.lastErrorObject.n === 0) {
          res.status(400).json({
            message: "L'utilisateur n'a pas été mise à jour",
          });
          return;
        }
        user = userUpdated.value;
      }
      const conseillerUpdated = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          { _id: miseEnRelationVerif.conseillerObj._id },
          {
            $set: {
              statut: 'RECRUTE',
              disponible: false,
              userCreated: true,
              estRecrute: true,
              datePrisePoste: null,
              dateFinDeFormation: null,
              structureId: miseEnRelationVerif.structureObj._id,
              codeRegionStructure: miseEnRelationVerif.structureObj.codeRegion,
              codeDepartementStructure:
                miseEnRelationVerif.structureObj.codeDepartement,
            },
            $unset: {
              inactivite: '',
              userCreationError: '',
              supHierarchique: '',
              telephonePro: '',
              emailPro: '',
            },
          },
          { returnOriginal: false, rawResult: true },
        );
      if (conseillerUpdated.lastErrorObject.n === 0) {
        res.status(404).json({
          message: "Le conseiller n'a pas été mise à jour",
        });
        return;
      }
      const miseEnRelationUpdated = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: new ObjectId(idMiseEnRelation),
          },
          {
            $set: {
              statut: 'finalisee',
              conseillerObj: conseillerUpdated.value,
            },
          },
          { returnOriginal: false, rawResult: true },
        );
      if (miseEnRelationUpdated.lastErrorObject.n === 0) {
        res.status(404).json({
          message: "La mise en relation n'a pas été mise à jour",
        });
        return;
      }
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .deleteMany({
          'conseillerObj._id': conseillerUpdated.value._id,
          statut: {
            $in: [
              'finalisee_non_disponible',
              'non_disponible',
              'nouvelle',
              'nonInteressee',
              'interessee',
            ],
          },
        });
      await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          {
            _id: { $ne: conseillerUpdated.value?._id },
            email: conseillerUpdated.value?.email,
          },
          {
            $set: {
              disponible: false,
              userCreated: false, // si compte candidat n'était pas sur le même doublon
            },
            $unset: {
              inactivite: '',
            },
          },
        );

      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .deleteMany({
          'conseillerObj.idPG': { $ne: conseillerUpdated.value?.idPG },
          'conseillerObj.email': conseillerUpdated.value?.email,
          statut: {
            $nin: ['finalisee_rupture', 'terminee', 'renouvellement_initiee'],
          },
        });
      const query = conseillerUpdated.value?.ruptures
        ? { $gt: dateRupture }
        : { $gte: miseEnRelationUpdated.value?.dateDebutDeContrat };
      const matchCras = {
        'conseiller.$id': conseillerUpdated.value?._id,
        'cra.dateAccompagnement': query,
      };
      const countCras: number = await app
        .service(service.cras)
        .Model.accessibleBy(req.ability, action.read)
        .countDocuments(matchCras);
      if (countCras >= 1) {
        await app
          .service(service.cras)
          .Model.accessibleBy(req.ability, action.update)
          .updateMany(matchCras, {
            $set: {
              structure: new DBRef(
                'structures',
                miseEnRelationUpdated?.value?.structure?.oid,
                database,
              ),
            },
          });
      }
      res.status(200).json({ miseEnRelation: miseEnRelationUpdated.value });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default validationRecrutementContrat;
