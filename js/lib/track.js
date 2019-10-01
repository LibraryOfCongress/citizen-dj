'use strict';

var Track = (function() {

  function Track(config) {
    var defaults = {
      "id": "k",
      "url": "./audio/drum_machines/Roland_Tr-808_full__36kick.mp3",
      "gain": 0,
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

    if (!this.opt.title) this.opt.title = opt.url.substring(opt.url.lastIndexOf('/')+1);

    this.loaded = false;
    this.isMuted = false;
    this.pattern = this.opt.pattern;

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
  };

  Track.prototype.mute = function(){
    this.isMuted = true;
    this.$el.addClass('muted');
    this.player.mute = true;
  };

  Track.prototype.onPlayerLoad = function(){
    console.log("Loaded", this.opt.url)
    this.loaded = true;
  };

  Track.prototype.play = function(time, i){
    if (!this.loaded) return;
    if (this.pattern[i] <= 0) return;

    // this.player.start(time, 0, "16n", 0);
    this.player.start(time);
  };

  Track.prototype.setReverb = function(roomSize, fromUser){
    // this.reverb.roomSize.value = roomSize;
    // this.$reverbText.text(roomSize);
    // if (!fromUser) this.$reverbInput.val(roomSize);
  };

  Track.prototype.unmute = function(){
    this.isMuted = false;
    this.$el.removeClass('muted');
    this.player.mute = false;
  };

  Track.prototype.updatePatternCol = function(col, value) {
    this.pattern[col] = value;
  };

  return Track;

})();
