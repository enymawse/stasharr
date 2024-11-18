import path from 'path';
import { UserscriptPlugin } from 'webpack-userscript';
import metadata from './metadata.js';
import { fileURLToPath } from 'url';
import TerserPlugin from 'terser-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// eslint-disable-next-line no-undef
const dev = process.env.NODE_ENV === 'development';

if (dev) {
  metadata.name += ' Dev';
  metadata.updateURL = undefined;
  metadata.downloadURL = undefined;
}

export default {
  mode: dev ? 'development' : 'production',
  entry: path.resolve(__dirname, 'src', 'index.tsx'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: dev ? 'stasharr.dev.user.js' : 'stasharr.user.js',
  },
  devtool: dev ? 'eval' : false,
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(jsx|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['babel-preset-solid'],
          },
        },
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  optimization: dev
    ? undefined
    : {
        minimize: true,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              mangle: false,
              compress: {
                defaults: false,
                ecma: '2020',
                drop_console: ['debug'],
              },
              format: {
                comments: false,
                indent_level: 2,
                beautify: true,
              },
            },
          }),
        ],
      },
  resolve: {
    extensions: ['.ts', '.js', '.tsx'],
  },
  plugins: [
    new UserscriptPlugin({
      headers: metadata,
      proxyScript: dev
        ? {
            baseUrl: 'http://localhost:8080',
            filename: '[basename].proxy.user.js',
          }
        : undefined,
    }),
  ],
  devServer: {
    port: 8080,
    hot: false,
    client: false,
    devMiddleware: {
      writeToDisk: true,
    },
    static: {
      directory: path.join(__dirname, 'dist'),
    },
  },
};
