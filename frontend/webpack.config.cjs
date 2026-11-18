const path = require("node:path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
  quiet: true,
});

module.exports = (_env, argv) => {
  const isProduction = argv.mode === "production";
  const configuredApiUrl = process.env.API_URL ?? process.env.REACT_APP_API_URL;
  const apiUrl = configuredApiUrl ?? "http://localhost:3000/api/v1";

  if (isProduction && !configuredApiUrl) {
    throw new Error(
      "API_URL must be set in the Vercel Production environment to the deployed backend URL, for example https://<backend-domain>/api/v1.",
    );
  }

  let parsedApiUrl;
  try {
    parsedApiUrl = new URL(apiUrl);
  } catch {
    throw new Error("API_URL must be a valid absolute HTTP or HTTPS URL.");
  }

  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(
    parsedApiUrl.hostname,
  );
  if (parsedApiUrl.username || parsedApiUrl.password) {
    throw new Error("API_URL must not contain credentials.");
  }

  if (isProduction && isLoopback) {
    throw new Error(
      "Production API_URL cannot point to localhost. Set it to the deployed backend URL in Vercel, then redeploy.",
    );
  }

  if (isProduction && parsedApiUrl.protocol !== "https:") {
    throw new Error(
      "Production API_URL must use HTTPS so passwords and session tokens are encrypted in transit.",
    );
  }

  if (!isProduction && parsedApiUrl.protocol !== "https:" && !isLoopback) {
    throw new Error(
      "Non-local API_URL must use HTTPS. HTTP is allowed only for localhost development.",
    );
  }

  return ({
  entry: "./src/main.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].[contenthash].js",
    publicPath: "/",
    clean: true,
  },
  resolve: { extensions: [".tsx", ".ts", ".js"] },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-env", { targets: "defaults" }],
              [
                "@babel/preset-react",
                {
                  runtime: "automatic",
                  development: argv.mode !== "production",
                },
              ],
              "@babel/preset-typescript",
            ],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
      { test: /\.(png|jpe?g|gif|svg|webp|woff2?)$/i, type: "asset/resource" },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./index.html",
      favicon: "./public/favicon.svg",
    }),
    new webpack.DefinePlugin({
      "process.env.API_URL": JSON.stringify(apiUrl),
    }),
  ],
  devtool: argv.mode === "production" ? false : "eval-source-map",
  devServer: {
    port: 5173,
    host: "localhost",
    historyApiFallback: true,
    hot: true,
    static: { directory: path.resolve(__dirname, "public") },
  },
  });
};
