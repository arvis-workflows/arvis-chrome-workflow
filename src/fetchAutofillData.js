const arvish = require('@jopemachine/arvish');
require('./init.js');
const {
  getWebDataDB,
  getLocaleString,
} = require('./utils');
const _ = require('lodash');
const conf = arvish.config.get('setting');
const path = require('path');
const sep = path.sep;

(async function() {
  let input = arvish.input ? arvish.input.normalize() : '';

  const webDataDB = getWebDataDB();
  let autofillDatas = webDataDB
    .prepare(
      `
      SELECT value, name, date_created, count
        FROM autofill
        WHERE value LIKE '%${input}%' OR name LIKE '%${input}%'
        ORDER BY ${conf.cha.sort} DESC
      `
    )
    .all();

  let deletedItems;
  const wholeLogLen = autofillDatas.length;

  autofillDatas = _.uniqBy(autofillDatas, 'value');
  autofillDatas = autofillDatas.slice(0, conf.cha.result_limit);

  const result = await Promise.all(
    autofillDatas.map(async (item) => {
      const createdDate = getLocaleString((item.date_created * 1000), conf.locale);
      return {
        title: item.value,
        subtitle: `Group: "${item.name}", Created Date: ${createdDate}`,
        arg: item.value,
        icon: {
          path: `assets${sep}info.png`,
        },
        text: {
          copy: item.value,
          largetype: item.value,
        },
        mods: {
          cmd: {
            subtitle: 'Press Enter to copy this url to clipboard',
          },
        },
      };
    })
  );

  if (result.length === 0) {
    result.push({
      valid: true,
      title: 'No data were found.',
      autocomplete: 'No data were found.',
      subtitle: '',
      text: {
        copy: 'No data were found.',
        largetype: 'No data were found.',
      },
    });
  } else {
    result.splice(0, 0, {
      valid: true,
      title: `${wholeLogLen} data were found.`,
      subtitle: `${result.length} shows up ${
        deletedItems ? `(${deletedItems} deleted due to duplication)` : ''
      }`,
    });
  }

  arvish.output(result);
}) ();