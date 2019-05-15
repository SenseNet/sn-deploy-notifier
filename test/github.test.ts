import { GithubService } from '../src/github'
import { Site } from '../src/models'
import mock from 'mock-fs'

describe('Github service', () => {
  let gh: GithubService
  beforeEach(() => {
    gh = new GithubService()
    process.env = Object.assign(process.env, { DATA_PATH: './.data/sites.json' })
    mock({
      './.data/sites.json': `{ "164" : [{
          "name": "dms",
          "site_id": "c0604e4d-d7a1-4be1-be6a-dcfb034032c0",
          "deploy_ssl_url": "https://loving-mirzakhani-2a2f01.netlify.com",
          "updated_at": "1970-01-01T00:00:00.015Z"
        },
        {
          "name": "dms2",
          "site_id": "d7a1-4be1-be6a-dcfb034032c0",
          "deploy_ssl_url": "https://loving-mirzakhani-2a2f01.netlify.com",
          "updated_at": "1970-01-01T00:00:00.015Z"
        }
      ]}`
    })
  })

  afterEach(mock.restore)

  describe('its getCommentBody method', () => {
    const netlifyPayload: Site = {
      deploy_ssl_url: 'https://loving-mirzakhani-2a2f01.netlify.com',
      site_id: 'c0604e4d-d7a1-4be1-be6a-dcfb034032c0',
      name: 'dms',
      updated_at: '2010.01.01'
    }

    it('should return a string with dms updated', async () => {
      const result = await gh.getCommentBody(netlifyPayload, '164')

      expect(result).toBe(`| Site name | Url | Last deploy |
|:-----------:|:---:|:------------:|
| dms2 | https://loving-mirzakhani-2a2f01.netlify.com | Thu Jan 01 1970 - 01:00:00 GMT+0100 (GMT+01:00) |
| dms | https://loving-mirzakhani-2a2f01.netlify.com | Fri Jan 01 2010 - 00:00:00 GMT+0100 (GMT+01:00) |`)
    })

    it('should add a new entry to json if not found', async () => {
      const result = await gh.getCommentBody({ ...netlifyPayload }, '4')

      expect(result).toBe(`| Site name | Url | Last deploy |
|:-----------:|:---:|:------------:|
| dms | https://loving-mirzakhani-2a2f01.netlify.com | Fri Jan 01 2010 - 00:00:00 GMT+0100 (GMT+01:00) |`)
    })

    it('should add a site that is not already added to pr', async () => {
      const result = await gh.getCommentBody(
        {
          ...netlifyPayload,
          site_id: 'newSIte',
          name: 'snapp',
          updated_at: '2010.01.01'
        },
        '164'
      )

      expect(result).toBe(`| Site name | Url | Last deploy |\n|:-----------:|:---:|:------------:|
| snapp | https://loving-mirzakhani-2a2f01.netlify.com | Fri Jan 01 2010 - 00:00:00 GMT+0100 (GMT+01:00) |
| dms2 | https://loving-mirzakhani-2a2f01.netlify.com | Thu Jan 01 1970 - 01:00:00 GMT+0100 (GMT+01:00) |
| dms | https://loving-mirzakhani-2a2f01.netlify.com | Fri Jan 01 2010 - 00:00:00 GMT+0100 (GMT+01:00) |`)
    })
  })
})
