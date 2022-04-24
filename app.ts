import axios from 'axios'
import path from 'path'
import fs, { ReadStream } from 'fs'

const bingUrl = 'https://www.bing.com'
const requestUrl =
  'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN'

type Response = {
  startdate: string
  enddate: string
  url: string
  copyright: string
  copyright_link: string
}

const getReadmeContent = (
  imgUrl: string,
  copyright: string
) => `## Bing Wallpaper
![](${imgUrl})Today: [${copyright}](${imgUrl})`

const fetchData = async () => {
  try {
    const { data } = await axios.get<{ images: Response[] }>(requestUrl)
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

  const subDirPath = path.resolve(archiveDirPath, image.startdate)
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

  const imgWs = fs.createWriteStream(imageFilePath)
  stream.pipe(imgWs)

  fs.writeFileSync(metaFilePath, JSON.stringify(image, null, 4))
  fs.writeFileSync('README.md', getReadmeContent(image.url, image.copyright))

  console.log("Get Tody's Wallpaper Successful!")
}

;(async () => {
  await saveFile()
})()
