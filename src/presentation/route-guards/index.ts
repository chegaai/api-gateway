import requestId from './request-id'
import onBehalfOf from './on-behalf-of'

export const all = () => ([
  requestId,
  onBehalfOf
])

export default {
  all,
  requestId,
  onBehalfOf
}
