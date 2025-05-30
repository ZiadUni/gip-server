// i18n.js - Backend localization setup for Express
const i18n = require('i18n');
const path = require('path');

i18n.configure({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  directory: path.join(__dirname, 'locales'),
  objectNotation: true,
  queryParameter: 'lang', // allows ?lang=ar
  autoReload: true,
  syncFiles: true,
  cookie: 'lang'
});

module.exports = i18n;
