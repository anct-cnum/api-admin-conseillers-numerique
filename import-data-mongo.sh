if [ ! $1 ]; then
  echo "Il manque le chemin du dump en premier paramètre."
  exit -1
fi

if [ ! $2 ]; then
  echo "Il manque le nom de la base de données du dump en second paramètre."
  exit -1
fi

docker cp $1 admin_conseiller_numerique_dev:/home/archive.gz

docker exec admin_conseiller_numerique_dev mongorestore --host=localhost --port=27017 --username=admin --password=admin --archive=/home --gzip --drop --nsFrom="$2.*" --nsTo="test.*"
