const axios = require('axios');
const trace = require('debug')('soundcloud-rp:trace');
const DataURI = require('datauri');
const url_parser = require('url').parse;
const path = require('path');

function imageDataFromFile(pathname) {
  trace('image.imageDataFromFile', pathname);

  const datauri = new DataURI();

  return new Promise((resolve, reject) => {
    datauri
      .on('encoded', resolve)
      .on('error', reject)
      .encode(pathname);
  });
}

function imageDataFromUrl(url) {
  trace('image.imageDataFromUrl', url);

  const datauri = new DataURI();

  return new Promise((resolve, reject) => {
    axios.get(url, {
      responseType: 'arraybuffer'
    })
      .then(response => {
        const buffer = Buffer.from(response.data, 'binary');
        const parsed = url_parser(url);
        const filename = path.basename(parsed.pathname);

        datauri.format(filename, buffer);
        resolve(datauri.content);
      })
      .catch(reject);
  });
}

module.exports = {
  imageDataFromUrl,
  imageDataFromFile
};
