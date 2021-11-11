export default {
  esm: {
    type: 'babel',
    file: 'taro-use-connect-printer',
    mjs: true,
    minify: true
  },
  cjs: {
    type: 'babel',
    file: 'taro-use-connect-printer',
    lazy: true,
    minify: true
  },
  umd: {
    globals: {
      react: 'React',
      ramda: 'ramda',
      '@tarojs/taro': 'Taro'
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
