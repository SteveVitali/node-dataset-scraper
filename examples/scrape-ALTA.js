const cheerio = require('cheerio');

const Scraper = require('../lib/scraper.js');

let params = {
    threads: 1,
    logEvery: 1,
    writeEvery: 1,
    inputIndex: 0,
    outputPath: './examples/output-map.json',
    logsPath: './examples/logs.log',
    failurePath: './examples/failures-map.json',
    inputPath: './examples/input.json',
    makeUrl: id =>  `https://www.alta.org/membership/directory-profile.cfm?id=${id}`,
    defaultHeaders: {
      'Host': 'www.alta.org',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
      'Sec-Fetch-User': '?1',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-Mode': 'navigate',
      'Referer': 'https://www.alta.org/membership/directory.cfm',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    cookieString: `CFID=22399399; JSESSIONID=D0B2BFDB554AB4AD2E9A92A1D58F20C5.cfusion; CFTOKEN=af4855e947cb034d%2D27E76629%2DC29A%2D431A%2D8BC111A91F3A524B; _ga=GA1.2.406868278.1583191898; _gid=GA1.2.2098575155.1583191898; _gat_gtag_UA_1316255_8=1; __atuvc=4%7C10; __atuvs=5e5d9759a64070c7003`,
    extractJsonFromHtml: (alta_id, html) => {
      console.log(html, 'extracting metadata from', alta_id);
      if (html.indexOf('Search for Members') >= 0 ||
          html.indexOf('Sorry, no results.') >= 0) {
        return { id_checksum: alta_id, is_null: true };
      }
      const $ = cheerio.load(html);
      const memberHtml = $('.member-profile').html();

      const parse = (txt, keyName, term = '<br>') => {
        if (txt.indexOf(keyName) < 0 || txt.indexOf(term) < 0) return;
        return txt.substring(
          txt.indexOf(keyName) + keyName.length,
          txt.indexOf(term, txt.indexOf(keyName))
        ).trim()
      };

      return {
        id_checksum: parse(html, 'ALTA ID:', '<'),
        name: parse(memberHtml, '<b>', '</b>'), // First <b> tag = name
        phone: parse(memberHtml, 'Phone:</b>'),
        fax: parse(memberHtml, '>Fax:</b>', '<br>'),
        founded_in: parse(memberHtml, '>Founded In:</b>'),
      };
    },
    onScrapeErr: () => { console.log('ERR'); process.exit(); },
    onDone: () => { console.log('scraper.onDone'); }
};

(new Scraper(params)).run();
