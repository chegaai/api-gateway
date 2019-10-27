import { app } from './app'
import { getConfig } from '../config'
import * as server from '@expresso/server'

export function start () {
  getConfig()
    .then(config => server.start(app, config))
    .catch(err => {
      console.error(err)
    })
}
