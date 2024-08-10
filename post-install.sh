FILE=config/development.json

if [ ! -f $FILE ]; then
  cp config/default.json $FILE
fi
