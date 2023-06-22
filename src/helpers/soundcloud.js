const axios = require('axios');
const trace = require('debug')('soundcloud-rp:trace');

module.exports = (config) => {

  function getTrackData(url) {
    trace('soundcloud.getTrackData', url);

    return axios.get('https://api-v2.soundcloud.com/resolve', {
      params: {
        client_id: config.soundcloud.ClientID,
        url
      },
      responseType: 'json'
    })
    .then(response => response.data);
  }

  function sanitizeArtworkUrl(url) {
    trace('soundcloud.sanitizeArtworkUrl', url);

    return url.replace('large', 't500x500');
  }

  return {
    getTrackData,
    sanitizeArtworkUrl
  };
};