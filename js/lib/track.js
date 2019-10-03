'use strict';

var Track = (function() {

  function Track(config) {
    var defaults = {
      "id": "k",
      "url": "./audio/drum_machines/Roland_Tr-808_full__36kick.mp3",
      "gain": -10,
      "fadeOut": "64n",
      "reverb": 0.5,
      "pattern": [1,0,0,0, 0,0,0,0, 1,1,0,1, 0,0,0,0],
      "patternProps": false,
      "template": "",
      "$parent": ""
    };
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  Track.prototype.init = function(){
    var _this = this;
    var opt = this.opt;

    this.opt.title = opt.title || opt.url.substring(opt.url.lastIndexOf('/')+1);
    this.opt.clipEnd = opt.clipEnd || 0;
    this.opt.duration = opt.duration || 0;

    this.loaded = false;
    this.isMuted = false;
    this.isSolo = false;
    this.pattern = this.opt.pattern;

    this.patternProps = this.opt.patternProps;
    if (this.patternProps === false) {
      this.patternProps = _.map(this.pattern, function(v){ return {}; });
    }

    this.loadPlayer();
    this.loadUI();

  };

  Track.prototype.destroy = function(){
    this.player.dispose();
  };

  Track.prototype.loadPlayer = function(){
    var _this = this;

    // init player
    this.reverb = new Tone.Freeverb(this.opt.reverb);
    this.player = new Tone.Player({
      "url": this.opt.url,
      "volume": this.opt.gain,
      "fadeOut": this.opt.fadeOut,
      "onload": function(){ _this.onPlayerLoad(); }
    }).chain(this.reverb, Tone.Master);
  };

  Track.prototype.loadUI = function(){
    var _this = this;
    var $html = $(this.opt.template(this.opt));
    $html.attr('data-track', this.opt.id);
    // highlight beats
    var pattern = this.pattern;
    $html.find('.beat').each(function(i){
      if (pattern[i] > 0) $(this).addClass('active');
    });
    this.opt.$parent.append($html);
    this.$el = $html;
    this.$muteButton = $html.find('.mute-button');
    this.$soloButton = $html.find('.solo-button');

    this.$settingsParent = this.opt.$settingsParent;
    this.$settingsDialog = this.$settingsParent.find('.dialog');

  };

  Track.prototype.mute = function(){
    this.isMuted = true;
    this.$el.addClass('muted');
    this.$muteButton.addClass('active');
  };

  Track.prototype.onPlayerLoad = function(){
    console.log("Loaded", this.opt.url)
    this.loaded = true;

    var dur = this.player.buffer.duration;
    this.opt.duration = dur;
    this.opt.clipEnd = +dur.toFixed(3);
  };

  Track.prototype.play = function(time, i){
    if (!this.loaded || this.isMuted) return;
    if (this.pattern[i] <= 0) return;

    var dur = this.opt.clipEnd > 0 ? this.opt.clipEnd : "32n";
    if (this.patternProps[i].clipEnd) dur = this.patternProps[i].clipEnd;
    if (Math.abs(dur-this.opt.duration) <= 0.001) this.player.start(time);
    else this.player.start(time, 0, dur);
  };

  Track.prototype.setGain = function(db){
    this.player.volume.value = db;
  };

  Track.prototype.setReverb = function(roomSize){
    this.reverb.roomSize.value = roomSize;
  };

  Track.prototype.showSettings = function(col){
    // check if this is a setting for a particular column in the pattern
    var isCol = (col !== undefined && col !== false);
    var colProps = {};
    if (isCol) {
      colProps = this.patternProps[col];
      colProps.title = this.opt.title + " (" + (col+1) + "/16)";
    }
    var html = this.opt.settingsTemplate(_.extend({}, this.opt, colProps));
    this.$settingsDialog.html(html);
    if (isCol) this.$settingsDialog.find('.track-only').css("display", "none");
    this.$settingsParent.addClass('active');
  };

  Track.prototype.solo = function(){
    this.isSolo = true;
    this.$el.addClass('solo');
    this.$soloButton.addClass('active');
    this.unmute();
  };

  Track.prototype.toggleMute = function(){
    if (this.isMuted) this.unmute();
    else this.mute();
    return this.isMuted;
  };

  Track.prototype.toggleSolo = function(){
    if (this.isSolo) this.unsolo();
    else this.solo();
    return this.isSolo;
  };

  Track.prototype.unmute = function(){
    this.isMuted = false;
    this.$el.removeClass('muted');
    // this.player.mute = false;
    this.$muteButton.removeClass('active');
  };

  Track.prototype.unsolo = function(){
    this.isSolo = false;
    this.$el.removeClass('solo');
    this.$soloButton.removeClass('active');
  };

  Track.prototype.updatePatternCol = function(col, value) {
    this.pattern[col] = value;
  };

  Track.prototype.updateSetting = function(property, value, $target, col) {
    // console.log("update", property, value, col);
    if (col !== false) {
      this.patternProps[col][property] = value;
    } else {
      this.opt[property] = value;
    }
    $target.text(value);
    if (col===false) return;
    if (property==="gain") this.setGain(value);
    else if (property==="reverb") this.setReverb(value);
  };

  return Track;

})();
