module.exports = function ({ env }) {
  let isProduction = env === 'production';

  return {
    module: {
      rules: [
        {
          test: /\.(png|jpe?g|svg|mp4)$/i,
          // on production we let webpack decide to chose data URI or separate file
          type: isProduction ? 'asset' : 'asset/resource',
          generator: {
            filename: 'static/[name].[hash][ext][query]',
          },
        },
      ],
    },
  };
};
