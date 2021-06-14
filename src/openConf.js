const arvish = require('arvish');
const fs = require('fs');

(async function () {
  const path = arvish.config.path;
  if (!fs.existsSync(path)) {
    require('./init.js');
  }

  arvish.output([{ 
    title: 'Open config file',
    arg: path 
  }]);
} ());