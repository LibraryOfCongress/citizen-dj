'use strict';

var Sequencer = (function() {

  function Sequencer(config) {
    var defaults = {
      "el": "#sequencer",
      "tracks": {},
      "subdivision": 16,
      "bpm": 90,
      "swing": 0.5, // between -0.5 and 0.5
      "onChange": function(){}
    };
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  Sequencer.prototype.init = function(){
    var _this = this;

    this.$el = $(this.opt.el);
    this.subdStr = this.opt.subdivision + "n";
    this.subdArr = _.times(this.opt.subdivision, function(n){ return n; });
    this.playing = false;

    this.loadUI();

    // init tracks
    this.tracks = {};
    this.trackIds = [];
    this.$tracks = this.$el.find('.sequence').first();

    _.each(this.opt.tracks, function(props, key) {
      _this.addTrack(key, props);
    });

    // start the loop
    this.setBPM(this.opt.bpm);
    this.loop = new Tone.Sequence(function(time, col){
      _this.onStep(time, col);
    }, this.subdArr, this.subdStr).start(0);

    this.loadListeners();
  };

  Sequencer.prototype.addTrack = function(id, track, type){
    var promise;
    track.id = id;
    track.template = this.trackTemplate;
    track.settingsTemplate = this.settingsTemplate;
    track.$parent = this.$tracks;
    track.$settingsParent = this.$settings;
    type = type || track.trackType;
    if (!_.has(this.trackIds, type)) this.trackIds[type] = [];

    if (_.contains(this.trackIds[type], id)) {
      promise = this.tracks[id].update(track);
    } else {
      this.tracks[id] = new Track(track);
      promise = this.tracks[id].load();
      this.trackIds[type].push(id);
    }
    return promise;
  };

  Sequencer.prototype.loadListeners = function(){
    var _this = this;

    // toggle play
    if (this.$toggleButton.length) {
      this.$toggleButton.on("click", function(e){
        _this.togglePlay();
      });
    }

    // change tempo
    if (this.$bpmInput.length) {
      this.$bpmInput.on("input", function(e){
        _this.setBPM(parseInt($(this).val()), true);
      });
    }

    // update pattern
    this.$tracks.on('click', '.beat', function(e){
      _this.onClickBeat($(this));
      _this.opt.onChange();
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
    this.$tracks.on('click', '.settings-button', function(e){
      _this.onClickSettings($(this));
    });

    // close dialogs
    $('body').on('click', '.dialog-close-button', function(e){
      $('.dialog-wrapper').removeClass('active');
    });

    // track on settings input
    $('body').on('input', '.track-input', function(e){
      _this.onChangeTrackSettings($(this));
    });
  };

  Sequencer.prototype.loadTemplate = function(el, className){
    var $template = $(el).first().clone();
    return _.template($template.html());
  };

  Sequencer.prototype.loadUI = function(){
    this.$toggleButton = this.$el.find(".toggle-play");
    this.$bpmInput = this.$el.find(".bpm-input");
    this.$bpmText = this.$el.find(".bpm-text");
    this.$settings = $('#modal-track-settings');

    // init templates
    this.trackTemplate = this.loadTemplate("#track-template");
    this.settingsTemplate = this.loadTemplate("#settings-template");
  };

  Sequencer.prototype.onChangeTrackSettings = function($input){
    var property = $input.attr('data-property');
    var value = parseFloat($input.val());
    var $target = $($input.attr('data-target'));
    this.tracks[this.currentTrack].updateSetting(property, value, $target);
  };

  Sequencer.prototype.onClickBeat = function($button){
    $button.toggleClass('active');
    var value = $button.hasClass('active') ? 1 : 0;
    var trackId = $button.closest('.track').attr('data-track');
    var col = parseInt($button.attr('data-col'));
    this.updateTrackPattern(trackId, col, value);
  };

  Sequencer.prototype.onClickMute = function($button) {
    var trackId = $button.closest('.track').attr('data-track');
    this.tracks[trackId].toggleMute();
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

  Sequencer.prototype.onStep = function(time, col, subdivision){
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

  Sequencer.prototype.removeTrack = function(key, type){
    this.trackIds[type] = _.without(this.trackIds[type], key);
    this.tracks[key].destroy();
    delete this.tracks[key];
  };

  Sequencer.prototype.setBPM = function(bpm, fromUser){
    this.secondsPerSubd = 60.0 / bpm / this.opt.subdivision;
    this.swing = this.secondsPerSubd * this.opt.swing;
    Tone.Transport.bpm.value = bpm;
    this.$bpmText.text(bpm);
    if (!fromUser) this.$bpmInput.val(bpm);
  };

  Sequencer.prototype.start = function(){
    if (Tone.context.state !== 'running') Tone.context.resume();
    Tone.Transport.start();
    this.$toggleButton.text("Stop");
  };

  Sequencer.prototype.stop = function(){
    Tone.Transport.stop();
    this.$toggleButton.text("Play");
  };

  Sequencer.prototype.togglePlay = function(){
    this.playing = !this.playing;
    if (this.playing) this.start();
    else this.stop();
  };

  Sequencer.prototype.update = function(tracks, type, isUnion){
    var _this = this;
    if (!isUnion) {
      var removeIds = _.difference(this.trackIds[type], _.keys(tracks));
      _.each(removeIds, function(id){
        _this.removeTrack(id, type);
      });
    }

    var promises = [];
    _.each(tracks, function(props, key) {
      promises.push(_this.addTrack(key, props, type));
    });
    $.when.apply(null, promises).done(function() {
      _this.onTrackUpdateLoaded();
    });
  };

  Sequencer.prototype.updateTrackPattern = function(trackId, col, value) {
    this.tracks[trackId].updatePatternCol(col, value);
  };

  return Sequencer;

})();
