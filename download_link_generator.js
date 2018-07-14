const fs = require('fs')
const mkdirp = require('mkdirp')
const _ = require('lodash')
const Promise = require('bluebird')
const puppeteer = require('puppeteer')
const csv = require('fast-csv')
const Rx = require('rxjs')
const Crawler = require('crawler')

//*****************************************
//** Util functions
//*****************************************
const print = console.log.bind(null)

function mkdir(dir_name) {
  return mkdirp(dir_name)
}

function increaseOne(num) {
  return num + 1
}

function toTask(f) {
  return function handler(val) {
    return f(val)
  }
}

function chainTask(promise, task) { 
  promise.then(task)
}

async function runTask(task) {
  await task()
}

//*****************************************
//** japanesebeauties.net functions
//*****************************************
function writeImageUrlsToFile(data) {
  const FILE_NAME = 'idol_images.csv'

  let streamOptions = {}

  if (fs.existsSync(FILE_NAME)) {
    streamOptions = { 'flags': 'a' }
  }

  const writerStream = fs.createWriteStream(FILE_NAME, streamOptions)
  data.forEach(item => {
    writerStream.write(`${item.directory},${item.url}\n`)
  })
  writerStream.end()
}



function generateIdolUrlsFromBaseUrl(baseUrl) {
  // baseUrl: https://www.japanesebeauties.net/model/aki-hoshino/114/
  // We need to remove '/114/'
  
  const removedFirstSlash = baseUrl.substring(0, baseUrl.lastIndexOf('/'))
  const rootUrl = removedFirstSlash.substring(0, removedFirstSlash.lastIndexOf('/'))
    
  // We will create 30 urls
  const urls = _.range(30)
                .map(increaseOne)
                .map(num => `${rootUrl}/${num}/`)
  // Add original url to the list
  urls.push(baseUrl)

  return Array.from(new Set(urls))
}

function getImageUrls() {
  return Array.from(document.querySelectorAll('div[class="galleryup"] img[alt]'))
              .map(item => item.src)
}


async function goToUrlToGetData(browser, url) {
  const page = await browser.newPage()
  await page.goto(url)
  const imageUrls = await page.evaluate(getImageUrls); 
  await page.close()
  return imageUrls
}

//*****************************************
//** Main functions
//*****************************************

async function main() { 
  const FILE_NAME = 'idols.csv'
  const readStream = fs.createReadStream(FILE_NAME);


  // Count total processing 
  let count = 1;

  const urlObservable = Rx.Observable.create(function(observer) {
    csv
      .fromStream(readStream)
      .on('data', function(data) {

        if (!data) {
          return
        }

        // Extract data
        const idolName = data[0]
        const baseUrl = data[1]

        // const downloadPath = `downloaded/${idolName}`
        // mkdir(downloadPath)
        const urls = generateIdolUrlsFromBaseUrl(baseUrl)

        observer.next({
          idolName: idolName,
          urls: urls
        });

        // Increase count
        count += 1
      })
      .on('end', () => {
        print('Done')
        print('Total count: ' + count)
      });
  })


  let processing = 0

  urlObservable
  .concatMap(x => Rx.Observable.of(x).delay(5000))
  .subscribe(function(data) {
    const idolName = data.idolName
    const urls = data.urls

    processing += 1 
    print(`Progress: ${processing}/${count}`)

    const crawler = new Crawler({
      maxConnections: urls.length,
      callback: function(error, res, done) {
        if (error)  {
          print(error)
        } else {
          const $ = res.$;
          const imgs = $('div[class="galleryup"] img[alt]') 


          writeImageUrlsToFile(
            Array.from(imgs)
              .map(img => 'https://www.japanesebeauties.net' + $(img).attr('src'))
              .map(url => ({
                directory: `downloaded/${idolName}`,
                url: url
              }))
          )
        }
      }
    })

    crawler.queue(urls)
  })

}

main()
