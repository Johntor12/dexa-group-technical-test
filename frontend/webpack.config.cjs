const path = require('node:path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')

require('dotenv').config({ path: path.resolve(__dirname, '.env'), quiet: true })

module.exports = (_env, argv) => ({
  entry: './src/main.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    publicPath: '/',
    clean: true,
  },
  resolve: { extensions: ['.tsx', '.ts', '.js'] },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: 'defaults' }],
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
          },
        },
      },
      { test: /\.css$/i, use: ['style-loader', 'css-loader', 'postcss-loader'] },
      { test: /\.(png|jpe?g|gif|svg|webp|woff2?)$/i, type: 'asset/resource' },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './index.html', favicon: './public/favicon.svg' }),
    new webpack.DefinePlugin({
      'process.env.REACT_APP_API_URL': JSON.stringify(
        process.env.REACT_APP_API_URL ?? 'http://localhost:3000/api/v1',
      ),
    }),
  ],
  devtool: argv.mode === 'production' ? false : 'eval-source-map',
  devServer: {
    port: 5173,
    host: 'localhost',
    historyApiFallback: true,
    hot: true,
    static: { directory: path.resolve(__dirname, 'public') },
  },
})
