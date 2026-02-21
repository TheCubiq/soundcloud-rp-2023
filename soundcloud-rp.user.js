// ==UserScript==
// @name         Soundcloud Rich Presence
// @namespace    https://github.com/demaisj/soundcloud-rp
// @version      2.1.0
// @description  Adds Discord Rich Presence support to Soundcloud. A server is needed to run in background in order for the system to work.
// @author       demaisj
// @match        https://soundcloud.com/*
// @require      https://cdn.socket.io/4.8.1/socket.io.min.js
// @connect      127.0.0.1
// @grant        none
// ==/UserScript==

(function(){
  var SERVER_URL = 'http://127.0.0.1:7769';
  var POLL_INTERVAL = 10; // seconds

  function init() {
    if (typeof io === 'undefined') {
      console.error('soundcloud-rp: socket.io not loaded');
      return;
    }

    var socket = io.connect(SERVER_URL);

    socket.on('connect', function() {
      console.log('soundcloud-rp: connected to server');
    });

    socket.on('connect_error', function(err) {
      console.warn('soundcloud-rp: connection error, retrying...', err.message);
    });

    function poll_activity() {
      var $title = document.querySelector(".playbackSoundBadge__titleLink"),
        $progress = document.querySelector(".playbackTimeline__progressWrapper"),
        $play = document.querySelector(".playControls__play");

      if (!$title || !$progress || !$play)
        return;

      var url = "https://soundcloud.com" + $title.getAttribute("href"),
        pos = parseInt($progress.getAttribute("aria-valuenow"), 10),
        playing = $play.classList.contains("playing");

      if (!playing)
        return;

      socket.emit('activity', { url: url, pos: pos });
    }

    poll_activity();
    setInterval(poll_activity, POLL_INTERVAL * 1000);
  }

  // Wait a moment for the page to settle, then initialize
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
