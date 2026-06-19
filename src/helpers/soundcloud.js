const axios = require('axios');
const trace = require('debug')('soundcloud-rp:trace');

let cachedClientId = null;

module.exports = (config) => {

  function setClientId(clientId) {
    if (clientId) {
      cachedClientId = clientId;
    }
  }

  function getTrackData(url, client_id) {
    trace('soundcloud.getTrackData', url, client_id);

    if (client_id) {
      cachedClientId = client_id;
    }

    const activeClientId = cachedClientId || config.soundcloud.ClientID;

    return axios.get('https://api-v2.soundcloud.com/resolve', {
      params: {
        client_id: activeClientId,
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
    sanitizeArtworkUrl,
    setClientId
  };
};