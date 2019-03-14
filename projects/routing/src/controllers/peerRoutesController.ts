/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 *
 --------------
 ******/

import { Request, Response } from 'express'
import { RouteManager, IncomingRoute } from 'ilp-routing';
import { readdirSync } from 'fs';

export let store = (req: Request, res: Response, routeManager: RouteManager) => {
    const data = req.body
    const peerId = req.params.id
    const peer = routeManager.getPeer(peerId)
    if(!peer) {
      res.sendStatus(404)
    }

    const incomingRoute: IncomingRoute = {
      peer: peerId,
      prefix: data.prefix,
      path: data.path,
      weight: data.weight,
      auth: data.auth
    }

    try {
      routeManager.addRoute(incomingRoute)
      res.sendStatus(201)
    } catch(error){
      console.log(error)
      res.sendStatus(404)
    }    
}

export let destroy = (req: Request, res: Response, routeManager: RouteManager) => {
  const {id, prefix} = req.params

  //check if peer exists
  const peer = routeManager.getPeer(id)
  if(!peer) {
    res.sendStatus(404)
  }

  routeManager.removeRoute(id, prefix)

  res.sendStatus(204)
}

export let show = (req: Request, res: Response, routeManager: RouteManager) => {
  const {id, prefix} = req.params

  // TODO Hacky nested if-else for now, needs cleaning up!
  const peer = routeManager.getPeer(id)
  if(!peer) {
    res.sendStatus(404)
  } else {
    const route = peer.getPrefix(prefix)
    if(route) {
      res.json({
          prefix: route.prefix,
          path: route.path,
          weight: route.weight,
          auth: route.auth
        })
    } else {
      res.sendStatus(404)
    }
  }
}

export let index = (req: Request, res: Response, routeManager: RouteManager) => {
  const peerId = req.params.id

  const peer = routeManager.getPeer(peerId)

  if (peer) {
    const routes = peer.getPrefixes().map(prefix => {
      const route = peer.getPrefix(prefix)
      if (route) {
        return {
          prefix: route.prefix,
          path: route.path,
          weight: route.weight,
          auth: route.auth
        }
      }
    })
    res.json(routes)
  } else {
    res.sendStatus(404)
  }
}

export let update = (req: Request, res: Response, routeManager: RouteManager) => {
  const data = req.body
  const {id, prefix} = req.params

  // TODO add a check a check to see if route exists and peer exists


  const incomingRoute: IncomingRoute = {
    peer: id,
    prefix: data.prefix,
    path: data.path,
    weight: data.weight,
    auth: data.auth
  }

  try {
    routeManager.addRoute(incomingRoute)
    res.sendStatus(202)
  } catch(error){
    res.sendStatus(404)
  }    
}
