'use strict';

var ExploreApp = (function() {

  function ExploreApp(config) {
    var defaults = {
      "uid": "loc_john-and-ruby-lomax",
      "baseUrl": "",
      "audioDir": "/audio/sprites/",
      "dataDir": "/data/spritedata/",
      "imageDir": "/img/sprites/"
    };
    var globalConfig = typeof CONFIG !== 'undefined' ? CONFIG : {};
    var q = queryParams();
    this.opt = _.extend({}, defaults, config, globalConfig, q);
    this.init();
  }

  function distance(x1, y1, x2, y2){
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function queryParams(){
    if (location.search.length) {
      var search = location.search.substring(1);
      return JSON.parse('{"' + search.replace(/&/g, '","').replace(/=/g,'":"') + '"}', function(key, value) { return key===""?value:decodeURIComponent(value) });
    }
    return {};
  }

  ExploreApp.prototype.init = function(){
    var _this = this;

    this.currentCell = -1;
    this.currentFileIndex = -1;

    var dataPromise = this.loadData();
    $.when(dataPromise).done(function(results){
      var audioPromise = _this.loadAudio(results);
      _this.loadUI(results);
      $.when(audioPromise).done(function(){
        _this.onReady();
      });
    });
  };

  ExploreApp.prototype.loadAudio = function(options){
    var deferred = $.Deferred();
    var opt = this.opt;

    var uid = this.opt.uid;
    var sounds = [];
    var spritePromises = [];
    var cols = options.cols;

    var allSprites = _.map(options.sprites, function(s, i){
      return {
        "id": i,
        "fileIndex": s[0],
        "audioPosition": [s[1], s[2]],
        "nx": s[3],
        "ny": s[4],
        "label": s[5]
      }
    });
    this.sprites = allSprites;
    this.audioSpriteFiles = options.audioSpriteFiles;

    _.each(options.audioSpriteFiles, function(fn, i){
      var audioFilename = opt.baseUrl + opt.audioDir + uid + "/" + fn;
      var sprites = _.filter(allSprites, function(s){ return s.fileIndex===i; });
      sprites = _.map(sprites, function(s, i){ return [""+s.id, s.audioPosition]; });
      sprites = _.object(sprites);
      var promise = $.Deferred();
      var sound = new Howl({
        src: [audioFilename],
        sprite: sprites,
        onload: function(){
          console.log("Loaded "+audioFilename);
          promise.resolve();
        }
      });
      spritePromises.push(promise);
      sounds.push(sound);
    });
    this.sounds = sounds;
    $.when.apply(null, spritePromises).done(function() {
      deferred.resolve();
    });

    return deferred.promise();
  };

  ExploreApp.prototype.loadData = function(){
    var _this = this;
    var uid = this.opt.uid;
    var url = this.opt.baseUrl + this.opt.dataDir + uid + ".json";
    var deferred = $.Deferred();
    $.getJSON(url, function(data) {
      console.log("Loaded data with "+data.sprites.length+" sprites")
      deferred.resolve(data);
    });
    return deferred.promise();
  };

  ExploreApp.prototype.loadListeners = function(){
    var _this = this;

    $(window).on("resize", function(){ _this.onResize(); });

    var listening = false;
    $(document).on("mousedown", function(e){ e.preventDefault(); listening = true; });
    $(document).on("mouseup", function(e){ listening = false; });
    $(document).on("mousemove", function(e){ if (listening) { _this.play(e); } });

    $(document).on("click", function(e){ _this.play(e, true); })
  };

  ExploreApp.prototype.loadUI = function(options){
    this.imageW = options.width;
    this.imageH = options.height;
    this.cellNW = options.cellW / options.width;
    this.cellNH = options.cellH / options.height;

    var imageUrl = this.opt.baseUrl + this.opt.imageDir + options.image;

    this.$image = $('<img src="'+imageUrl+'" alt="Matrix of scenes from video" />');
    this.$imageWrapper = $('#image');
    this.$imageWrapper.width(this.imageW);
    this.$imageWrapper.height(this.imageH);
    this.$imageWrapper.prepend(this.$image);

    this.$label = $("#label");
    this.$label.css({
      "width": (this.cellNW * 100) + "%",
      "height": (this.cellNH * 100) + "%"
    });

    this.onResize();
  };

  ExploreApp.prototype.onReady = function(){
    console.log("Ready.");

    this.loadListeners();
  };

  ExploreApp.prototype.onResize = function(){
    var _this = this;

    this.width = this.$imageWrapper.width();
    this.height = this.$imageWrapper.height();
    this.imageRW = this.width;
    this.imageRH = this.height;
    this.imageOffset = this.$imageWrapper.offset();

    var cellNW = this.cellNW;
    var cellNH = this.cellNH;
    _.each(this.sprites, function(s, i){
      _this.sprites[i]["cx"] = (s["nx"] + cellNW * 0.5) * _this.imageRW;
      _this.sprites[i]["cy"] = (s["ny"] + cellNH * 0.5) * _this.imageRH;
      _this.sprites[i]["x"] = s["nx"] * _this.imageRW;
      _this.sprites[i]["y"] = s["ny"] * _this.imageRH;
    });
  };

  ExploreApp.prototype.play = function(e, forcePlay){
    var _this = this;
    var parentOffset = this.imageOffset;
    var x = e.pageX - parentOffset.left;
    var y = e.pageY - parentOffset.top;
    var imgW = this.imageRW;
    var imgH = this.imageRH;

    // check for out of bounds
    if (x < 0 || y < 0 || x >= imgW || y >= imgH) return;

    var sorted = _.sortBy(this.sprites, function(s){ return distance(s.cx, s.cy, x, y); });
    var first = sorted[0];
    var id = first.id;
    var cx = first.x;
    var cy = first.y;

    this.$label.css("transform", "translate3d("+cx+"px, "+cy+"px, 0)");

    // update cell
    if (this.currentCell !== id) {
      this.$label.attr("title", first.label);
      this.currentCell = id;
      // play sound
      this.sounds[first.fileIndex].play(""+id);
    } else if (forcePlay) {
      // play sound
      this.sounds[first.fileIndex].play(""+id);
    }
  };

  return ExploreApp;

})();

$(function() {
  var app = new ExploreApp({});
});
