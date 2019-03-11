import { Request, Response, Router } from 'express'
import { RouteManager } from 'ilp-routing';

export let store = (req: Request, res: Response, routeManager: RouteManager) => {
    const data = req.body

    routeManager.addPeer(data.id, data.relation)
    
    res.json({
      id: data.id,
      relation: data.relation
    })
}

export let destroy = (req: Request, res: Response, routeManager: RouteManager) => {
  const peerId = req.params.id

  routeManager.removePeer(peerId)

  res.sendStatus(202)
}

export let show = (req: Request, res: Response, routeManager: RouteManager) => {
  const peerId = req.params.id

  const peer = routeManager.getPeer(peerId)

  if (peer) {
    res.json({
      id: peerId,
      relation: peer.getRelation()
    })
  } else {
    res.sendStatus(404)
  }
}