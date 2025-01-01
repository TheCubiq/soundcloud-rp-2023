const trace = require('debug')('soundcloud-rp:trace');
const debug = require('debug')('soundcloud-rp:activity');
const { MAX_ARTWORK, ARTWORK_TRACK, ARTWORK_ARTIST, ARTWORK_SMALL } = require('../helpers/artwork');
const image = require('../helpers/image');

const WAIT_BEFORE_CLEAR = 15;

module.exports = (config, rpc) => {

  const soundcloud = require('../helpers/soundcloud')(config);
  const discord = require('../helpers/discord')(config);

  let pageCounter = 0;
  let pageCount = 0;
  let pageData = [];


  nextPage = (rpcInfo) => {    
    // if there's '-' or '|' in the rpcInfo, split
    let info = rpcInfo.map(item => item.split(/[-|&,]/)).flat().map(item => item.trim());
    // compare info with pageData, if they are the same, return the next page
    if (!(info.length == pageData.length && info.every((value, index) => value === pageData[index]))) { 
      pageData = info;
    }    
    pageCount = info.length;
    // counter will be used to know which text to return
    debug("info: ", pageData);
    pageCounter = (pageCounter + 1) % pageCount;
    debug(`page: ${pageCounter+1}/${pageCount}`);
    debug(`pageCounter: ${pageCounter}`);
    debug(`pageCount: ${pageCount}`);

    
    debug(`previousPage: ${(pageCounter - 1 + pageCount) % pageCount}`);
    return info[pageCounter];
  }

  modullo = (n, m) => {
    return ((n % m) + m) % m;
  }

  getPage = (offset) => {
    // depending on direction
    // if (config.scrolling.enabled) {
    //     return pageData[(pageCounter + 
    //         config.scrolling.direction + 
    //         offset-2 + 
    //         pageCount) % pageCount
    //         ];
    // }
    const direction = (config.scrolling.direction == "up") ? 1 : -1;
    const index =  modullo((pageCounter + (offset*direction)), pageCount);
    return pageData[index];


  }

  setArtwork = (type, keys) => {

    let messages = config.customMessages.length;

    if (type+1 == ARTWORK_TRACK) {

      // page where the track name is on 
      if (pageCounter <= (pageCount - messages - 2)) {
        return keys[ARTWORK_TRACK-1]
      }

      // page where the artist name is on    
      if (pageCounter == (pageCount - messages - 1)) {
        return keys[ARTWORK_ARTIST-1]
      }

      if (config.artworks.bigKey.enabled){
        return (config.artworks.bigKey.url);
      }
    }
    else {
      if (pageCounter >= (pageCount - messages)) {
        return keys[ARTWORK_ARTIST-1]
      }
      if (config.artworks.smallKey.enabled){
        return (config.artworks.smallKey.url);
      }
    }

    return keys[type] || "default"
  }

  function processArtwork(type, id, url) {
    trace('activity.processArtwork', type, id, url);

    return new Promise((resolve, reject) => {
      const key = `${type == ARTWORK_TRACK ? 'track' : 'artist'}_${id}`;

      debug("Generated key for artwork:", key);

      

      if (!config.uploadArtwork) {
        // now we don't need to upload it to discord app assets anymore,
        // just pass the url we got. discord will nicely display it

        if (type){
          return resolve(url || "default")
        }

        return resolve('default');
      }

      debug("Checking if artwork is already uploaded...");
      discord.getAssetList()
      .then((assets) => {

        for (let i = 0; i < assets.length; i++) {
          if (assets[i].name == key) {
            debug("Artwork already uploaded, no action needed.");
            return resolve(key);
          }
        }

        debug("Artwork not already uploaded.");

        function continueUpload() {
          let image_processor;

          if (url == null || url.startsWith('http://a1.sndcdn.com/images/default_avatar_large.png')) {
            debug("Artwork is placeholder, getting datauri from stock ones...");
            image_processor = image.imageDataFromFile(`assets/placeholder-${id % 11}.png`);
          }
          else {
            debug("Getting artwork datauri from soundcloud cdn...");
            image_processor = image.imageDataFromUrl(soundcloud.sanitizeArtworkUrl(url));
          }

          image_processor
          .then((data) => {
            debug("Uploading artwork to discord...");
            discord.uploadAsset(type, key, data)
            .then(() => {
              debug("Artwork processed successfully!");
              resolve(key);
            })
            .catch(reject)
          })
          .catch(reject)
        }

        if (assets.length >= MAX_ARTWORK) {
          debug("Asset limit reached, deleting old unused assets...");
          discord.deleteAsset(assets[0].id)
          .then(continueUpload)
          .catch(reject);
        } else {
          continueUpload();
        }

      })
      .catch(reject)
    });
  }

  let LOCKED = false;

  return (request_data) => {
    trace('activity', request_data);

    return new Promise((resolve, reject) => {

    if (!('url' in request_data) || !('pos' in request_data)) {
      debug("Bad Request, missing arguments");
      reject(new Error('Missing url/pos argument.'));
      return;
    }

    if (!rpc.status) {
      debug("Service Unavailable, rpc not connected");
      reject(new Error('RPC not connected to Discord.'));
      return;
    }

    if (LOCKED) {
      debug("LOCKED state, we are already updating activity");
      reject(new Error('An activity request is already being processed.'));
      return;
    }

    function success() {
      LOCKED = false;
      resolve();
    }

    function error(err) {
      LOCKED = false;
      reject(err);
    }

    try{

    LOCKED = true;

    let last_activity = rpc.getActivity();
    if (last_activity && last_activity.trackURL == request_data.url) {
      debug('track info already sent, updating timestamps only...');
      last_activity.startTimestamp = Math.round(new Date().getTime() / 1000) - request_data.pos;
      last_activity.endTimestamp = last_activity.startTimestamp + Math.round(last_activity.trackDuration / 1000);

      rpc.setActivity(last_activity)
      .then(() => {
        rpc.setActivityTimeout(last_activity.endTimestamp + WAIT_BEFORE_CLEAR);

        success();
      })
      .catch(error);
      return;
    }

    debug("getting track info...");
    soundcloud.getTrackData(request_data.url)
    .then((track_data) => {
      debug("Track info downloaded successfully.", track_data.id);

      let startTimestamp = Math.round(new Date().getTime() / 1000) - request_data.pos,
        endTimestamp = startTimestamp + Math.round(track_data.duration / 1000);

      debug("Processing artwork...");
      let keys = [];

      processArtwork(ARTWORK_TRACK, track_data.id, track_data.artwork_url)
      .then((key) => keys.push(key))
      .then(() => processArtwork(ARTWORK_ARTIST, track_data.user.id, track_data.user.avatar_url))
      .then((key) => keys.push(key))
      .then(() => {
        debug('Artwork processed successfully', keys);

        let rpcInfo = [
          track_data.title,
          `🎤 ${track_data.user.username}`,
          ...config.customMessages
        ]

        nextPage(rpcInfo)

        let activity_data = {
          // details: `🎵 ${track_data.title}`,
          // state: `${getPage(0)}`,
          details: `${getPage(0)}`,
          state: `${getPage(1)}`,
          startTimestamp,
          endTimestamp,
          largeImageKey: setArtwork(0, keys),
          largeImageText: track_data.title,
          smallImageKey: setArtwork(1, keys),
          smallImageText: track_data.user.username,

          buttons: [
            { 
              label: config.listenButtonText, 
              url: request_data.url 
            }
          ],

        };

        // debug("Everything ok, updating activity.", activity_data);
        rpc.setActivity(activity_data)
        .then(() => {
          rpc.setActivityTimeout(endTimestamp + WAIT_BEFORE_CLEAR);

          success();
        })
        .catch(error);
      })
      .catch(error);
    })
    .catch((err) => {
      debug('Error code:', err.response.status);
      if (err.response.status == 401) {
        debug("Unauthorized, make sure that your SC ClientID is valid or expired")
      }
      error(err)
    });
    // .catch(error);

    }
    catch(err) {
      error(err);
    }
  });
  };
};