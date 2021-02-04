var path = require("path");
var webpack = require("webpack");
var HtmlWebpackPlugin = require("html-webpack-plugin");
let HtmlWebpackTagsPlugin = require("html-webpack-tags-plugin");
let ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

let { matchCssRule, matchFontsRule, matchTsRule } = require("./shared");
let splitChunks = require("./split-chunks");

module.exports = {
  mode: "development",
  entry: ["webpack-hud", "./example/main.tsx"],
  output: {
    filename: "index.js",
    path: path.join(__dirname, "/dist"),
  },
  devtool: "cheap-source-map",
  module: {
    rules: [matchCssRule, matchFontsRule, matchTsRule],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    modules: [path.join(__dirname, "../example"), "node_modules"],
  },
  devServer: {
    contentBase: __dirname,
    publicPath: "/",
    compress: true,
    clientLogLevel: "info",
    disableHostCheck: true,
    host: "0.0.0.0",
    stats: {
      all: false,
      colors: true,
      errors: true,
      errorDetails: true,
      performance: true,
      reasons: true,
      timings: true,
      warnings: true,
    },
  },
  optimization: {
    minimize: false,
    chunkIds: "named",
    splitChunks: splitChunks,
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({ async: false }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "template.ejs",
    }),
    new HtmlWebpackTagsPlugin({
      append: false,
    }),
  ],
};
