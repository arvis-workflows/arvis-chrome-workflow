const userName = require('os').userInfo().username;
require('./init.js');
const sqliteOptions = { readonly: true, fileMustExist: true };
const fs = require('fs');
const sqlite = require('better-sqlite3');
const _ = require('lodash');
const path = require('path');
const fsPromise = require('fs').promises;
const alfy = require('arvis-workflow-tools');
const os = require('os');
const sep = path.sep;

const {
  HISTORY_DB,
  FAVICON_DB,
  MEDIA_HISTORY_DB,
  WEB_DATA_DB,
  LOGIN_DATA_DB,
} = require('./constant');

const conf = alfy.config.get('setting');

const filterExcludeDomain = (datas) => {
  return datas.filter(item => {
    return !conf.exclude_domains.includes(item.hostname);
  });
};

const getExecPath = () => {
  return (__dirname.split(path.sep).slice(0, -1)).join(path.sep);
};

const bookmarkDFS = (item, options = { targets: ['url'], depth: 99 }) => {
  if (options.depth <= -1) {
    return [];
  }

  if (item.type === 'url') {
    if (!options.targets || options.targets.includes('url')) {
      return [item];
    } else {
      return [];
    }
  } else {
    // 'folder' or 'root'
    const target = item.type === 'folder' ? item.children : item;
    const initialArr = options.targets.includes('folder') ? [item] : [];

    return _.reduce(target, (res, child) => {
      return [
        ...res,
        ..._.flatten(bookmarkDFS(child, { targets: options.targets, depth: options.depth - 1 })),
      ];
    }, initialArr);
  }
};

const handleInput = (str) => {
  let query = '';
  let domain = '';
  let artist = '';
  let isDomainSearch = false;
  let isArtistSearch = false;

  if (str.includes('#') || str.includes('@')) {
    const words = str.split(' ');
    for (const word of words) {
      if (word.startsWith('#')) {
        isDomainSearch = true;
        domain = word.substr(1, word.length - 1);
      } else if (word.startsWith('@')) {
        isArtistSearch = true;
        artist = word.substr(1, word.length - 1);
      } else {
        query += (query === '' ? word : ' ' + word);
      } 
    }
  } else {
    query = str;
  }

  return {
    query,
    domain,
    artist,
    isArtistSearch,
    isDomainSearch
  };
};

const getDBFilePath = (DBFile) => {
  if (process.platform === 'darwin') {
    switch (conf['browser']) {
    case 'Chrome Canary':
      return `/Users/${userName}/Library/Application Support/Google/Chrome Canary/${conf['chrome_profile']}/${DBFile}`;
    case 'Edge':
      return `/Users/${userName}/Library/Application Support/Microsoft Edge/${conf['chrome_profile']}/${DBFile}`;
    case 'Chromium':
      // 'Chrome Cloud Enrollment' could be wrong (not sure)
      return `/Users/${userName}/Library/Application Support/Google/Chrome Cloud Enrollment/${conf['chrome_profile']}/${DBFile}`;
    default:
      return `/Users/${userName}/Library/Application Support/Google/Chrome/${conf['chrome_profile']}/${DBFile}`;
    }
  } else if (process.platform === 'win32') {
    switch (conf['browser']) {
    default:
      return `${os.homedir}${sep}AppData${sep}Local${sep}Google${sep}Chrome${sep}User Data${sep}${conf['chrome_profile']}${sep}${DBFile}`;
    }
  }
  throw new Error(
    `Not supported platform! only support 'win32', 'darwin'. Current platform: ${process.platform}`
  );
};

async function getChromeBookmark() {
  const bookmarksPath = getDBFilePath('Bookmarks');
  const roots = JSON.parse(
    await fsPromise.readFile(bookmarksPath, {
      encoding: 'utf8',
    })
  ).roots;

  return roots;
}

function getHistoryDB () {
  const targetPath = getDBFilePath('History');
  fs.copyFileSync(targetPath, HISTORY_DB);
  return sqlite(HISTORY_DB, sqliteOptions);
}

function getFaviconDB () {
  const targetPath = getDBFilePath('Favicons');
  fs.copyFileSync(targetPath, FAVICON_DB);
  return sqlite(FAVICON_DB, sqliteOptions);
}

