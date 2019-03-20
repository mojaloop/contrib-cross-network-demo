import { App } from './app'
import { AdminApi } from './services/admin-api'
import * as winston from 'winston'

const appPort = Number(process.env.APP_PORT) || 3000
const adminPort = Number(process.env.ADMIN_API_PORT) || 2000

// Logging
const formatter = winston.format.printf(({ service, level, message, component, timestamp, ...metaData }) => {
  return `${timestamp} [${service}${component ? '-' + component : ''}] ${level}: ${message}` + (metaData ? ' meta data: ' + JSON.stringify(metaData) : '')
})

winston.configure({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.align(),
    formatter
  ),
  defaultMeta: { service: 'cnp' },
  transports: [
    new winston.transports.Console()
  ]
})

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
      await Promise.all([app.shutdown(), adminApi.shutdown()])

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

  const app = new App({ port: appPort })
  const adminApi = new AdminApi({ app, port: adminPort })
  await Promise.all([app.start(), adminApi.start()])
}

start().catch(e => {
  const errInfo = (e && typeof e === 'object' && e.stack) ? e.stack : e
  console.error(errInfo)
})
