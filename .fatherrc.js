export default {
  esm: {
    type: 'babel',
    mjs: true,
    minify: true,
  },
  cjs: {
    type: 'babel',
    lazy: true,
    minify: true,
  },
  umd: {
    globals: {
      react: 'React',
      '@tarojs/taro': 'Taro',
      querystring: 'querystring',
    },
    name: 'taro-use-connect-printer',
    file: 'taro-use-connect-printer',
    minFile: true,
    sourcemap: true,
  },
  injectCSS: false, // 不注入css
  extractCSS: false, // 单独提取css
  runtimeHelpers: true,
  disableTypeCheck: true,
};
