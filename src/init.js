const arvish = require('arvish');

if (!arvish.config.has('setting')) {
  const defaultConfig = {
    browser: 'Chrome',
    locale: 'en',
    chrome_profile: 'Default',
    exclude_domains: [],
    chh: {
      result_limit: 50,
      delete_duplicate: true,
      sort: 'last_visit_time DESC',
    },
    chm: {
      result_limit: 50,
      delete_duplicate: true,
      sort: 'last_updated_time_s',
    },
    cha: {
      result_limit: 50,
      delete_duplicate: true,
      sort: 'count',
    },
    chs: {
      result_limit: 50,
      delete_duplicate: true,
    },
    chd: {
      sort: 'DESC',
    },
    chb: {
      sort: 'VISIT_FREQ',
    },
  };

  arvish.config.set('setting', defaultConfig);
}