'use strict';

var Player = (function() {

  function Player(config) {
    var defaults = {};
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  Player.prototype.init = function(){
    this.sound = false;
    this.currentUrl = false;
    this.playing = false;
    this.loadListeners();
  };

  Player.prototype.loadListeners = function(){
    var _this = this;

    $('.toggle-play').on('click', function(e){
      e.preventDefault();
      _this.togglePlay($(this));
    });
  };

  Player.prototype.queuePlay = function(url){
    if (url === this.currentUrl && this.playing) {
      this.sound.play();
    }
  };

  Player.prototype.togglePlay = function($link){
    var _this = this;
    var url = $link.attr('href');
    $link.toggleClass('playing');
    var playing = $link.hasClass('playing');
    this.playing = playing;

    if (this.playing) $link.text('Stop');
    else $link.text('Play');

    if (url !== this.currentUrl) {
      // reset previous sound
      if (this.sound !== false) {
        this.$currentLink.removeClass('playing');
        this.$currentLink.text('Play');
        this.sound.unload();
      }
      this.$currentLink = $link;
      this.currentUrl = url;

      this.sound = new Howl({
        src: [url]
      });
      this.sound.once('load', function(){
        if (_this.playing) _this.queuePlay(url);
      });
      this.sound.on('end', function(){
        $link.removeClass('playing');
        $link.text('Play');
        _this.playing = false;
        _this.sound.stop();
      })
    } else if (this.playing) {
      this.sound.play();
    } else {
      this.sound.stop();
    }
  };

  return Player;

})();
