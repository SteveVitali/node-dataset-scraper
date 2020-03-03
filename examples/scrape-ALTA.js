const cheerio = require('cheerio');
const Scraper = require('../lib/scraper.js');

let params = {
    threads: 4,
    logEvery: 1,
    writeEvery: 1,
    inputIndex: 0,
    inputPath: './examples/input.json',
    outputPath: './examples/output-map.json',
    logsPath: './examples/logs.log',
    failurePath: './examples/failures-map.json',
    makeUrl: id =>  `https://www.alta.org/membership/directory-profile.cfm?id=${id}`,
    defaultHttpHeaders: { /* ... */ },
    cookieString: `CFID=22399399; JSESSIONID=D0B2BFDB554AB4AD2E9A92A1D58F20C5.cfusion; CFTOKEN=af4855e947cb034d%2D27E76629%2DC29A%2D431A%2D8BC111A91F3A524B; _ga=GA1.2.406868278.1583191898; _gid=GA1.2.2098575155.1583191898; _gat_gtag_UA_1316255_8=1; __atuvc=4%7C10; __atuvs=5e5d9759a64070c7003`,
    extractJsonFromHtml: (id, html) => {
      console.log(html, 'extracting metadata from', id);
      if (html.indexOf('Search for Members') >= 0 ||
          html.indexOf('Sorry, no results.') >= 0) {
        return { id_checksum: id, is_null: true };
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
    onScrapeErr: () => { /* ... */ },
    onDone: () => { /* ... */ }
};

(new Scraper(params)).run();
