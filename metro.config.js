const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

// PULLBACK NOTE: Added unstable_conditionNames to prevent Metro picking ESM
// builds (which use import.meta) over CJS/react-native builds.
// OLD: Missing — Metro could resolve jotai/zustand/tanstack ESM entries
// NEW: Explicit condition priority: react-native > require > browser > default
config.resolver.unstable_conditionNames = [
  "react-native",
  "require",
  "browser",
  "default",
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect 'ws' to our shim
  if (moduleName === "ws") {
    return {
      filePath: path.resolve(__dirname, "shims/ws.js"),
      type: "sourceFile",
    };
  }

  // Redirect 'stream' to our shim
  if (moduleName === "stream") {
      return {
        filePath: path.resolve(__dirname, "shims/stream.js"),
        type: "sourceFile",
      };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
