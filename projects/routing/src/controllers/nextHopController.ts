import { Request, Response } from 'express'
import { Router } from 'ilp-routing';

export let index = (req: Request, res: Response, router: Router) => {
    const address = req.params.address
    
    try{
        const peer = router.nextHop(address)
        res.json({
            peer
        })
    } catch(error) {
        res.sendStatus(404)
    }
}