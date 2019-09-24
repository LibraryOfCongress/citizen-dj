'use strict';

var Sequencer = (function() {

  function Sequencer(config) {
    var defaults = {
      "el": "#sequencer",
      "keyUrls": {
        "k" : "./audio/drum_machines/Roland_Tr-808_full__36kick.mp3",
        "s" : "./audio/drum_machines/Roland_Tr-808_full__40snare.mp3",
        "h" : "./audio/drum_machines/Roland_Tr-808_full__42hat_closed.mp3"
      },
      "patternOptions": {},
      "subdivision": 16,
      "bpm": 120,
      "playerGain": 0,
      "playerFadeOut": "64n"
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

    this.keys = new Tone.Players(this.opt.keyUrls, {
      "volume": this.opt.playerGain,
      "fadeOut": this.opt.playerFadeOut,
      "onload": function(){ _this.onPlayersLoad(); }
    }).toMaster();
    this.keyNames = _.keys(this.opt.keyUrls);

    this.pattern = new Pattern(this.opt.patternOptions);

    this.loadUI();
    this.setBPM(this.opt.bpm);

    this.loop = new Tone.Sequence(function(time, col){
      _this.onStep(time, col);
    }, this.subdArr, this.subdStr).start(0);
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
  };

  Sequencer.prototype.loadUI = function(){
    this.$toggleButton = this.$el.find(".toggle-play");
    this.$bpmInput = this.$el.find(".bpm-input");
    this.$bpmText = this.$el.find(".bpm-text");
  };

  Sequencer.prototype.onPlayersLoad = function(){
    console.log("All players loaded");
    this.loadListeners();
  };

  Sequencer.prototype.onStep = function(time, col){
    var keys = this.keys;
    var pat = this.pattern.matrix;
    _.each(this.keyNames, function(key){
      if (pat[key][col] > 0) {
        //slightly randomized velocities
        // var vel = Math.random() * 0.5 + 0.5;
        // keys.get(key).start(time, 0, "16n", 0, vel);
        keys.get(key).start(time);
      }
    })
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

  return Sequencer;

})();
