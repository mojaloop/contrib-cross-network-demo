import { Request, Response } from 'express'
import { RouteManager, IncomingRoute } from 'ilp-routing';

export let store = (req: Request, res: Response, routeManager: RouteManager) => {
    const data = req.body

    const incomingRoute: IncomingRoute = {
      peer: data.peer,
      prefix: data.prefix,
      path: data.path
    }

    try {
      routeManager.addRoute(incomingRoute)
      res.sendStatus(201)
    } catch(error){
      console.log(error)
      res.sendStatus(500)
    }    
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