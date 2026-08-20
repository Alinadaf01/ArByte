"use strict";

module.exports = {
  meta: {
    name: "@arbyte/eslint-plugin-no-hardcoding",
  },
  rules: {
    "no-hex-colors": require("./no-hex-colors"),
  },
};
