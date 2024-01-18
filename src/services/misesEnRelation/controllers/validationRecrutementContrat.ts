import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { DBRef, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import dayjs from 'dayjs';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { getCoselec } from '../../../utils';
import { IStructures, IUser } from '../../../ts/interfaces/db.interfaces';
import {
  checkAccessReadRequestMisesEnRelation,
  countConseillersRecrutees,
} from '../misesEnRelation.repository';
import { PhaseConventionnement } from '../../../ts/enum';
import { checkStructurePhase2 } from '../../structures/repository/structures.repository';
import { checkQuotaRecrutementCoordinateur } from '../../conseillers/repository/coordinateurs.repository';
import { transfertChannelDepartementConseiller } from '../../../utils/mattermost';

const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const updateConseillersPG =
  (pool) => async (email: string, disponible: boolean, datePG: string) => {
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
      const gandi = app.get('gandi');
      if (miseEnRelationVerif.conseillerObj.email.includes(gandi.domain)) {
        res.status(400).json({
          message: `Action non autorisée : le conseiller utilise une adresse mail personnelle en ${gandi.domain}`,
        });
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
        !miseEnRelationVerif?.typeDeContrat
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
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          _id: miseEnRelationVerif.structureObj._id,
          statut: 'VALIDATION_COSELEC',
        });
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      const misesEnRelationRecrutees = await countConseillersRecrutees(
        app,
        req,
        miseEnRelationVerif.structure.oid,
      );
      const coselec = getCoselec(structure);
      const nombreConseillersCoselec = coselec?.nombreConseillersCoselec ?? 0;
      const miseEnRelationAccess = await checkAccessReadRequestMisesEnRelation(
        app,
        req,
      );
      // récupération de la date de fin du dernier contrat ou de la date de rupture pour migrer les CRA qui ont été créés après
      const miseEnRelationSansMission = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $match: {
              'conseiller.$id': miseEnRelationVerif.conseillerObj?._id,
              $and: [miseEnRelationAccess],
              $or: [
                {
                  statut: 'terminee_naturelle',
                  dateFinDeContrat: { $exists: true },
                },
                { statut: 'finalisee_rupture', dateRupture: { $exists: true } },
              ],
            },
          },
          {
            $project: {
              structureObj: 1,
              dateToMigrateCRA: {
                $max: [
                  {
                    $cond: {
                      if: { $eq: ['$statut', 'terminee_naturelle'] },
                      then: '$dateFinDeContrat',
                      else: null,
                    },
                  },
                  {
                    $cond: {
                      if: { $eq: ['$statut', 'finalisee_rupture'] },
                      then: '$dateRupture',
                      else: null,
                    },
                  },
                ],
              },
            },
          },
          {
            $sort: { dateToMigrateCRA: -1 },
          },
          {
            $limit: 1,
          },
        ]);
      if (
        miseEnRelationSansMission.length > 0 &&
        miseEnRelationSansMission[0].dateToMigrateCRA >
          miseEnRelationVerif?.dateDebutDeContrat
      ) {
        res.status(400).json({
          message:
            'Action non autorisée : la date de début de contrat est antérieure à la date de fin du dernier contrat ou de rupture',
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
      if (miseEnRelationVerif?.contratCoordinateur) {
        const { demandeCoordinateurValider, quotaCoordinateurDisponible } =
          await checkQuotaRecrutementCoordinateur(
            app,
            req,
            structure,
            miseEnRelationVerif._id,
          );
        if (!demandeCoordinateurValider) {
          res.status(404).json({
            message:
              'Action non autorisée : vous ne possédez aucun poste coordinateur au sein de votre structure',
          });
          return;
        }
        if (quotaCoordinateurDisponible < 0) {
          res.status(409).json({
            message:
              'Action non autorisée : quota atteint de coordinateurs validés par rapport au nombre de postes attribués',
          });
          return;
        }
      }
      const updatedAt = new Date();
      const datePG = dayjs(updatedAt).format('YYYY-MM-DD');
      await updateConseillersPG(pool)(
        miseEnRelationVerif.conseillerObj.email,
        false,
        datePG,
      );
      // vérification si le conseiller possède encore son adresse mail conseiller numérique
      const userEstEncoreConseillerNumerique = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .countDocuments({
          name: miseEnRelationVerif.conseillerObj?.emailCN?.address,
          roles: { $in: ['conseiller'] },
        });
      if (userEstEncoreConseillerNumerique === 0) {
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
                  roles: Array('conseiller'),
                  token: uuidv4(),
                  mailSentDate: null,
                  passwordCreated: false,
                  entity: new DBRef(
                    'conseillers',
                    miseEnRelationVerif.conseillerObj._id,
                    database,
                  ),
                },
                $unset: {
                  resetPasswordCnil: '',
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
      } else if (
        miseEnRelationSansMission[0].structureObj.codeDepartement !==
        miseEnRelationVerif.structureObj.codeDepartement
      ) {
        const ancienneStructure: IStructures =
          miseEnRelationSansMission[0].structureObj;
        const structureDestination: IStructures =
          miseEnRelationVerif.structureObj;
        await transfertChannelDepartementConseiller(app)(
          structureDestination,
          ancienneStructure,
          miseEnRelationVerif.conseillerObj,
        );
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
              updatedAt,
              userCreated: true,
              estRecrute: true,
              datePrisePoste:
                miseEnRelationVerif.conseillerObj.datePrisePoste ?? null,
              dateFinFormation:
                miseEnRelationVerif.conseillerObj.dateFinFormation ?? null,
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
      const objectMiseEnRelationUpdated = {
        $set: {
          statut: 'finalisee',
          conseillerObj: conseillerUpdated.value,
        },
      };
      if (checkStructurePhase2(structure?.conventionnement?.statut)) {
        Object.assign(objectMiseEnRelationUpdated.$set, {
          phaseConventionnement: PhaseConventionnement.PHASE_2,
        });
      }
      const miseEnRelationUpdated = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          {
            _id: new ObjectId(idMiseEnRelation),
          },
          objectMiseEnRelationUpdated,
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
        .updateMany(
          {
            statut: {
              $in: ['finalisee_rupture', 'terminee', 'nouvelle_rupture'],
            },
            'conseiller.$id': conseillerUpdated.value?._id,
          },
          {
            $set: {
              conseillerObj: conseillerUpdated.value,
            },
          },
        );
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

      if (miseEnRelationSansMission.length > 0) {
        // création du match pour récupérer les CRA à migrer (créés après la date de fin de contrat ou de rupture)
        const matchCras = {
          'conseiller.$id': conseillerUpdated.value?._id,
          'cra.dateAccompagnement': {
            $gt: miseEnRelationSansMission[0].dateToMigrateCRA,
          },
        };
        await app
          .service(service.cras)
          .Model.accessibleBy(req.ability, action.update)
          .updateMany(matchCras, {
            $set: {
              structure: new DBRef(
                'structures',
                miseEnRelationVerif.structureObj._id,
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
