const fs = require('fs')
const mkdirp = require('mkdirp')
const _ = require('lodash')
const Promise = require('bluebird')
const puppeteer = require('puppeteer')
const csv = require('fast-csv')



//*****************************************
//** Util functions
//*****************************************
function print(val) {
  console.log(val)
} 

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
function writeIdolsToFile(idols) {
  const FILE_NAME = 'idols.csv'

  let streamOptions = {}

  if (fs.existsSync(FILE_NAME)) {
    streamOptions = { 'flags': 'a' }
  }

  const writerStream = fs.createWriteStream(FILE_NAME, streamOptions)

  idols.forEach(item => {
    writerStream.write(`${item.name},${item.url}\n`)
  })

  writerStream.end()
}


function builJapanesebeautiesModelLink(num) {
  return 'https://www.japanesebeauties.net/model/' + num
}

/**
 * Generate links to get models link
 */
function generate_links() {
  return _.range(101)
    .map(increaseOne)
    .map(builJapanesebeautiesModelLink)
}

function getModelLinks() {
  const divs = Array.from(document.querySelectorAll('div[title]')); 
  const idols = divs
            .filter(div => !!div.title.trim())
            .map(div => {
              const a = div.querySelector('a') 
              return {
                name: div.title.trim(),
                url: a.href
              }
             });

  return idols;
}

function fetchModelLink(browser) {
  return function(url) {
    return async function () {
      const page = await browser.newPage()
      await page.goto(url)
      const idols = await page.evaluate(getModelLinks); 
      print('Read idol of url: ' + url)
      writeIdolsToFile(idols)
      await page.close()
    }
  }
}

//*****************************************
//** Main functions
//*****************************************
async function main() {
  // Open browser
  const browser = await puppeteer.launch({
    // headless: false,
  });

  try {

      const tasks = generate_links()
                      .map(fetchModelLink(browser))

      // const tasks = [fetchModelLink(browser)(generate_links()[100])]
                      
      
      for (let task of tasks) {
        await task()
      }

  } finally {
    await browser.close()
  }
}


main()
