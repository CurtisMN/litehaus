const vorpal = require('vorpal')();
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

// Helpers
const getScoreColor = (score) => {
  if (score < 50) return '\x1b[31m';
  if (score < 90) return '\x1b[33m';
  return '\x1b[32m';
}

const formatResult = (results) => (
  results.map(result => (
    `${getScoreColor(result)}${result}\x1b[0m`
  )).join(', ')
);

const calcAverage = (list) => {
  let total = 0;
  list.forEach(x => {
    total += x
  });
  return Math.round(total / list.length, 0);
};

const runLighthouseTest = async (url, formFactor) => {
  try {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    const options = {
      output: 'json',
      onlyCategories: ['performance'],
      port: chrome.port,
      formFactor,
      useThrottling: formFactor === 'mobile',
     };
    const runnerResult = await lighthouse(url, options);
    await chrome.kill();
    return Math.round(runnerResult.lhr.categories.performance.score * 100);
  } catch (error) {
    console.error(error);
    return 'error'
  }
}

const handeResults = (results, url, count) => {
    const avg = calcAverage(results);
    const color = getScoreColor(avg);

    if (results.indexOf('error') !== -1) console.log('Error', results);
    else {
      console.log();
      console.group(`Lighthouse Test for \x1b[30m\x1b[47m${url}\x1b[0m`);
      console.info(`Test was ran \x1b[30m\x1b[47m${count}\x1b[0m times`);
      console.info(`Results: ${formatResult(results)}`);
      console.info(`Average: ${color}${avg}\x1b[0m`);
      console.groupEnd();
      console.log();
    }
}

const lighthouseSuite = async (args, url) => {
    let results = [];
    const { search, count = 1, formFactor } = args;
    const urlWithQuery = search?.length > 1 ? `${url}/search?q=${search}` : url;

    for (let i = 0; i < count; i++) {
      const result = await runLighthouseTest(urlWithQuery, formFactor)
      console.log(`test \x1b[30m\x1b[47m${i + 1}\x1b[0m: ${getScoreColor(result)}${result}\x1b[0m`);
      results.push(result);
    }

    handeResults(results, urlWithQuery, count);
}

// Program
vorpal.delimiter('litehaus').show();

vorpal
  .command('local [search] [count] [formFactor]', 'Runs lighthouse against local')
  .action(async function (args) {
    await lighthouseSuite(args, 'http://localhost:3000');
});

vorpal
  .command('you [search] [count] [formFactor]', 'Runs lighthouse test against prod')
  .action(async function (args) {
    await lighthouseSuite(args, 'http://www.you.com');
});

vorpal
  .command('c', 'Exits litehaus')
  .action(function () {
    this.log('Exiting Litehaus');
    vorpal.ui.cancel();
  });