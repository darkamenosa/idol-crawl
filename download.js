const fs = require('fs')
const mkdirp = require('mkdirp')
const _ = require('lodash')
const Promise = require('bluebird')
const puppeteer = require('puppeteer')
const csv = require('fast-csv')
const Rx = require('rxjs')
const download = require('image-downloader')



const print = console.log.bind(console)

function mkdir(dir_name) {
  return mkdirp(dir_name)
}

function getFileNameFromUrl(url) {
  return url.substr(url.lastIndexOf('/') + 1)
}

async function main() { 
  const FILE_NAME = 'idol_images.csv'
  const readStream = fs.createReadStream(FILE_NAME);

  // Count total processing 
  let count = 1;

  const urlObservable = Rx.Observable.create(function(observer) {
    csv
      .fromStream(readStream)
      .on('data', function(data) {

        // Extract data
        const idolPath = data[0]
        const url = data[1]

        observer.next({ idolPath, url })

        // Increase count
        count += 1
      })
      .on('end', () => {
        print('Done')
        print('Total count: ' + count)
      });
  })


  let downloadImageCount = 0

  urlObservable
  .concatMap(x => Rx.Observable.of(x).delay(50))
  .subscribe(function(data) {

    mkdir(data.idolPath)

    const fileName = (new Date().getTime()) + '-' + getFileNameFromUrl(data.url)
    const options = {
      url: data.url,
      dest: data.idolPath + '/' + fileName
    }

    download
      .image(options)
      .then(({ filename }) => {
        downloadImageCount += 1
        print(`Process: ${downloadImageCount}/${count}. File saved to ${filename}`)
      })
      .catch((error) => {
        print(error)
      })
  })

}

main()
