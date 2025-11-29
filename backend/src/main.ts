import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { registerControllers } from './controllers';
import { SRS_FILE_PATH } from './config/srs';

const server = Fastify({ logger: true });
server.register(fastifyJwt, { secret: process.env.JWT_SECRET || 'replace_this' });

// Optional: expose SRS path at /srs for reference
server.get('/srs', async () => ({ srs: SRS_FILE_PATH }));

// Register controllers
registerControllers(server)
  .then(() => {
    const port = Number(process.env.PORT || 8000);
    server.listen({ port, host: '0.0.0.0' })
      .then(() => server.log.info(`Server listening at http://0.0.0.0:${port}`))
      .catch((err) => {
        server.log.error(err);
        process.exit(1);
      });
  })
  .catch((err) => {
    server.log.error('Failed to register controllers', err);
    process.exit(1);
  });
