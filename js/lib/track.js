'use strict';

var Track = (function() {

  function Track(config) {
    var defaults = {
      "id": "k",
      "url": "./audio/drum_machines/Roland_Tr-808_full__36kick.mp3",
      "gain": -6,
      "fadeOut": "64n",
      "reverb": 0.5,
      "pattern": [1,0,0,0, 0,0,0,0, 1,1,0,1, 0,0,0,0],
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

    this.loadPlayer();
    this.loadUI();

  };

  Track.prototype.destroy = function(){
    this.player.dispose();
    this.$el.remove();
  };

  Track.prototype.loadPlayer = function(){
    var _this = this;

    // init player
    this.reverb = new Tone.Freeverb(this.opt.reverb);
    // this.volume = new Tone.Volume();
    this.playerUrl = this.opt.url;
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
    console.log("Loaded", this.playerUrl)
    this.loaded = true;

    var dur = this.player.buffer.duration;
    this.opt.duration = dur;
    this.opt.clipEnd = +dur.toFixed(3);
  };

  Track.prototype.play = function(time, i){
    if (!this.loaded || this.isMuted) return;
    if (this.pattern[i] <= 0) return;

    // randomize play time
    var _this = this;
    var rtime = time + (Math.random() * 0.01 - 0.005);

    // randomize volume
    // Tone.Transport.scheduleOnce(function(){
    //   _this.volume.volume.value = _.random(-6, 0);
    // }, rtime-0.001);

    var dur = this.opt.clipEnd > 0 ? this.opt.clipEnd : "32n";
    if (Math.abs(dur-this.opt.duration) <= 0.001) this.player.start(rtime);
    else this.player.start(rtime, 0, dur, 0);
  };

  Track.prototype.setGain = function(db){
    this.player.volume.value = db;
  };

  Track.prototype.setReverb = function(roomSize){
    this.reverb.roomSize.value = roomSize;
  };

  Track.prototype.showSettings = function(){
    var html = this.opt.settingsTemplate(_.extend({}, this.opt));
    this.$settingsDialog.html(html);
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

  Track.prototype.update = function(track){
    var _this = this;
    // change url
    if (track.url && track.url !== this.playerUrl) {
      this.playerUrl = track.url;
      this.loaded = false;
      this.player.load(track.url, function(){
        _this.onPlayerLoad();
      });
    }
    if (track.pattern) {
      this.pattern = track.pattern;
      this.$el.find('.beat').each(function(i){
        if (track.pattern[i] > 0) $(this).addClass('active');
        else $(this).removeClass('active');
      });
    }
    if (track.title) {
      var $title = this.$el.find('.track-title-text');
      $title.text(track.title);
      $title.attr('title', track.title);
    }
  };

  Track.prototype.updatePatternCol = function(col, value) {
    this.pattern[col] = value;
  };

  Track.prototype.updateSetting = function(property, value, $target) {
    // console.log("update", property, value);
    this.opt[property] = value;
    $target.text(value);
    if (property==="gain") this.setGain(value);
    else if (property==="reverb") this.setReverb(value);
  };

  return Track;

})();
