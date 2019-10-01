'use strict';

var Sequencer = (function() {

  function Sequencer(config) {
    var defaults = {
      "el": "#sequencer",
      "tracks": {},
      "subdivision": 16,
      "bpm": 120
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
    this.trackIds = _.keys(this.tracks);

    // start the loop
    this.setBPM(this.opt.bpm);
    this.loop = new Tone.Sequence(function(time, col){
      _this.onStep(time, col);
    }, this.subdArr, this.subdStr).start(0);

    this.loadListeners();
  };

  Sequencer.prototype.addTrack = function(id, track){
    track.id = id;
    track.template = this.trackTemplate;
    track.$parent = this.$tracks;

    if (_.contains(this.trackIds, id)) {
      this.tracks[id].destroy();
      this.tracks[id] = new Track(track);
    } else {
      this.tracks[id] = new Track(track);
      this.trackIds.push(id);
    }
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
    });

    // mute track
    this.$tracks.on('click', '.toggle-mute-button', function(e){
      _this.onClickMute($(this));
    });

    // solo track
    this.$tracks.on('click', '.toggle-solo-button', function(e){
      _this.onClickSolo($(this));
    });
  };

  Sequencer.prototype.loadUI = function(){
    this.$toggleButton = this.$el.find(".toggle-play");
    this.$bpmInput = this.$el.find(".bpm-input");
    this.$bpmText = this.$el.find(".bpm-text");

    // init track template
    var $trackTemplate = $('.track.template').first().clone();
    $trackTemplate.removeClass('template');
    var beatString = _.times(this.opt.subdivision, function(i){
      return '<button class="beat beat-'+i+'" data-col="'+i+'"></button>';
    }).join('');
    $trackTemplate.find('.beats').append($(beatString));
    this.trackTemplate = _.template('<div class="track">'+$trackTemplate.html()+'</div>');

  };

  Sequencer.prototype.onClickBeat = function($button){
    $button.toggleClass('active');
    var value = $button.hasClass('active') ? 1 : 0;
    var trackId = $button.closest('.track').attr('data-track');
    var col = parseInt($button.attr('data-col'));
    this.updateTrackPattern(trackId, col, value);
  };

  Sequencer.prototype.onClickMute = function($button) {
    $button.toggleClass('active');
    var isMuted = $button.hasClass('active');
    var trackId = $button.closest('.track').attr('data-track');
    if (isMuted) this.tracks[trackId].mute();
    else this.tracks[trackId].unmute();
  };

  Sequencer.prototype.onClickSolo = function($button) {
    // $button.toggleClass('active');
    // var isSolo = $button.hasClass('active');
    // var trackId = $button.closest('.track').attr('data-track');
    // _.each(this.tracks, function(track, key){
    //   if (key===trackId && isSolo) track.solo();
    //   else if (key===trackId && !isSolo) track.unsolo();
    //   else if (isSolo) track.quiet();
    //   else track.unquiet();
    // });
  };

  Sequencer.prototype.onStep = function(time, col){
    var _this = this;

    _.each(this.tracks, function(track, key){
      track.play(time, col);
    });

    //set the columne on the correct draw frame
    Tone.Draw.schedule(function(){
      _this.$tracks.attr('data-col', col);
    }, time);
  };

  Sequencer.prototype.setBPM = function(bpm, fromUser){
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

  Sequencer.prototype.updateTrackPattern = function(trackId, col, value) {
    this.tracks[trackId].updatePatternCol(col, value);
  };

  return Sequencer;

})();
