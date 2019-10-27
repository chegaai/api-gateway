import { ClientRequest } from 'http'
import { IAuthenticatedRequest } from '@expresso/auth'

export default function (proxyReq: ClientRequest, req: IAuthenticatedRequest) {
  if (req.user && req.user.id) proxyReq.setHeader('x-on-behalf-of', req.user.id)
}
