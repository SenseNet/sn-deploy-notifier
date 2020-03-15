import { App } from '@octokit/app'
import request from '@octokit/request'
import { findPrivateKey } from './private-key'
import { Octokit } from 'probot'
import { NetlifyPayload, PullRequests, Site } from './models'
import { writeFileSync, readFileSync } from 'fs'
import path from 'path'

export class GithubService {
  private OWNER = 'SenseNet'
  private REPO = 'sn-client'
  private octokit = new Octokit({
    auth: async () => await this.getInstallationAccessToken()
  })

  private getInstallationAccessToken = async () => {
    const app = new App({ id: +process.env.APP_ID!, privateKey: findPrivateKey() })
    const jwt = app.getSignedJsonWebToken()

    const { data } = await request('GET /repos/:owner/:repo/installation', {
      owner: this.OWNER,
      repo: this.REPO,
      headers: {
        authorization: `Bearer ${jwt}`,
        accept: 'application/vnd.github.machine-man-preview+json'
      }
    })
    const installationAccessToken = await app.getInstallationAccessToken({ installationId: data.id })
    return installationAccessToken
  }

  createOrUpdateComment = async (netlifyPayload: NetlifyPayload) => {
    const issue_number = parseInt(netlifyPayload.title, 10)
    // Get pull request comments
    const comments = await this.octokit.issues.listComments({ owner: this.OWNER, repo: this.REPO, issue_number })
    const comment = comments.data.find(c => c.user.login === 'sensenet[bot]')
    const pickedNetlifyPayload = this.pickProperties(netlifyPayload)
    const body = await this.getCommentBody(pickedNetlifyPayload, netlifyPayload.title)
    if (comment) {
      this.octokit.issues.updateComment({ comment_id: comment.id, body, owner: this.OWNER, repo: this.REPO })
    } else {
      this.octokit.issues.createComment({
        body,
        issue_number,
        owner: this.OWNER,
        repo: this.REPO
      })
    }
  }

  getCommentBody = async (netlifyPayload: Site, prNumber: string) => {
    const filePath = path.join(process.cwd(), process.env.DATA_PATH!)
    const sitesJson = readFileSync(filePath, 'utf8')
    const pullRequests = JSON.parse(sitesJson) as PullRequests
    delete pullRequests.default // we don't need this
    let pullRequest = Object.keys(pullRequests).find(pr => pr === prNumber)

    if (!pullRequest) {
      pullRequests[prNumber] = [netlifyPayload]
      pullRequest = prNumber
    } else {
      let found = false
      pullRequests[pullRequest].forEach(site => {
        if (site.site_id === netlifyPayload.site_id) {
          site.deploy_ssl_url = netlifyPayload.deploy_ssl_url
          site.updated_at = netlifyPayload.updated_at
          site.name = netlifyPayload.name
          found = true
        }
      })
      // If site is not there already then add it
      if (!found) {
        pullRequests[pullRequest].push(netlifyPayload)
      }
    }

    const json = JSON.stringify(pullRequests)
    try {
      writeFileSync(filePath, json, 'utf8')
    } catch (error) {
      console.log(error)
    }

    const template = this.createTemplate(pullRequests[pullRequest])

    return template
  }

  private pickProperties(netlifyPayload: NetlifyPayload) {
    return Object.assign<{}, Site>(
      {},
      {
        deploy_ssl_url: netlifyPayload.deploy_ssl_url,
        name: netlifyPayload.name,
        site_id: netlifyPayload.site_id,
        updated_at: netlifyPayload.updated_at
      }
    )
  }

  createTemplate(sites: Site[]) {
    const tableHeader = `| Site name | Url | Last deploy |\n|:-----------:|:---:|:------------:|`
    const template = sites.map(site => {
      const date = new Date(site.updated_at)
      return `| ${site.name} | ${site.deploy_ssl_url} | ${date.toDateString()} - ${date.toTimeString()} |`
    })
    template.push(tableHeader)
    return template.reverse().join('\n')
  }
}
