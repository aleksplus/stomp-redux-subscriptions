// Loaded via `node --require`: redirects the broken ESM build of
// @p.aleks/redux-subscriptions-manager to the local runtime stub.
const path = require('path');
const Module = require('module');

const origResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, ...rest) {
  if (request === '@p.aleks/redux-subscriptions-manager') {
    return path.join(__dirname, 'subs-manager-stub.cjs');
  }
  return origResolveFilename.call(this, request, ...rest);
};
