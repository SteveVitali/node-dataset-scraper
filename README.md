### node-dataset-scraper

Web scraping utility module for scraping datasets hosted on the web

#### Usage
```javascript
const Scraper = require('node-dataset-scraper');

let params = {
  // Required params
  inputPath: './examples/input.json',
  makeUrl: id =>  `https://www.example.com?id=${id}`,
  extractJsonFromHtml: (id, html) => ({ html }),
  
  // Optional params
  threads: 1,
  logEvery: 1,
  writeEvery: 1,
  inputIndex: 0,
  defaultHttpHeaders: { /* ... */ },
  cookieString: '',
  onScrapeErr: () => { /* ... */ },
  onDone: () => { /* ... */ },
  outputPath: './examples/output.json',
  logsPath: './examples/logs.log',
  failurePath: './examples/failures.json'
};

const scraperInstace = new Scraper(params);

scraperInstance.run();

```

#### TODO:
- Add documentation
- Add S3 and DynamoDB support for datasets too large to store to disk
- Host package on NPM
