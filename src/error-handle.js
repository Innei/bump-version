const { chalk } = require('zx')

process.on('uncaughtException', function (err) {
  console.error(chalk.red('Error: ') + err.message)
  process.exit(1)
})
process.on('unhandledRejection', function (err, promise) {
  console.error(chalk.red('Error: ') + err.message)
  process.exit(1)
})

module.exports = {}
