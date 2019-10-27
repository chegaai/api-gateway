import guards from './route-guards'
import expresso from '@expresso/app'
import proxy from '@irontitan/proxy'
import errors from '@expresso/errors'
import * as auth from '@expresso/auth'
import { IAppConfig } from '../config'
import debug from 'debug'

const log = (namespace: string, message: string) => debug(`monaco-gateway:presentation:${namespace}`)(message)

export const app = expresso((app, config: IAppConfig, environment) => {
  const { jwt, types: checkTypes, scopes: requireScopes } = auth.factory(config.auth)

  for (const route of config.routes) {
    log('routes', `loading route ${JSON.stringify(route)}`)
    const { path, method, to, at, timeout, authenticated } = route

    const setRoute = app[method].bind(app)

    if (!authenticated) {
      setRoute(path, proxy({ to, at, timeout, before: [ guards.requestId ] }))
      continue
    }

    const { scopes, types } = route

    const middlewares: any[] = [
      jwt
    ]

    if (scopes && scopes.length) middlewares.push(requireScopes(scopes))
    if (types && types.length) middlewares.push(checkTypes(types))

    setRoute(path, ...middlewares, proxy({ to, at, timeout, before: guards.all() }))
  }

  app.use(errors(environment, config.name))
})
