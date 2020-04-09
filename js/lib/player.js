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

    $(document).on('click', '.toggle-play', function(e){
      e.preventDefault();
      _this.togglePlay($(this));
    });
  };

  Player.prototype.queuePlay = function(url){
    if (url === this.currentUrl && this.playing) {
      this.sound.play();
    }
  };

  Player.prototype.stop = function(updateLink){
    if (this.playing && this.sound) {
      this.sound.stop();
      this.playing = false;

      if (updateLink && this.$link) {
        var $link = this.$link;
        var playText = this.playText || 'Play';
        $link.removeClass('playing');
        $link.text(playText);
      }
    }
  };

  Player.prototype.togglePlay = function($link){
    var _this = this;
    this.$link = $link;
    var url = $link.attr('href');
    $link.toggleClass('playing');
    var playing = $link.hasClass('playing');
    this.playing = playing;

    var playText = this.playText || 'Play';

    if (this.playing) {
      this.playText = $link.text();
      $link.text('Stop');
    } else $link.text(playText);

    if (url !== this.currentUrl) {
      // reset previous sound
      if (this.sound !== false) {
        this.$currentLink.removeClass('playing');
        this.$currentLink.text(playText);
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
        $link.text(playText);
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
