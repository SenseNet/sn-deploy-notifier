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
  created_at: Date
  updated_at: Date
  user_id: string
  error_message?: string
  title: string
  context: string
  deploy_time: number
}

export interface PullRequests {
  [index: string]: NetlifyPayload[]
}
