export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      apiUrl: process.env.API_URL || null,
      eas: config.extra?.eas,
    },
  };
};
