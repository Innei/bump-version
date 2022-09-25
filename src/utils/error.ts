import { chalk } from 'zx'
process.on('uncaughtException', function (err) {
  console.error(chalk.red('Error: ') + err.message)
  process.exit(1)
})
process.on('unhandledRejection', function (err: any, promise) {
  console.error(chalk.red('Error: ') + err?.message)
  process.exit(1)
})

export {}
