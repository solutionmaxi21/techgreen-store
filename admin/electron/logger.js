import log from 'electron-log/main.js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

// Configure logging
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

// Don't set custom path - let electron-log use defaults
// It will automatically use the correct user data path

export default log
