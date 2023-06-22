const axios = require('axios');
const trace = require('debug')('soundcloud-rp:trace');

module.exports = (config) => {

  function getAssetList() {
    trace("discord.getAssetList");

    return axios.get(`https://discordapp.com/api/oauth2/applications/${config.discord.ClientID}/assets`, {
      headers: {
        authorization: config.discord.APIKey
      },
      responseType: 'json'
    })
    .then(response => response.data);
  }

  function uploadAsset(type, key, data) {
    trace('discord.uploadAsset', type, key);

    return axios.post(`https://discordapp.com/api/oauth2/applications/${config.discord.ClientID}/assets`, {
      name: key,
      type: type,
      image: data
    }, {
      headers: {
        authorization: config.discord.APIKey
      },
      responseType: 'json'
    })
    .then(response => response.data);
  }

  function deleteAsset(id) {
    trace('discord.deleteAsset', id);

    return axios.delete(`https://discordapp.com/api/oauth2/applications/${config.discord.ClientID}/assets/${id}`, {
      headers: {
        authorization: config.discord.APIKey
      }
    });
  }

  return {
    getAssetList,
    uploadAsset,
    deleteAsset
  };
};
