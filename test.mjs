import { generate } from 'changelogithub'
import { $, fs, nothrow } from 'zx'
async function main() {
  const { config, md, commits } = await generate({})
  console.log(config, md, commits)

  await nothrow($`touch CHANGELOG`)
  var data = fs.readFileSync('CHANGELOG') //read existing contents into data
  var fd = fs.openSync('CHANGELOG', 'w+')
  var buffer = Buffer.from(md)

  fs.writeSync(fd, buffer, 0, buffer.length, 0) //write new data
  fs.writeSync(fd, data, 0, data.length, buffer.length) //append old data
  // or fs.appendFile(fd, data);
  fs.close(fd)
}

main()
