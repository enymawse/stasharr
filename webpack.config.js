import path from 'path';
import { UserscriptPlugin } from 'webpack-userscript';
import metadata from './metadata.js';
import { fileURLToPath } from 'url';
import TerserPlugin from 'terser-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env = {}, argv = {}) => {
  const dev = argv.mode === 'development';
  const local = env.local === true || env.local === 'true';
  const userscriptMetadata = { ...metadata };

  if (dev) {
    userscriptMetadata.name += ' Dev';
    userscriptMetadata.updateURL = undefined;
    userscriptMetadata.downloadURL = undefined;
  }

  if (local && !dev) {
    userscriptMetadata.name += ' Local';
    userscriptMetadata.updateURL = undefined;
    userscriptMetadata.downloadURL = undefined;
  }

  return {
    mode: dev ? 'development' : 'production',
    entry: path.resolve(__dirname, 'src', 'index.tsx'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: dev
        ? 'stasharr.dev.user.js'
        : local
          ? 'stasharr.local.user.js'
          : 'stasharr.user.js',
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
          test: /\.jsx?$/,
          include: /node_modules[\\/]solid-fontawesome/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['babel-preset-solid'],
            },
          },
        },
        {
          test: /\.(css|scss)$/,
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
                compress: {
                  defaults: true,
                  ecma: '2020',
                  drop_console: ['debug'],
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
        headers: userscriptMetadata,
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
};
