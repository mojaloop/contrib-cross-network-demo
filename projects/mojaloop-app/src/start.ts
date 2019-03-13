import { App } from './app'

const port = Number(process.env.PORT) || 3000

const start = async () => {

  let shuttingDown = false
  process.on('SIGINT', async () => {
    try {
      if (shuttingDown) {
        console.warn('received second SIGINT during graceful shutdown, exiting forcefully.')
        process.exit(1)
        return
      }

      shuttingDown = true
      await app.shutdown()

      // Graceful shutdown
      console.debug('shutting down.')
      console.debug('completed graceful shutdown.')
      process.exit(0)
    } catch (err) {
      const errInfo = (err && typeof err === 'object' && err.stack) ? err.stack : err
      console.error('error while shutting down. error=%s', errInfo)
      process.exit(1)
    }
  })

  const app = new App({ port })
  await app.start()
}

start().catch(e => {
  const errInfo = (e && typeof e === 'object' && e.stack) ? e.stack : e
  console.error(errInfo)
})
