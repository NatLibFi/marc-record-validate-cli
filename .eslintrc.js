module.exports = {
  'env': {
    'es6': true,
    'node': true
  },
  'extends': 'eslint:recommended',
  'parserOptions': {
    'sourceType': 'module',
    'ecmaVersion': 8
  },
  'plugins': ['async-await'],
  'rules': {
    'indent': [
      'error',
      2
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'quotes': [
      'error',
      'single'
    ],
    'semi': [
      'error',
      'always'
    ],
    'no-console': 0,
    'async-await/space-after-async': 2,
    'async-await/space-after-await': 2
  }
};
