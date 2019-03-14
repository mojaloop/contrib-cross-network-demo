import { pipeline } from '@interledger/rafiki'
import axios, { AxiosResponse } from 'axios'
import { Rule, setPipelineReader } from './types/rule'
import { PeerInfo } from './types/peer'
import hapi from 'hapi'
import { MojaloopHttpEndpoint } from './endpoints/mojaloop/mojaloop-http'
import { MojaloopHttpEndpointManager } from './endpoints/mojaloop/mojaloop-http-server'
import { MojaloopHttpRequest, MojaloopHttpReply } from './types/mojaloop-packets'
import { log } from './winston'
import { Router as RoutingTable, RouteManager, IncomingRoute } from 'ilp-routing'

const logger = log.child({ component: 'App' })

export interface AppOptions {
  mojaAddress?: string,
  port: number,
  destinationHeader?: string
}
export class App {
  routingTable: RoutingTable = new RoutingTable()
  routeManager: RouteManager = new RouteManager(this.routingTable)
  private _businessRulesMap: Map<string, Rule[]> = new Map()
  private _mojaAddress: string
  private _destinationHeader: string
  private _port: number
  private httpServer: hapi.Server
  private httpEndpointManager: MojaloopHttpEndpointManager
  private outgoingRequestHandlers: Map<string, (request: MojaloopHttpRequest) => Promise<MojaloopHttpReply>> = new Map()

  constructor ({ mojaAddress, port, destinationHeader }: AppOptions) {
    this._mojaAddress = mojaAddress || 'unknown'
    this._destinationHeader = destinationHeader || 'fspiop-destination'
    this._port = port
    this.httpServer = new hapi.Server({
      host: '0.0.0.0',
      port
    })

    this.httpServer.route({
      method: 'GET',
      path: '/health',
      handler: function (request: hapi.Request,reply: hapi.ResponseToolkit) {
        return 'status: ok'
      }
    })

    this.httpEndpointManager = new MojaloopHttpEndpointManager(this.httpServer)
  }

  public async start (): Promise<void> {
    logger.info('Starting app http server on port=' + this._port)
    await this.httpServer.start()
  }

  public async shutdown (): Promise<void> {
    logger.info('Stopping app http server')
    await this.httpServer.stop()
  }

  public async addPeer (peerInfo: PeerInfo, endpoint?: MojaloopHttpEndpoint) {
    logger.info('adding new peer: ' + peerInfo.id, { peerInfo })
    this.routeManager.addPeer(peerInfo.id, peerInfo.relation)
    // TODO: assuming will have address for this peer.
    this.routeManager.addRoute({
      peer: peerInfo.id,
      prefix: peerInfo.mojaAddress,
      path: []
    })
    const rulesInstances: Rule[] = this._createRules(peerInfo)
    this._businessRulesMap.set(peerInfo.id, rulesInstances)
    const endpointInstance = endpoint || new MojaloopHttpEndpoint({ url: peerInfo.url })
    this.httpEndpointManager.set(peerInfo.id, endpointInstance)

    const sendOutgoingRequest = (request: MojaloopHttpRequest): Promise<MojaloopHttpReply> => {
      try {
        return endpointInstance.sendOutgoingRequest(request)
      } catch (e) {

        e.message = 'failed to send packet: ' + e.message

        throw e
      }
    }

    // create incoming and outgoing pipelines for business rules
    const combinedRules = pipeline(...rulesInstances)
    const sendIncoming = rulesInstances.length > 0 ? setPipelineReader('incoming', combinedRules, this.sendOutgoingRequest.bind(this)) : this.sendOutgoingRequest.bind(this)
    const sendOutgoing = rulesInstances.length > 0 ? setPipelineReader('outgoing', combinedRules, sendOutgoingRequest) : sendOutgoingRequest
    endpointInstance.setIncomingRequestHandler((request: MojaloopHttpRequest) => {
      return sendIncoming(request)
    })
    this.outgoingRequestHandlers.set(peerInfo.id, sendOutgoing)

    rulesInstances.forEach(rule => rule.startup())
  }

  public async removePeer (id: string) {
    Array.from(this.getRules(id)).forEach(rule => rule.shutdown())
    this._businessRulesMap.delete(id)
    this.httpEndpointManager.delete(id)
  }

  public setMojaAddress (address: string) {
    this._mojaAddress = address
  }

  public getRules (peerId: string): Rule[] {
    return this._businessRulesMap.get(peerId) || []
  }

  public getPeerEndpoint (peerId: string): MojaloopHttpEndpoint {
    const endpoint = this.httpEndpointManager.get(peerId)
    if (!endpoint) {
      throw new Error(`No endpoint found for peerId=${peerId}`)
    }
    return endpoint
  }

  async sendOutgoingRequest (request: MojaloopHttpRequest): Promise<MojaloopHttpReply> {
    const destination = request.headers[this._destinationHeader]
    const nextHop = this.routingTable.nextHop(destination)
    const handler = this.outgoingRequestHandlers.get(nextHop) 

    if (!handler) {
      logger.error('Handler not found for specified nextHop=', nextHop)
      throw new Error(`No handler set for ${nextHop}`)
    }

    logger.silly('sending outgoing Packet', { destination, nextHop })

    return handler(request)
  }

  private _createRules (peerInfo: PeerInfo): Rule[] {
    return []
  }

}
