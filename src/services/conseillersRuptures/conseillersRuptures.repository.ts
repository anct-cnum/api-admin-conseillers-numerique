/* eslint-disable prettier/prettier */
import dayjs from 'dayjs';
import { Response } from 'express';
import { formatDateGMT } from '../../utils';

const formatDate = (date: Date) => {
  if (date !== undefined && date !== null) {
    return dayjs(formatDateGMT(date)).format('DD/MM/YYYY');
  }
  return 'non renseignée';
};

const csvCellSeparator = ';';
const csvLineSeparator = '\n';

const generateCsvHistoriqueRuptures = async (ruptures: any, res: Response) => {
  const fileHeaders = [
    'Id CNFS',
    'Nom',
    'Prénom',
    'Email',
    'Id Structure',
    'Nom de la structure',
    'Date de début de contrat',
    'Date de fin de contrat',
    'Type de contrat',
    'Date de rupture',
    'Motif de rupture',
    'Commentaire',
  ];
  try {
    res.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...ruptures.map((rupture) =>
          [
            rupture.conseiller?.idPG,
            rupture.conseiller?.nom ?? 'Anonyme',
            rupture.conseiller?.prenom ?? 'Anonyme',
            rupture.conseiller?.email ?? 'Anonyme',
            rupture.structure?.idPG,
            rupture.structure?.nom?.replace(/["',]/g, ' '),
            formatDate(rupture?.miseEnRelation?.dateDebutDeContrat),
            formatDate(rupture?.miseEnRelation?.dateFinDeContrat),
            rupture?.miseEnRelation?.typeDeContrat ?? 'Non renseigné',
            formatDate(rupture?.dateRupture),
            rupture?.motifRupture ?? 'Non renseigné',
            rupture.conseillerSupprime?.conseiller?.idPG
              ? "Ce conseiller s'est désinscrit totalement du dispositif"
              : '',
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    res.end();
  } catch (error) {
    res.status(500).json({
      message: "Une erreur s'est produite au niveau de la création du csv",
    });
    throw new Error(error);
  }
};

export {
  generateCsvHistoriqueRuptures,
};
