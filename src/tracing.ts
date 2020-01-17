import { tracingConfig } from './config'
import tracer from '@expresso/tracing/dist/tracer'

tracer.init(tracingConfig)