function getMediaHistoryDB () {
  const targetPath = getDBFilePath('Media History');
  fs.copyFileSync(targetPath, MEDIA_HISTORY_DB);
  return sqlite(MEDIA_HISTORY_DB, sqliteOptions);
}

function getWebDataDB () {
  const targetPath = getDBFilePath('Web Data');
  fs.copyFileSync(targetPath, WEB_DATA_DB);
  return sqlite(WEB_DATA_DB, sqliteOptions);
}

function getLoginDataDB () {
  const targetPath = getDBFilePath('Login Data');
  fs.copyFileSync(targetPath, LOGIN_DATA_DB);
  return sqlite(LOGIN_DATA_DB, sqliteOptions);
}

function replaceAll (string, search, replace) {
  return string.split(search).join(replace);
}

function convertChromeTimeToUnixTimestamp (time) {
  return (Math.floor(time / 1000000 - 11644473600)) * 1000;
}

function existsAsync(path) {
  // eslint-disable-next-line no-unused-vars
  return new Promise(function(resolve, reject){
    fs.exists(path, function(exists){
      resolve(exists);
    });
  });
}

function extractHostname(url) {
  let hostname;
  // find & remove protocol (http, ftp, etc.) and get hostname

  if (url.indexOf('//') > -1) {
    hostname = url.split('/')[2];
  } else {
    hostname = url.split('/')[0];
  }

  // find & remove port number
  hostname = hostname.split(':')[0];
  // find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
}

const decideTargetHistory = (historys, resultLimit) => {
  let idx = 0;
  let deleted = 0;
  let prevTitle;
  const targetHistory = [];

  for (const historyItem of historys) {
    if (idx >= resultLimit) {
      break;
    }
    if (historyItem.title === prevTitle) {
      ++deleted;
      continue;
    }
    prevTitle = historyItem.title;
    ++idx;
    targetHistory.push(historyItem);
  }

  return {
    targetHistory,
    deleted
  };
};

const getLocaleString = (datetime, locale) => {
  const dateObj = new Date(datetime);

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();

  const hour =
    // AM 12
    dateObj.getHours() === 0
      ? 12
      : // PM 12
      dateObj.getHours() === 12
        ? 12
        : // Other times
        dateObj.getHours() % 12;

  const minute =
    dateObj.getMinutes() < 10
      ? `0${dateObj.getMinutes()}`
      : dateObj.getMinutes();
  const seconds =
    dateObj.getSeconds() < 10
      ? `0${dateObj.getSeconds()}`
      : dateObj.getSeconds();

  switch (locale) {
  case 'ko': {
    const koDayOfTheWeek = [
      '일요일',
      '월요일',
      '화요일',
      '수요일',
      '목요일',
      '금요일',
      '토요일',
    ];
    const isPM = dateObj.getHours() >= 12 ? '오후' : '오전';
    const dayOfTheWeek = koDayOfTheWeek[dateObj.getDay() % 7];
    return `${year}년 ${month}월 ${day}일 ${dayOfTheWeek} ${isPM} ${hour}:${minute}:${seconds}`;
  }

  default: {
    const enDayOfTheWeek = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const enMonthStr = [
      'December',
      'January',
      'Feburary',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
    ];

    const isPM = dateObj.getHours() >= 12 ? 'PM' : 'AM';
    const dayOfTheWeek = enDayOfTheWeek[dateObj.getDay() % 7];
    const monthStr = enMonthStr[month % 12];
    return `${dayOfTheWeek}, ${monthStr} ${day}, ${year} ${hour}:${minute}:${seconds} ${isPM}`;
  }
  }
};

module.exports = {
  getChromeBookmark,
  filterExcludeDomain,
  getExecPath,
  bookmarkDFS,
  handleInput,
  existsAsync,
  convertChromeTimeToUnixTimestamp,
  extractHostname,
  decideTargetHistory,
  getLoginDataDB,
  getWebDataDB,
  getHistoryDB,
  getFaviconDB,
  getMediaHistoryDB,
  getLocaleString,
  replaceAll,
};
