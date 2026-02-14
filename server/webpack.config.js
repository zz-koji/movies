const path = require('path');

module.exports = function (options) {
  return {
    ...options,
    resolve: {
      ...options.resolve,
      alias: {
        ...options.resolve?.alias,
        '@app/utils': path.resolve(__dirname, 'libs/utils/src'),
      },
    },
    watchOptions: {
      poll: 1000,
    },
  };
};
