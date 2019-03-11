import { pipeline } from '@interledger/rafiki'
import { Rule, setPipelineReader } from './types/rule'
import { PeerInfo } from './types/peer'
import hapi from 'hapi'
import { MojaloopHttpEndpoint } from './endpoints/mojaloop-http'
import { MojaloopHttpEndpointManager } from './endpoints/http-server'
import { MojaloopHttpRequest, MojaloopHttpReply } from './types/mojaloop-packets'

export interface AppOptions {
  mojaAddress?: string,
  port: number
}
export class App {
  private _businessRulesMap: Map<string, Rule[]> = new Map()
  private _mojaAddress: string
  private port: number
  private httpServer: hapi.Server
  private httpEndpointManager: MojaloopHttpEndpointManager
  private outgoinRequestHandlers: Map<string, (request: MojaloopHttpRequest) => Promise<MojaloopHttpReply>> = new Map()

  constructor ({ mojaAddress, port }: AppOptions) {
    this._mojaAddress = mojaAddress || 'unknown'
    this.port = port
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
    await this.httpServer.start()
  }

  public async shutdown (): Promise<void> {
    await this.httpServer.stop()
  }

  public async addPeer (peerInfo: PeerInfo) {
    const rulesInstances: Rule[] = this._createRules(peerInfo)
    this._businessRulesMap.set(peerInfo.id, rulesInstances)
    const endpoint = new MojaloopHttpEndpoint({ url: peerInfo.url })
    this.httpEndpointManager.set(peerInfo.id, endpoint)

    const sendOutgoingRequest = (request: MojaloopHttpRequest): Promise<MojaloopHttpReply> => {
      try {
        return endpoint.sendOutgoingRequest(request)
      } catch (e) {

        e.message = 'failed to send packet: ' + e.message

        throw e
      }
    }

    // create incoming and outgoing pipelines for business rules
    const combinedRules = pipeline(...rulesInstances)
    const sendIncoming = rulesInstances.length > 0 ? setPipelineReader('incoming', combinedRules, this.sendOutgoingRequest.bind(this)) : this.sendOutgoingRequest.bind(this)
    const sendOutgoing = rulesInstances.length > 0 ? setPipelineReader('outgoing', combinedRules, sendOutgoingRequest) : sendOutgoingRequest
    endpoint.setIncomingRequestHandler((request: MojaloopHttpRequest) => {
      return sendIncoming(request)
    })
    this.outgoinRequestHandlers.set(peerInfo.id, sendOutgoing)

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
    const destination = request.headers['fspiop-final-destination']
    const nextHop = 'bob' // TODO: get from routing service
    const handler = this.outgoinRequestHandlers.get(nextHop)

    if (!handler) {
      // logger.error('Handler not found for specified nextHop', { nextHop })
      throw new Error(`No handler set for ${nextHop}`)
    }

    // logger.silly('sending outgoing Packet', { destination, nextHop })

    return handler(request)
  }

  private _createRules (peerInfo: PeerInfo): Rule[] {
    return []
  }

}
