const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, 'rpgmakermv', 'js', 'plugins'),
    filename: 'FreeMove.js'
  },
  devtool: 'inline-source-map',
  devServer: {
    contentBase: path.join(__dirname, 'rpgmakermv')
  }
};
