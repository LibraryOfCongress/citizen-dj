'use strict';

var Sequencer = (function() {

  function Sequencer(config) {
    var defaults = {
      'el': '#sequencer',
      'tracks': {},
      'subdivision': 16,
      'bpm': 90,
      'swing': 0.5, // between -0.5 and 0.5
      'onChange': function(){},
      'recordingStreamDestination': false
    };
    this.defaultBPM = defaults.bpm;
    var globalConfig = typeof CONFIG !== 'undefined' ? CONFIG : {};
    var q = Util.queryParams();
    if (config.urlVarMap) {
      q = Util.mapVars(q, config.urlVarMap, true);
    }
    this.opt = _.extend({}, defaults, config, globalConfig, q);
    this.init();
  }

  Sequencer.prototype.init = function(){
    var _this = this;

    this.$el = $(this.opt.el);
    this.subdStr = this.opt.subdivision + 'n';
    this.subdArr = _.times(this.opt.subdivision, function(n){ return n; });
    this.playing = false;

    this.loadUI();

    // init tracks
    this.players = {}; // by url
    this.tracks = {};
    this.trackIds = [];
    this.$tracks = this.$el.find('.sequence').first();

    var playerPromises = this.loadPlayers(this.opt.tracks);
    $.when.apply(null, playerPromises).done(function() {
      console.log('Loaded all players');

      var trackPromises = _this.loadTracks(_this.opt.tracks);
      $.when.apply(null, trackPromises).done(function() {
        console.log('Loaded all tracks');
        _this.onReady();
      });
    });

    // set bpm
    this.setBPM(this.opt.bpm);
  };

  Sequencer.prototype.addTrack = function(id, track, type){
    var promise;
    var _this = this;

    track.id = id;
    track.template = this.trackTemplate;
    track.settingsTemplate = this.settingsTemplate;
    track.$settingsParent = this.$settings;
    track.recordingStreamDestination = this.opt.recordingStreamDestination;
    type = type || track.trackType;

    if (!_.has(this.trackIds, type)) this.trackIds[type] = [];
    track.buffer = this.players[track.url].buffer.get();

    if (_.contains(this.trackIds[type], id)) {
      promise = this.tracks[id].update(track);
    } else {
      this.tracks[id] = new Track(track);
      promise = this.tracks[id].load();
      this.trackIds[type].push(id);
    }
    return promise;
  };

  Sequencer.prototype.downloadCurrentPattern = function($el){
    if ($el.hasClass('downloading')) {
      console.log('Already downloading pattern.');
      return;
    }

    var _this = this;
    $el.addClass('downloading');
    var originalText = $el.text();
    $el.text('Downloading...');

    var filename = 'citizen-dj-sequence-' + Util.timeToString().replace(':','').replace(' ','-') + '.wav';
    var patternDuration = Tone.Time(_this.subdStr).toSeconds() * _this.opt.subdivision;
    console.log('Rendering '+ filename + ' with duration '+patternDuration+'s');
    Tone.Offline(function(){
      var offlinePlayers = {};

      Tone.Transport.bpm.value = _this.bpm;
      _.each(_this.tracks, function(track, id){
        var offlinePlayer = new Tone.Player({
          'url': track.player.buffer.get(),
          'volume': track.opt.gain,
          'fadeIn': track.opt.fadeIn,
          'fadeOut': track.opt.fadeOut
        }).toMaster();
        offlinePlayers[id] = offlinePlayer;
      });

      var offlineLoop = new Tone.Sequence(function(time, col){
        // console.log(time, col);
        var secondsPerSubd = _this.secondsPerSubd;
        // swing every second subdivision
        var swing = _this.swing;
        if (col % 2 < 1) swing = 0;
        var swungTime = time + swing;

        _.each(_this.tracks, function(track, key){
          if (track.isMuted) return;
          if (track.pattern[col] <= 0) return;

          // randomize play time
          var randomizeMagnitude = 0.1; // increase to make more random
          var randAmount = randomizeMagnitude * secondsPerSubd;
          var randDelta = Math.random() * randAmount;
          var rtime = swungTime + randDelta;

          var dur = track.opt.clipDur > 0 ? track.opt.clipDur : "32n";
          // console.log(rtime, track.opt.clipStart, dur)
          if (Math.abs(dur-track.opt.duration) <= 0.001 && track.opt.clipStart === 0) {
            offlinePlayers[key].start(rtime); // play the full file
          } else {
            dur = Math.min(dur, track.opt.duration-track.opt.clipStart);
            if (dur > 0) {
              offlinePlayers[key].start(rtime, track.opt.clipStart, dur); // play the clip
            }
          }
        });

      }, _this.subdArr, _this.subdStr).start(0);
      Tone.Transport.start();

      //schedule their events
    }, patternDuration).then(function(buffer){
      console.log("Done rendering clip.");
      //do something with the output buffer
      var audioBuffer = buffer.get();
      AudioUtils.audioBufferToWavfile(audioBuffer, filename);
      $el.text(originalText);
      $el.removeClass('downloading');
    });


  };

  Sequencer.prototype.downloadTrackAudio = function(trackId, $el){
    if (!_.has(this.tracks, trackId)) {
      console.log('No track ID found for '+trackId)
      return;
    }

    if ($el.hasClass('downloading')) {
      console.log('Already downloading '+trackId);
      return;
    }

    $el.addClass('downloading');
    var originalText = $el.text();
    $el.text('Downloading...');
    var track = this.tracks[trackId];
    track.saveClipToFile(function(){
      $el.text(originalText);
      $el.removeClass('downloading');
    });
  };

  Sequencer.prototype.loadListeners = function(){
    var _this = this;

    // toggle play
    if (this.$toggleButton.length) {
      this.$toggleButton.on('click', function(e){
        _this.togglePlay();
      });
    }

    // record audio
    $('.record-audio').on('click', function(e){
      _this.onClickRecord($(this));
    });

    // share url
    $('.share-pattern').on('click', function(e){
      window.prompt('Copy this URL to clipboard: Ctrl+C, Enter', window.location.href);
    });

    // download current pattern
    $('.download-pattern').on('click', function(e){
      _this.downloadCurrentPattern($(this));
    });

    // change tempo
    if (this.$bpmInput.length) {
      this.$bpmInput.on('input', function(e){
        _this.setBPM(parseInt($(this).val()), true);
      });
    }

    // update pattern
    this.$tracks.on('change', '.beat input', function(e){
      _this.onChangeBeat($(this), true);
    });

    // mute track
    this.$tracks.on('click', '.mute-button', function(e){
      _this.onClickMute($(this));
    });

    // solo track
    this.$tracks.on('click', '.solo-button', function(e){
      _this.onClickSolo($(this));
    });

    // invoke settings for track track
    var $settingsButton = false;
    this.$tracks.on('click', '.settings-button', function(e){
      $settingsButton = $(this);
      _this.onClickSettings($settingsButton);
    });

    $('main').on('click', '.play-audio', function(e){
      e.preventDefault();
      _this.playAudio($(this).attr('href'));
    });

    $('body').on('click', '.download-track-audio', function(e){
      e.preventDefault();
      _this.downloadTrackAudio($(this).attr('data-id'), $(this));
    });

    $('main').on('click', '.play-track-audio', function(e){
      e.preventDefault();
      _this.playTrackAudio($(this).attr('data-id'));
    });

    $('main').on('click', '.scroll-to', function(e){
      var offset = $('.sequence-controls-nav').first().height();
      e.preventDefault();
      Util.scrollTo($(this).attr('href'), -offset);
    });

    // close dialogs
    $('body').on('click', '.dialog-close-button', function(e){
      $('.dialog-wrapper').removeClass('active');
      if ($settingsButton !== false) $settingsButton.focus();
    });

    // track on settings input
    $('body').on('input', '.track-input', function(e){
      _this.onChangeTrackSettings($(this));
    });
  };

  Sequencer.prototype.loadPatternEdits = function(patternEditsString) {
    var _this = this;
    var tracks = this.tracks;
    var trackKeys = _.keys(tracks);
    trackKeys.sort();
    var patternEdits = Track.stringToTrackPatternEdits(patternEditsString);
    _.each(patternEdits, function(p){
      var key = trackKeys[p.index];
      var $track = $('.track[data-track="'+key+'"]').first();
      if (!$track.length) return;
      _.each(p.patternEdits, function(col){
        var $checkbox = $track.find('input[value="'+col+'"]');
        $checkbox.prop('checked', !$checkbox.prop('checked'));
        _this.onChangeBeat($checkbox);
      });
    });
  };

  Sequencer.prototype.loadPlayers = function(tracks){
    var _this = this;

    // remove any unused players
    var trackUrls = _.pluck(tracks, 'url');
    var newPlayers = this.players;
    _.each(this.players, function(player, url){
      if (_.findIndex(trackUrls, url) < 0) {
        player.dispose();
        newPlayers = _.omit(newPlayers, url);
      }
    });
    this.players = newPlayers;

    // load unloaded players
    var playerPromises = [];
    _.each(tracks, function(track, key){
      if (!_.has(_this.players, track.url)) {
        var deferred = $.Deferred();
        _this.players[track.url] = new Tone.Player({
          "url": track.url,
          "onload": function(){
            console.log('Loaded ' + track.url);
            deferred.resolve();
          }
        });
        playerPromises.push(deferred);
      }
    });
    return playerPromises;
  };

  Sequencer.prototype.loadTracks = function(tracks, type){
    var _this = this;
    var trackPromises = [];
    _.each(tracks, function(props, key) {
      trackPromises.push(_this.addTrack(key, props, type));
    });
    return trackPromises;
  };

  Sequencer.prototype.loadTemplate = function(el, className){
    var $template = $(el).first().clone();
    return _.template($template.html());
  };

  Sequencer.prototype.loadUI = function(){
    this.$toggleButton = this.$el.find('.toggle-play');
    this.$bpmInput = this.$el.find('.bpm-input');
    this.$bpmText = this.$el.find('.bpm-text');
    this.$settings = $('#modal-track-settings');

    // init templates
    this.trackTemplate = this.loadTemplate('#track-template');
    this.settingsTemplate = this.loadTemplate('#settings-template');
  };

  Sequencer.prototype.onChangeTrackSettings = function($input){
    var property = $input.attr('data-property');
    var value = parseFloat($input.val());
    var $target = $($input.attr('data-target'));
    this.tracks[this.currentTrack].updateSetting(property, value, $target);
  };

  Sequencer.prototype.onChangeBeat = function($checkbox, fromUser){
    // console.log('On change beat');
    var value = $checkbox.is(':checked') ? 1 : 0;
    var trackId = $checkbox.closest('.track').attr('data-track');
    var col = parseInt($checkbox.val());
    this.updateTrackPattern(trackId, col, value);
    if (fromUser) this.opt.onChange();
  };

  Sequencer.prototype.onClickMute = function($button) {
    var trackId = $button.closest('.track').attr('data-track');
    this.tracks[trackId].toggleMute();
  };

  Sequencer.prototype.onClickRecord = function($button){
    var isActive = $button.hasClass('active');

    if (isActive && this.playing) {
      this.playing = false;
      this.stop();
    }
  };

  Sequencer.prototype.onClickSettings = function($button) {
    var trackId = $button.closest('.track').attr('data-track');
    this.currentTrack = trackId;
    this.tracks[trackId].showSettings();
  };

  Sequencer.prototype.onClickSolo = function($button) {
    var trackId = $button.closest('.track').attr('data-track');
    var isSolo = this.tracks[trackId].toggleSolo();
    if (isSolo) this.$tracks.addClass('has-solo');
    else this.$tracks.removeClass('has-solo');
    _.each(this.tracks, function(track, key){
      if (key!==trackId) {
        if (isSolo) track.mute();
        else track.unmute();
      }
    });
  };

  Sequencer.prototype.onReady = function(){
    var _this = this;

    // start the loop
    this.loop = new Tone.Sequence(function(time, col){
      _this.onStep(time, col);
    }, this.subdArr, this.subdStr).start(0);

    if (_this.opt.patternEdits && _this.opt.patternEdits.length) {
      this.loadPatternEdits(this.opt.patternEdits);
    }

    this.loadListeners();
  };

  Sequencer.prototype.onStep = function(time, col){
    var _this = this;

    var secondsPerSubd = this.secondsPerSubd;

    // swing every second subdivision
    var swing = this.swing;
    if (col % 2 < 1) swing = 0;

    _.each(this.tracks, function(track, key){
      track.play(time+swing, col, secondsPerSubd);
    });

    //set the columne on the correct draw frame
    Tone.Draw.schedule(function(){
      _this.$tracks.attr('data-col', col);
    }, time);
  };

  Sequencer.prototype.onTrackUpdateLoaded = function(){
    if (!this.playing) return;
    Tone.Transport.pause();
    setTimeout(function(){
      Tone.Transport.start();
    }, 10);
  };

  Sequencer.prototype.playAudio = function(url){
    if (url !== this.currentPlayerUrl) {
      this.currentPlayerUrl = url;
      this.currentPlayer = new Tone.Player(url).toMaster();
      //play as soon as the buffer is loaded
      this.currentPlayer.autostart = true;
    } else {
      this.currentPlayer.start();
    }
  };

  Sequencer.prototype.playTrackAudio = function(trackId){
    if (!_.has(this.tracks, trackId)) {
      console.log('No track ID found for '+trackId)
      return;
    }

    var track = this.tracks[trackId];
    track.playClip('+0.001');
  };

  Sequencer.prototype.reloadFromUrl = function(){
    var _this = this;
    var q = Util.queryParams();

    var bpm = q.bpm ? parseInt(''+q.bpm) : this.defaultBPM;
    if (bpm !== this.bpm) {
      this.setBPM(bpm);
    }

    if (q.patternEdits && q.patternEdits.length) {
      this.loadPatternEdits(q.patternEdits);
    }
  };

  Sequencer.prototype.removeTrack = function(key, type){
    this.trackIds[type] = _.without(this.trackIds[type], key);
    this.tracks[key].destroy();
    delete this.tracks[key];
  };

  Sequencer.prototype.resetSolo = function(){
    _.each(this.tracks, function(track, key){
      if (track.isSolo){
        track.$soloButton.trigger('click');
        return false;
      }
    });
  };

  Sequencer.prototype.setBPM = function(bpm, fromUser){
    bpm = parseInt(''+bpm);
    this.secondsPerSubd = 60.0 / bpm / this.opt.subdivision;
    this.swing = this.secondsPerSubd * this.opt.swing;
    Tone.Transport.bpm.value = bpm;
    this.$bpmText.text(bpm);
    if (!fromUser) this.$bpmInput.val(bpm);
    this.bpm = bpm;
    if (fromUser) this.opt.onChange();
  };

  Sequencer.prototype.start = function(){
    if (Tone.context.state !== 'running') Tone.context.resume();
    Tone.Transport.start();
    this.$toggleButton.text('Stop');
  };

  Sequencer.prototype.stop = function(){
    Tone.Transport.stop();
    this.$toggleButton.text('Play');
  };

  Sequencer.prototype.togglePlay = function(){
    this.playing = !this.playing;
    if (this.playing) this.start();
    else this.stop();
  };

  Sequencer.prototype.toJSON = function(){
    var data = {};

    // add pattern edits if there are any
    var patternEditsString = Track.trackPatternEditsToString(this.tracks);
    if (patternEditsString.length > 0) data.patternEdits = patternEditsString;

    // return bpm if not default
    if (this.bpm !== this.defaultBPM) {
      data.bpm = this.bpm;
    }

    return data;
  };

  Sequencer.prototype.update = function(tracks, type, isUnion){
    var _this = this;
    if (!isUnion) {
      var removeIds = _.difference(this.trackIds[type], _.keys(tracks));
      _.each(removeIds, function(id){
        _this.removeTrack(id, type);
      });
    }

    var playerPromises = this.loadPlayers(tracks);
    $.when.apply(null, playerPromises).done(function() {
      console.log('Loaded all players');

      var trackPromises = _this.loadTracks(tracks, type);
      $.when.apply(null, trackPromises).done(function() {
        console.log('Loaded all tracks');
        _this.onTrackUpdateLoaded();
      });
    });
  };

  Sequencer.prototype.updateTrackPattern = function(trackId, col, value) {
    this.tracks[trackId].updatePatternCol(col, value);
  };

  return Sequencer;

})();
