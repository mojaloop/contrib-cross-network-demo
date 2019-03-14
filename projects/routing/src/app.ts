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

import express = require('express')
import {Request, Response} from 'express'
import * as peerController from './controllers/peerController'
import * as peerRoutesController from './controllers/peerRoutesController'
import { RouteManager, Router } from 'ilp-routing';

export function createApp(routeManager: RouteManager, router: Router) {
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded())  
    
  app.get('/peers', (req: Request, res: Response) => peerController.index(req,res, routeManager, router))
  app.get('/peers/:id', (req: Request, res: Response) => peerController.show(req,res, routeManager))
  app.post('/peers', (req: Request, res: Response) => peerController.store(req,res, routeManager))
  app.delete('/peers/:id', (req: Request, res: Response) => peerController.destroy(req,res, routeManager))

  app.get('/peers/:id/routes', (req: Request, res: Response) => peerRoutesController.index(req,res, routeManager))
  app.post('/peers/:id/routes', (req: Request, res: Response) => peerRoutesController.store(req,res, routeManager))
  app.get('/peers/:id/routes/:prefix', (req: Request, res: Response) => peerRoutesController.show(req,res, routeManager))
  app.put('/peers/:id/routes/:prefix', (req: Request, res: Response) => peerRoutesController.update(req,res, routeManager))
  app.delete('/peers/:id/routes/:prefix', (req: Request, res: Response) => peerRoutesController.destroy(req,res, routeManager))

  app.get("/health", (req: Request, res: Response) =>  res.sendStatus(200))

  return app
}