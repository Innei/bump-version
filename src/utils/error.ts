import colors from 'picocolors'

if (process.env.NODE_ENV !== 'development') {
  process.on('uncaughtException', (err) => {
    console.error(colors.red('Error: ') + err.message)
    process.exit(1)
  })
  process.on('unhandledRejection', (err: any, promise) => {
    console.error(colors.red('Error: ') + err?.message)
    process.exit(1)
  })
}

export {}
