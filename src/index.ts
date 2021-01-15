import bodyParser from 'body-parser';
import { Application } from 'probot';
import Semaphore from 'semaphore-async-await';
import SmeeClient from 'smee-client';

import { GithubService } from './github';
import { NetlifyPayload } from './models';

const lock = new Semaphore(1);

export = (app: Application): void => {
  const router = app.route('/dn');

  const smee = new SmeeClient({
    source: 'https://smee.io/gnNKGUGRxPpZaTs',
    target: 'http://localhost:3000/dn/events',
    logger: console,
  });

  smee.start();

  const ghService = new GithubService();
  router.post('/events', bodyParser.json(), async (req, res) => {
    lock.acquire();
    try {
      const netlifyPayload = req.body as NetlifyPayload;
      ghService.createOrUpdateComment(netlifyPayload);
    } catch (error) {
      app.log.error(error);
    } finally {
      lock.release();
    }

    res.send('ok');
  });
};
