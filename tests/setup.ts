import app from '../src/app';

let server;

const setup = () => {
  server = app.listen(app.get('port'));
};

const teardown = () => {
  server.close((err) => {
    process.exit(err ? 1 : 0);
  });
};

export { setup, teardown };
