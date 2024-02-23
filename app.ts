import axios from 'axios'
import path from 'path'
import fs, { ReadStream } from 'fs'
import { glob } from 'glob'

const bingUrl = 'https://www.bing.com'
const requestUrl =
  'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN'

type Response = {
  images: {
    startdate: string
    enddate: string
    url: string
    copyright: string
    copyright_link: string
  }[]
}

const genReadmeContent = (imgUrl: string, copyright: string, count = 9) => {
  const list = glob
    .sync('archives/*/meta.json', { absolute: true })
    .reverse()
    .slice(1, count)
  const tableData = list.map<Response['images'][number]>((item) => {
    const raw = fs.readFileSync(item).toString()
    return JSON.parse(raw)
  })
  const tableContent = tableData.reduce((acc, cur) => {
    const date = [
      cur.enddate.slice(0, 4),
      cur.enddate.slice(4, 6),
      cur.enddate.slice(6),
    ].join('/')
    return (
      acc +
      `| ${date} | ![](${cur.url}) | [${cur.copyright}](${cur.url}) |` +
      '\n'
    )
  }, '')

  return `## Bing Wallpaper
  ![](${imgUrl})Today: [${copyright}](${imgUrl})

  | Date | Wallpaper | Copyright |
  | ---- | ----- | ------ |
  ${tableContent}
  `
}

const fetchData = async () => {
  try {
    const { data } = await axios.get<Response>(requestUrl)
    const raw = data.images[0]
    return {
      ...raw,
      url: bingUrl + raw.url,
    }
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
}

const saveFile = async () => {
  const image = await fetchData()
  const archiveDirPath = path.resolve(__dirname, 'archives')

  if (!fs.existsSync(archiveDirPath)) {
    fs.mkdirSync(archiveDirPath)
  }

  const subDirPath = path.resolve(archiveDirPath, image.enddate)
  if (!fs.existsSync(subDirPath)) {
    fs.mkdirSync(subDirPath)
  }

  const imageFilePath = path.resolve(
    subDirPath,
    `${image.copyright.replace(/\//g, '\u2215')}.jpg`
  )
  const metaFilePath = path.resolve(subDirPath, 'meta.json')

  const { data: stream } = await axios.request<ReadStream>({
    url: image.url,
    responseType: 'stream',
  })

  if (fs.existsSync(metaFilePath)) {
    console.log("Tody's wallpaper has been acquired!")
    process.exit(0)
  }

  fs.writeFileSync(metaFilePath, JSON.stringify(image, null, 4))
  fs.writeFileSync('README.md', genReadmeContent(image.url, image.copyright))

  const imgWs = fs.createWriteStream(imageFilePath)
  stream.pipe(imgWs)

  console.log("Get tody's wallpaper successfully!")
}

;(async () => {
  await saveFile()
})()
