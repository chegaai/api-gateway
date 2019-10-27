import Ajv from 'ajv'
import { URL } from 'url'
import yaml from 'yaml'
import axios from 'axios'
import debug from 'debug'
import { JSONSchema } from './structures/interfaces/JsonSchema'

const logn = (namespace: string, message: string) => debug(`monago-gateway:config:${namespace}`)(message)
const ajv = new Ajv({
  coerceTypes: false,
  useDefaults: false,
  async: false
})

export enum HttpMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  DELETE = 'delete',
  HEAD = 'head',
  CONNECT = 'connect',
  OPTIONS = 'options',
  TRACE = 'trace',
  PATCH = 'patch'
}

export type HostMap = {
  [host: string]: RouteMap[]
}

export type RouteMap = {
  path: string,
  method: HttpMethod,
  to: string,
  at?: string,
  timeout?: number,
  authenticated?: boolean,
  scopes?: string[],
  types?: string[]
}

const BASE_ROUTE_SCHEMA: JSONSchema = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    method: { type: 'string', enum: Object.values(HttpMethod) },
    at: { type: 'string' },
    timeout: { type: 'number' }
  },
  required: ['path']
}

const AUTHENTICATED_ROUTE_SCHEMA: JSONSchema = {
  type: 'object',
  properties: {
    ...BASE_ROUTE_SCHEMA.properties,
    authenticated: { type: 'boolean' },
    scopes: { type: 'array', items: { type: 'string' } },
    types: { type: 'array', items: { type: 'string' } }
  },
  required: [...BASE_ROUTE_SCHEMA.required as string[], 'authenticated']
}

const ROUTE_SCHEMA: JSONSchema = {
  type: 'object',
  anyOf: [
    BASE_ROUTE_SCHEMA,
    AUTHENTICATED_ROUTE_SCHEMA
  ]
}

const MAP_SCHEMA: JSONSchema = {
  type: 'object',
  patternProperties: {
    "^https?:\/\/[a-z0-9.-]+$": {
      type: 'array',
      items: ROUTE_SCHEMA
    }
  }
}

function validateMap (config: unknown): asserts config is HostMap {
  ajv.validate(MAP_SCHEMA, config)
  if (ajv.errors?.length) {
    throw new Error(`Passed config is not valid: ${ajv.errors.map(err => err.message).join(', ')}`)
  }
}

function consolidateMap (config: HostMap): RouteMap[] {
  return Object.entries(config)
    .reduce<RouteMap[]>((routeMaps, [ to, routeMap ]) => {
      const routes = routeMap.map(route => ({ ...route, to }))

      return [ ...routeMaps, ...routes ]
    }, [])
}

function isPathUrl (path: string) {
  try {
    new URL(path)
    return true
  } catch(err) {
    return false
  }
}

function isInvalid (config: unknown): string | false {
  ajv.validate(MAP_SCHEMA, config)

  const validateItem = ajv.compile(ROUTE_SCHEMA)

  validateMap(config)

  const routeMap = consolidateMap(config)

  const validationErrors = routeMap.map((entry, index) => {
    const isValid = validateItem(entry)

    logn('route-map:validation', `Validating ${JSON.stringify(entry)}: ${isValid}`)

    return {
      index,
      entry,
      valid: isValid,
      errors: validateItem.errors
    }
  })
  .filter(({ valid }) => !valid)
  .map(({ errors, ...entry }) => {
    const stringErrors = Object.keys((errors || [])
      .filter(({ message }) => !!message)
      .map(({ message }) => message)
      .reduce<Record<string, boolean>>((acc, error) => {
        if (!error) return acc

        const message = error.replace('should', 'does not')

        if (acc[message]) return acc
        acc[message] = true
        return acc
      }, {}))

    return {
      ...entry,
      errors: stringErrors
    }
  })
  .map(({ index, entry, errors }) => {
    return `Entry at index ${index} ${JSON.stringify(entry)} is invalid because it:\n  - ${errors.join('\n  - ')}`
  })

  if (validationErrors.length) {
    return `Invalid configuration. Following entries are invalid: \n - ${validationErrors.join('\n - ')}`
  }

  return false
}

async function loadFile (path: string): Promise<string> {
  if (isPathUrl(path)) {
    return axios.get<Buffer>(path, { responseType: 'arraybuffer' })
      .then(({ data }) => data.toString('utf8'))
  }

  return Buffer.from(path, 'base64').toString('utf8')
}

function parseFile (contents: string): any {
  return yaml.parse(contents)
}

function validateConfig (config: any) {
  const errors = isInvalid(config)

  if (errors) {
    throw new Error(errors)
  }

  return consolidateMap(config)
}

export async function getRouteMap(fileUrl: string) {
  return loadFile(fileUrl)
    .then(parseFile)
    .then(validateConfig)
}
