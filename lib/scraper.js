const fs = require('fs');
const request = require('request');
const async = require('async');

const { createAndOrReadMapFile, writeJson } = require('../util/json-utils.js');

class Scraper {
  constructor(params) {
    this.nThreads = params.threads || 1;
    this.logEvery = params.logEvery || 1;
    this.writeEvery = params.writeEvery || 1;
    this.inputIndex = params.inputIndex || 1;
    this.logsPath = params.logsPath || `./${(new Date()).toJSON()}.log`;
    this.outputPath = params.outputPath || './output.json';
    this.inputPath = params.inputPath || './input.json';
    this.failurePath = params.failurePath || `./failures.json`;

    this.scrapedMetadataMap = createAndOrReadMapFile(this.outputPath);
    this.unwrittenMetadataMap = {};

    this.failedScrapesMap = createAndOrReadMapFile(this.failurePath);
    this.unwrittenFailedScrapesMap = {};
    this.failuresAtStart = Object.keys(this.failedScrapesMap).length;

    this.pendingRequestsMap = {};
    this.completedHttpRequests = 0;
    this.totalDocsProcessed = 0;
    this.skipCount = 0;
    this.correctedFailuresCount = 0;

    this.inputIds = JSON.parse(fs.readFileSync(this.inputPath));

    this.currentIndex = 0;

    this.makeUrl = params.makeUrl;
    if (!this.makeUrl) { throw 'Must provide URL generator'; }

    this.defaultHeaders = params.defaultHttpHeaders;
    this.cookieString = params.cookieString || undefined;

    this.extractJsonFromHtml = params.extractJsonFromHtml || (
      (id, html) => { html }
    );

    this.onScrapeErr = params.onScrapeErr || ((msg, err) => {
      console.log(msg, err || '');
      process.exit();
    });

    this.onDone = params.onDone || (() => {});
  }

  run() {
    this.resumeScrape().then(() => {
      this.writeScrapeMapsToFile();
      console.log('DONE THE SCRAPE');
      this.onDone();
      process.exit();
    });
  }

  handleSkip(id, done) {
    this.totalDocsProcessed += 1;
    this.skipCount += 1;

    if (id in this.failedScrapesMap) this.markFailureAsCorrected(id)
    if (this.skipCount % 1 === 0) console.log('Skip', this.skipCount);

    return process.nextTick(done);
  }

  resumeScrape() {
    this.START_TIME = new Date();
    return new Promise((resolve, reject) => {

      async.eachLimit(this.inputIds, this.nThreads, (id, done) => {
        this.currentIndex += 1;

        // Check if the doc is already in the local scrapeMap(s)
        if (id in this.scrapedMetadataMap) return this.handleSkip(id, done);

        // Pre-request: set start time and add doc ID to waiting queue
        console.log('Start scrape doc ID', id);
        const startTime = new Date();
        this.pendingRequestsMap[id] = true;

        this.doGET(id, (err, html) => {
          if (err) onScrapeErr(err);

          let metadata = this.extractJsonFromHtml(id, html);
          if (id !== metadata.id_checksum) {
            console.log('id != metadata.id_checksum!', id, metadata.id_checksum);
            process.exit();
          }

          // No need to store this in the JSON output since it's the key name.
          // We just parse it from the HTML output to do the sanity-check above
          delete metadata['id_checksum'];

          const secs = ((new Date()) - this.START_TIME) / 1000;
          console.log(`DONE ${id} in ${secs}sec (${this.completedHttpRequests / secs} reqs/sec)\n`);

          this.unwrittenMetadataMap[id] = 1;
          this.scrapedMetadataMap[id] = metadata;

          delete this.pendingRequestsMap[id];

          this.completedHttpRequests += 1;
          this.totalDocsProcessed += 1;

          if (id in this.failedScrapesMap) this.markFailureAsCorrected(id);
          if (this.totalDocsProcessed % this.logEvery === 0) this.logProgress();
          if (this.totalDocsProcessed % this.writeEvery === 0) this.writeScrapeMapsToFile();

          return process.nextTick(done);
        });
      },
      (err) => {
        return err ? reject() : resolve();
      });
    });
  }

  doGET(id, done) {
    const url = this.makeUrl(id);
    console.log('GET', url);

    request({
      uri: url,
      jar: this.cookieString ? this.makeCookieJar(url) : undefined,
      method: 'GET',
      headers: this.defaultHeaders
    },
    (err, res, body) => done(err, body));
  }

  makeCookieJar(url) {
    const cookie = request.cookie(this.cookieString);
    const j = request.jar();
    j.setCookie(cookie, url);
    return j;
  }

  logErrorAndContinue(err, id) {
    console.log('\nSafely ignore', err, id, '\n');
    if (!(id in this.failedScrapesMap)) {
      this.unwrittenFailedScrapesMap[id] = 1;
    }
    this.failedScrapesMap[id] = err;
    delete this.pendingRequestsMap[id];
  }

  markFailureAsCorrected(id) {
    delete this.failedScrapesMap[id];
    this.unwrittenFailedScrapesMap[id] = 0;
    this.correctedFailuresCount += 1;
    console.log('REMOVE', id, 'from FAILURES map');
  }

  logProgress() {
    const END_TIME = new Date();
    const seconds = (END_TIME - this.START_TIME) / 1000;

    console.log({
      currentIndex: this.currentIndex,
      alreadyScrapedCount: this.skipCount,
      docsInScrapeMap: Object.keys(this.scrapedMetadataMap).length,
      seconds: seconds,
      requests: this.completedHttpRequests,
      totalThreads: this.nThreads,
      activeThreads: Object.keys(this.pendingRequestsMap).length,
      totalDocsSkippedOrScrapedPerSec: this.totalDocsProcessed / seconds,
      requestsPerSec: this.completedHttpRequests / seconds,
      failuresAtStart: this.failuresAtStart,
      currentFailures: Object.keys(this.failedScrapesMap).length,
      correctedFailuresCount: this.correctedFailuresCount
    });
  }

  writeScrapeMapsToFile() {
    let fails = Object.keys(this.unwrittenFailedScrapesMap).length;
    let metas = Object.keys(this.unwrittenMetadataMap).length;

    if (fails) {
      console.log('WRITE', fails, 'new failures');
      writeJson(this.failurePath, this.failedScrapesMap);
      this.unwrittenFailedScrapesMap = {};
    }
    if (metas) {
      console.log('WRITE', metas, 'new metadata rows');
      writeJson(this.outputPath, this.scrapedMetadataMap);
      this.unwrittenMetadataMap = {};
    }

    if (!(fails || metas)) console.log('SKIP THE WRITES');
  }
}

module.exports = Scraper;
