const Router = require('ilp-routing').Router
const RouteManager = require('ilp-routing').RouteManager

/**
 * Wrapper class for the routing components and used as a singleton
 */
class Routing {
  constructor () {
    if (!Routing.instance) {
      this.router = new Router()
      this.routeManager = new RouteManager(this.router)
      Routing.instance = this
    }

    return Routing.instance
  }
}

const instance = new Routing()
Object.freeze(instance)

export default instance
