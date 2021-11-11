export default {
  esm: {
    type: 'babel',
    mjs: true,
    minify: true,
    file: 'taro-use-connect-printer'
  },
  cjs: {
    type: 'babel',
    lazy: true,
    minify: true,
    file: 'taro-use-connect-printer'
  },
  umd: {
    globals: {
      react: 'React',
      ramda: 'ramda',
      '@tarojs/taro': 'Taro',
      querystring: 'querystring'
    },
    name: 'taro-use-connect-printer',
    file: 'taro-use-connect-printer',
    minFile: true,
    sourcemap: true
  },
  injectCSS: false, // 不注入css
  extractCSS: false, // 单独提取css
  runtimeHelpers: true,
  disableTypeCheck: true
};
