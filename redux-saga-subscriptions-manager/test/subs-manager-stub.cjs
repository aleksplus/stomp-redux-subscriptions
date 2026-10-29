// Runtime stub for @p.aleks/redux-subscriptions-manager.
// The linked package ships an ESM build with extensionless relative imports,
// which plain Node cannot load (it only works under a bundler). The saga
// manager only needs the two method constants at runtime; see
// alias-subs-manager.cjs for how this stub gets wired in.
exports.SUBSCRIPTIONS_SUBSCRIBE = 'SUBSCRIPTIONS_SUBSCRIBE';
exports.SUBSCRIPTIONS_UNSUBSCRIBE = 'SUBSCRIPTIONS_UNSUBSCRIBE';
