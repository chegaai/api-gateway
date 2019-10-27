import { ClientRequest } from 'http'

export default async function (proxyReq: ClientRequest, req: any) {
  const context = await req.deeptrace ? await req.deeptrace.context() : undefined

  if (context) {
    Object.entries<string>(context).forEach(([headerName, headerValue]) => {
      proxyReq.setHeader(headerName, headerValue)
    })
  }

  proxyReq.setHeader('x-request-id', context['DeepTrace-Context-Id'])
}
