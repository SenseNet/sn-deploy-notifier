import App from '@octokit/app'
import request from '@octokit/request'
import { findPrivateKey } from './private-key'
import { Octokit } from 'probot'
import { NetlifyPayload, PullRequests } from './models'
import { writeFileSync } from 'fs'
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
    const body = await this.getCommentBody(netlifyPayload)
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

  getCommentBody = async (netlifyPayload: NetlifyPayload) => {
    const filePath = path.join(process.cwd(), process.env.DATA_PATH!)
    const pullRequests = (await import(filePath)) as PullRequests
    delete pullRequests.default // we don't need this
    let prNumber = Object.keys(pullRequests).find(prNumber => prNumber === netlifyPayload.title)

    if (!prNumber) {
      pullRequests[netlifyPayload.title] = [netlifyPayload]
      prNumber = netlifyPayload.title
    } else {
      pullRequests[prNumber].forEach(site => {
        if (site.site_id === netlifyPayload.site_id) {
          site.deploy_ssl_url = netlifyPayload.deploy_ssl_url
          site.updated_at = netlifyPayload.updated_at
          site.name = netlifyPayload.name
        } else {
          pullRequests[prNumber!].push(netlifyPayload)
        }
      })
    }

    const json = JSON.stringify(pullRequests)
    try {
      writeFileSync(filePath, json, 'utf8')
    } catch (error) {
      console.log(error)
    }

    const template = this.createTemplate(pullRequests[prNumber])

    return template
  }

  createTemplate(sites: NetlifyPayload[]) {
    const tableHeader = `| Site name | Url | Last deploy |\n|:-----------:|:---:|:------------:|`
    const template = sites.map(site => `| ${site.name} | ${site.deploy_ssl_url || '❌'} | ${site.updated_at.toLocaleString() || '❌'} |`)
    template.push(tableHeader)
    return template.reverse().join('\n')
  }
}
