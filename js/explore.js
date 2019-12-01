'use strict';

var ExploreApp = (function() {

  function ExploreApp(config) {
    var defaults = {
      "uid": "loc-john-and-ruby-lomax",
      "baseUrl": "",
      "audioDir": "/audio/sprites/",
      "dataDir": "/data/spritedata/",
      "metadataDir": "/data/metadata/",
      "imageDir": "/img/sprites/",
      "itemKey": "filename",
      "maxPxPerFrame": 3
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
    this.firstPlay = true;
    this.itemLookup = false;
    this.listening = false;
    this.pointerX = 0;
    this.pointerY = 0;

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
        "label": s[3]
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

    var metadataUrl = this.opt.baseUrl + this.opt.metadataDir + uid + ".json";
    $.getJSON(metadataUrl, function(data) {
      console.log("Loaded metadata with "+data.items.length+" items")
      _this.onMetadataLoaded(data);
    });

    return deferred.promise();
  };

  ExploreApp.prototype.loadListeners = function(){
    var _this = this;

    $(window).on("resize", function(){ _this.onResize(); });

    this.listening = false;
    var touching = false;
    var $touch = $('#touch');
    var touchHandler = new Hammer($touch[0]);
    touchHandler.get('pinch').set({ enable: true });
    touchHandler.add( new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 0 }) );

    // listen to events...
    touchHandler.on("panstart panmove panend pinchin pinchout tap", function(e) {
      touching = true;
      if (e.type === 'panstart') {
        _this.listening = true;
      } else if (e.type === 'panend') {
        _this.listening = false;
      } else if (e.type === 'panmove') {
        _this.pointerX = e.center.x;
        _this.pointerY = e.center.y;
      } else if (e.type === 'tap') {
        _this.play(e.center.x, e.center.y, true);
      }
    });

    var $doc = $(document);
    $doc.on("mousedown", function(e){
      if (touching) return;
      e.preventDefault();
      _this.listening = true;
    });
    $doc.on("mouseup", function(e){
      if (touching) return;
      _this.listening = false;
    });
    $doc.on("mousemove", function(e){
      if (touching) return;
      if (_this.listening) {
        _this.pointerX = e.pageX;
        _this.pointerY = e.pageY;
      }
    });
    $doc.on("click", function(e){
      if (touching) return;
      _this.play(e.pageX, e.pageY, true);
    });
  };

  ExploreApp.prototype.loadUI = function(options){
    var _this = this;
    this.imageW = options.width;
    this.imageH = options.height;
    this.cellW = options.cellW;
    this.cellH = options.cellH;
    this.cols = Math.floor(options.width / options.cellW);
    this.rows = Math.floor(options.height / options.cellH);

    var imageUrl = this.opt.baseUrl + this.opt.imageDir + options.image;

    this.$image = $('<img src="'+imageUrl+'" alt="Matrix of audio clips that show their spectrograms" />');
    this.$imageWrapper = $('#image');
    this.$imageWrapper.width(this.imageW);
    this.$imageWrapper.height(this.imageH);
    this.$imageWrapper.prepend(this.$image);

    this.$label = $("#label");
    this.$label.css({
      "width": this.cellW + "px",
      "height": this.cellH + "px"
    });

    this.$itemInfo = $('#item-info');
    var imageOffset = this.$imageWrapper.offset();
    this.offsetX = imageOffset.left;
    this.offsetY = imageOffset.top;

    this.scale = 1;
    this.scaledW = this.imageW;
    this.scaledH = this.imageH;
    this.translateX = 0;
    this.translateY = 0;

    this.$wrapper = $('#app');
    this.onResize();
  };

  ExploreApp.prototype.move = function(evx, evy){
    var _this = this;

    var x = evx - this.offsetX; // the position within the parent
    var y = evy - this.offsetY;

    // position within app window
    var nwx = x / this.wrapperW;
    var nwy = y / this.wrapperH;
    nwx = MathUtil.clamp(nwx, 0, 1);
    nwy = MathUtil.clamp(nwy, 0, 1);

    var ntx = MathUtil.lerp(1, -1, MathUtil.ease(nwx));
    var nty = MathUtil.lerp(1, -1, MathUtil.ease(nwy));
    var translateX = this.opt.maxPxPerFrame * ntx;
    var translateY = this.opt.maxPxPerFrame * nty;

    this.translateX = MathUtil.clamp(this.translateX + translateX, this.minTranslateX, this.maxTranslateX);
    this.translateY = MathUtil.clamp(this.translateY + translateY, this.minTranslateY, this.maxTranslateY);
    this.$imageWrapper.css('transform', 'translate3d('+this.translateX+'px, '+this.translateY+'px, 0) scale3d('+this.scale+', '+this.scale+', '+this.scale+')');
  };

  ExploreApp.prototype.onMetadataLoaded = function(metadata){
    var _this = this;
    var itemHeadings = metadata.itemHeadings;
    var items = _.map(metadata.items, function(item){
      var itemObj = _.object(itemHeadings, item);
      var itemKey = ''+itemObj[_this.opt.itemKey];
      if (itemObj.year !== '' && !itemObj.title.endsWith(')')) itemObj.title += ' ('+itemObj.year+')';
      if (metadata.groups) {
        _.each(metadata.groups, function(groupList, key){
          itemObj[key] = groupList[itemObj[key]];
        });
      }
      if (!_.has(itemObj, 'provider')) itemObj.provider = 'the Internet Archive';
      if (!_.has(itemObj, 'contributors')) itemObj.contributors = itemObj.creator;
      // itemObj.contributors = itemObj.contributors.split(" | ");
      return [itemKey, itemObj];
    });
    this.itemLookup = _.object(items);
  };

  ExploreApp.prototype.onReady = function(){
    console.log("Ready.");

    this.loadListeners();
    this.render();
  };

  ExploreApp.prototype.onResize = function(){
    this.wrapperW = this.$wrapper.width();
    this.wrapperH = this.$wrapper.height();
    this.minTranslateX = 0;
    this.minTranslateY = 0;
    this.maxTranslateX = 0;
    this.maxTranslateY = 0;

    if (this.imageW > this.wrapperW) this.minTranslateX = -(this.imageW - this.wrapperW);
    if (this.imageH > this.wrapperH) this.minTranslateY = -(this.imageH - this.wrapperH);

    this.translateX = MathUtil.clamp(this.translateX, this.minTranslateX, this.maxTranslateX);
    this.translateY = MathUtil.clamp(this.translateY, this.minTranslateY, this.maxTranslateY);
  };

  ExploreApp.prototype.play = function(evx, evy, forcePlay){
    var _this = this;
    var offsetX = this.offsetX + this.translateX;
    var offsetY = this.offsetY + this.translateY;
    var imgW = this.scaledW;
    var imgH = this.scaledH;

    var x = evx - offsetX; // the position within the parent
    var y = evy - offsetY;
    x = MathUtil.clamp(x, 0, imgW-1);
    y = MathUtil.clamp(y, 0, imgH-1);
    var nx = x / imgW;
    var ny = y / imgH;

    var col = Math.floor(nx * this.cols);
    var row = Math.floor(ny * this.rows);
    var cx = this.cellW * col;
    var cy = this.cellH * row;
    this.$label.css("transform", "translate3d("+cx+"px, "+cy+"px, 0)");

    var spriteIndex = row * this.cols + col;
    var sprite = this.sprites[spriteIndex];
    var id = sprite.id;

    if (this.firstPlay) {
      this.firstPlay = false;
      Howler.ctx.resume();
    }

    // update cell
    if (this.currentCell !== id) {
      // this.$label.attr("title", first.label);
      this.currentCell = id;
      // play sound
      this.sounds[sprite.fileIndex].play(""+id);
      this.renderItem(sprite);
    } else if (forcePlay) {
      // play sound
      this.sounds[sprite.fileIndex].play(""+id);
    }
  };

  ExploreApp.prototype.render = function(){
    var _this = this;

    if (this.listening) {
      this.move(this.pointerX, this.pointerY);
      this.play(this.pointerX, this.pointerY);
    }

    requestAnimationFrame(function(){ _this.render(); });
  };

  ExploreApp.prototype.renderItem = function(spriteItem){
    if (this.itemLookup === false || this.$itemInfo === undefined || !this.$itemInfo.length) return;
    var id = spriteItem.label;
    // console.log(this.itemLookup, id)
    var startTimeF = MathUtil.secondsToString(spriteItem.audioPosition[0]/1000.0);
    var html = '';
    if (_.has(this.itemLookup, id)) {
      var item = this.itemLookup[id];
      html += '<div class="item-details">';
        html += '<h2>' + item.title + ' at '+startTimeF+'</h2>';
        if (item.contributors.length)
          html += '<p>' + item.contributors + '</p>';
      html += '</div>';
      html += '<a href="'+item.url+'" target="_blank" class="button inverted">View on '+item.provider+'</a>';
    }
    this.$itemInfo.html(html);
  };

  return ExploreApp;

})();

$(function() {
  var app = new ExploreApp({});
});