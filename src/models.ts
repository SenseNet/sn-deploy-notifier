export interface NetlifyPayload {
  id: string
  site_id: string
  state: string
  name: string
  url: string
  ssl_url: string
  admin_url: string
  deploy_url: string
  deploy_ssl_url: string
  created_at: string
  updated_at: string
  user_id: string
  error_message?: string
  title: string
  context: string
  deploy_time: number
}

export type Site = Pick<NetlifyPayload, 'site_id' | 'updated_at' | 'deploy_ssl_url' | 'name'>

export interface PullRequests {
  [index: string]: Site[]
}
