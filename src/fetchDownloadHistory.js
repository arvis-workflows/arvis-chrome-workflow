const arvish = require('arvish');
const path = require('path');
const byteSize = require('byte-size');
const psl = require('psl');
require('./init.js');
const {
  existsAsync,
  getHistoryDB,
  extractHostname,
  convertChromeTimeToUnixTimestamp,
  getLocaleString,
} = require('./utils');
const userName = require('os').userInfo().username;
const sep = path.sep;

const conf = arvish.config.get('setting');

(async function() {
  let downloadInfos = getHistoryDB()
    .prepare(`SELECT * FROM downloads ORDER BY start_time ${conf.chd.sort}`)
    .all();
  const input = arvish.input ? arvish.input.normalize() : null;

  if (input) {
    downloadInfos = downloadInfos.filter(item => {
      const fileFileName = item.current_path.split(path.sep).pop(); 
      const name = item.current_path.toLowerCase();
      const referrer = item.referrer.toLowerCase();
      const loweredInput = input.normalize().toLowerCase();

      if (fileFileName.trim() === '') return false;
      if (name.includes(loweredInput) || referrer.includes(loweredInput)) {
        return true;
      }
      return false;
    });
  }

  const result = await Promise.all(
    downloadInfos.map(async (item) => {
      const fileFileName = item.current_path.split(path.sep).pop();
      const hostname = psl.get(extractHostname(item.referrer));
      const downloadStart = convertChromeTimeToUnixTimestamp(item.start_time);
      const fileSize = byteSize(item.total_bytes);
      let subtitle = (await existsAsync(item.current_path)) ? '[O]' : '[X]';
      subtitle += ` Downloaded in ${getLocaleString(
        downloadStart,
        conf.locale
      )}, From '${hostname}'`;

      const ret = {
        title: fileFileName,
        subtitle,
        arg: item.current_path,
        quicklookurl: item.current_path,
        mods: {
          shift: {
            subtitle: `File size: ${fileSize.value}${fileSize.unit}`,
          },
        },
      };

      (await existsAsync(`cache${sep}${hostname}.png`)) &&
        (ret.icon = {
          path: `cache${sep}${hostname}.png`,
        });

      return ret;
    })
  );

  if (result.length === 0) {
    result.push({
      valid: true,
      title: 'No download logs were found.',
      autocomplete: 'No download logs were found.',
      subtitle: '',
      text: {
        copy: 'No download logs were found.',
        largetype: 'No download logs were found.',
      },
    });
  } else {
    result.splice(0, 0, {
      valid: true,
      title: `${result.length} download logs were found.`,
      arg: `${sep}Users${sep}${userName}${sep}Downloads${sep}`
    });
  }

  arvish.output(result);
}) ();
