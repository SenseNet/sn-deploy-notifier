import { Application } from 'probot' // eslint-disable-line no-unused-vars
import SmeeClient from 'smee-client'
import bodyParser from 'body-parser'
import App from '@octokit/app'
import request from '@octokit/request'
import { findPrivateKey } from './private-key'

const OWNER = 'SenseNet'
const REPO = 'sn-client'
export = (app: Application) => {
  const router = app.route('/dn')
  // create application/json parser
  const jsonParser = bodyParser.json()

  const smee = new SmeeClient({
    source: 'https://smee.io/gnNKGUGRxPpZaTs',
    target: 'http://localhost:3000/dn/events',
    logger: console
  })
  smee.start()

  router.post('/events', jsonParser, async (req, res) => {
    const issue_number = req.body.title
    const installationId = await getInstallationId()
    const githubApi = await app.auth(installationId)
    const comments = await githubApi.issues.listComments({ owner: OWNER, repo: REPO, issue_number })
    const comment = comments.data.find(c => c.user.login === 'deploy-notifier[bot]')
    app.log(comment)
    if (comment) {
      githubApi.issues.updateComment({ comment_id: comment.id, body: 'new value', owner: OWNER, repo: REPO })
    } else {
      githubApi.issues.createComment({
        body: `The current deploy for dms: ${req.body.deploy_ssl_url}`,
        issue_number,
        owner: OWNER,
        repo: REPO
      })
    }
    res.send('ok')
  })
}

const getInstallationId = async () => {
  const app = new App({ id: +process.env.APP_ID!, privateKey: findPrivateKey() })
  const jwt = app.getSignedJsonWebToken()

  // Example of using authenticated app to GET an individual installation
  // https://developer.github.com/v3/apps/#find-repository-installation
  const { data } = await request('GET /repos/:owner/:repo/installation', {
    owner: OWNER,
    repo: REPO,
    headers: {
      authorization: `Bearer ${jwt}`,
      accept: 'application/vnd.github.machine-man-preview+json'
    }
  })

  return data.id as number
}
