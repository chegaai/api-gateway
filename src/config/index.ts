import env from 'sugar-env'
import { IAuthConfig } from '@expresso/auth'
import { getRouteMap, RouteMap } from './route-map'
import { IExpressoConfigOptions } from '@expresso/app'

export interface IAppConfig extends IExpressoConfigOptions {
  name: string,
  routes: RouteMap[],
  auth: IAuthConfig
}

export async function getConfig (): Promise<IAppConfig> {
  const routeMapFileUrl = env.get('MAPS_FILE_URL')

  if (!routeMapFileUrl) {
    throw new Error('You must provide a maps file URL or the file itself on a base64 format through the "MAPS_FILE_URL" env')
  }

  const routeMap = await getRouteMap(routeMapFileUrl)

  return {
    name: 'api-gateway',
    routes: routeMap,
    cors: {
      exposedHeaders: ['x-content-range']
    },
    bodyParser: {
      json: false,
      urlEncoded: false
    },
    auth: {
      jwt: {
        algorithms: ['RS256'],
        audience: env.get('AUTH_JWT_AUDIENCE', 'api-gateway'),
        issuer: env.get('AUTH_JWT_ISSUER', 'monaco-token-issuer'),
        secret: env.get('AUTH_JWT_SECRET', '')
      },
      jwks: {
        uri: env.get('AUTH_JWKS_URI', ''),
        cache: true
      }
    }
  }
}
