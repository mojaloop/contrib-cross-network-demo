
import { App } from '../app'
import * as hapi from 'hapi'
import { log } from '../winston'
import { PeerInfo } from '../types/peer';
const logger = log.child({ component: 'admin-api' })
const BaseJoi = require('joi-currency-code')(require('joi'))
const Extension = require('joi-date-extensions')
const Joi = BaseJoi.extend(Extension)

export interface AdminApiOpts {
  app: App,
  port?: number
}

export class AdminApi {
  private _app: App
  private _port: number
  private _httpServer: hapi.Server

  constructor ({ app, port }: AdminApiOpts) {
    this._app = app
    this._port = port || 2000
    this._httpServer = new hapi.Server({
      port: this._port,
      host: '0.0.0.0'
    })

    this._httpServer.route({
      method: 'GET',
      path: '/health',
      handler: (request: hapi.Request, reply: hapi.ResponseToolkit) => {
        return reply.response().message('status: ok').code(200)
      }
    })

    this._httpServer.route({
      method: 'POST',
      path: '/participants',
      handler: this.addParticipant.bind(this),
      options: {
        payload: {
          failAction: 'error',
          output: 'data'
        },
        validate: {
          payload: {
            id: Joi.string().required(),
            assetCode: Joi.string().required().currency().description('Currency of the transfer').label('@ Currency needs to be a valid ISO 4217 currency code. @'),
            assetScale: Joi.string().required(),
            mojaAddress: Joi.string().required(),
            relation: Joi.string().valid('peer').required(),
            url: Joi.string().required(),
            rules: Joi.array()
          },
          failAction: (request, h, err) => { throw err }
        }
      }
    })
  }

  async start () {
    logger.info('Starting admin api on port=' + this._port)
    await this._httpServer.start()
  }

  async shutdown () {
    logger.info('Shutting down admin api')
    await this._httpServer.stop()
  }

  async addParticipant (request: hapi.Request, reply: hapi.ResponseToolkit) {

    const peerInfo: PeerInfo = {
      id: request.payload['id'],
      assetCode: request.payload['assetCode'],
      assetScale: Number(request.payload['assetScale']),
      mojaAddress: request.payload['mojaAddress'],
      rules: request.payload['rules'],
      relation: request.payload['relation'],
      url: request.payload['url']
    }

    try {
      await this._app.addPeer(peerInfo)
      return reply.response().code(202)
    } catch (error) {
      logger.error('Could not add peer', { payload: request.payload })
      return reply.response('Invalid participant information: ' + error.message).code(400)
    }
  }
}
