'use strict';

var ExploreApp = (function() {

  function ExploreApp(config) {
    var defaults = {
      "uid": "loc-john-and-ruby-lomax",
      "baseUrl": "",
      "assetUrl": "",
      "audioDir": "/audio/sprites/",
      "dataDir": "/data/spritedata/",
      "metadataDir": "/data/metadata/",
      "phraseDir": "/data/phrasedata/",
      "phraseAudioDir": "/audio/samplepacks/",
      "imageDir": "/img/sprites/",
      "itemKey": "filename",
      "maxPxPerFrame": 3,
      "scaleStep": 0.05,
      "minScale": 0.333,
      "localItems": ""
    };
    var globalConfig = typeof CONFIG !== 'undefined' ? CONFIG : {};
    var q = Util.queryParams();
    this.opt = _.extend({}, defaults, config, globalConfig, q);
    this.init();
  }

  ExploreApp.prototype.init = function(){
    var _this = this;

    this.currentCell = -1;
    this.currentFileIndex = -1;
    this.firstPlay = true;
    this.itemLookup = false;
    this.listening = false;
    this.anchorX = false;
    this.anchorY = false;
    this.pointerX = 0;
    this.pointerY = 0;
    this.localItems = this.opt.localItems && this.opt.localItems.length;
    this.$loadingPercent = $('#loading-percent');

    var dataPromise = this.loadData();
    $.when(dataPromise).done(function(){
      var audioPromise = _this.loadAudio();
      _this.loadUI();
      $.when(audioPromise).done(function(){
        _this.onReady();
      });
    });
  };

  ExploreApp.prototype.clearFilters = function(){
    this.filters = {
      'pitch': [this.minPitch, this.maxPitch],
      'subjectIndex': -1,
      'noteIndex': -1
    };

    this.$selectSubject.val(this.filters.subjectIndex);
    this.$selectNote.val(this.filters.noteIndex);
    this.$rangePitchMin.val(this.filters.pitch[0]);
    this.$rangePitchMinText.text(this.filters.pitch[0]);
    this.$rangePitchMax.val(this.filters.pitch[1]);
    this.$rangePitchMaxText.text(this.filters.pitch[1]);
  };

  ExploreApp.prototype.loadAudio = function(options){
    var deferred = $.Deferred();
    var _this = this;
    var opt = this.opt;
    var uid = this.opt.uid;
    var allSprites = this.sprites
    var sounds = [];
    var spritePromises = [];

    // for showing load progress
    var loadTotal = this.audioSpriteFiles.length + 1;
    var loaded = 1;
    this.$loadingPercent.text(Math.round((loaded / loadTotal) * 100));

    _.each(this.audioSpriteFiles, function(fn, i){
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
          loaded++;
          var percentLoaded = Math.round((loaded / loadTotal) * 100);
          _this.$loadingPercent.text(percentLoaded);
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
    var metadataUrl = this.opt.baseUrl + this.opt.metadataDir + uid + ".json";
    var phrasesUrl = this.opt.baseUrl + this.opt.phraseDir + uid + ".json";
    var deferred = $.Deferred();

    $.when(
      $.getJSON(url),
      $.getJSON(metadataUrl),
      $.getJSON(phrasesUrl)

    ).done(function(spritedata, metadata, phrasedata){
      spritedata = spritedata[0];
      metadata = metadata[0];
      phrasedata = phrasedata[0];

      console.log("Loaded metadata with "+metadata.items.length+" items")
      _this.onMetadataLoaded(metadata);

      console.log("Loaded data with "+spritedata.sprites.length+" sprites");
      _this.onSpritedataLoaded(spritedata);

      console.log("Loaded phrases with "+phrasedata.items.length+" phrases");
      _this.onPhrasedataLoaded(phrasedata);

      deferred.resolve();
    });

    return deferred.promise();
  };

  ExploreApp.prototype.loadFilters = function(data){
    var _this = this;
    var $filters = $('#filters');
    $('.toggle-filters').on('click', function(e){
      $filters.toggleClass('active');
    });

    if (this.subjects.length <= 0) {
      $('#select-subject').css('display', 'none');
      $('label[for="select-subject"]').css('display', 'none');
    } else {
      var subjectHTML = _.map(this.subjects, function(subject, i){ return '<option value="'+i+'">'+subject+'</option>'; });
      subjectHTML = '<option value="-1">all</option>' + subjectHTML.join('');
      $('#select-subject').html(subjectHTML);
    }

    var notesHTML = _.map(this.notes, function(note, i){ return '<option value="'+i+'">'+note+'</option>'; });
    notesHTML = '<option value="-1">all</option>' + notesHTML.join('');
    $('#select-note').html(notesHTML);

    $('#range-pitch-min').attr({ 'min': this.minPitch, 'max': this.maxPitch, 'value': this.minPitch })
    $('#range-pitch-min-text').text(this.minPitch);
    $('#range-pitch-max').attr({ 'min': this.minPitch, 'max': this.maxPitch, 'value': this.maxPitch })
    $('#range-pitch-max-text').text(this.maxPitch);

    this.$selectSubject = $('#select-subject');
    this.$selectNote = $('#select-note');
    this.$rangePitchMin = $('#range-pitch-min');
    this.$rangePitchMinText = $('#range-pitch-min-text');
    this.$rangePitchMax = $('#range-pitch-max');
    this.$rangePitchMaxText = $('#range-pitch-max-text');
    this.clearFilters();

    $('.filter-select').on('change', function(e){ _this.onFilter(); });
    $('.slider').on('input', function(e){ _this.onFilter(); });
    $('.clear-filters').on('click', function(e){
      _this.clearFilters();
      _this.onFilter();
    });

    var $canvas = $('#filter-canvas');
    var canvas = $canvas[0];
    canvas.width = this.cols;
    canvas.height = this.rows;
    this.filterCtx = canvas.getContext('2d');
    this.filterImData = this.filterCtx.createImageData(this.cols, this.rows);
    this.filterData = this.filterImData.data;
  };

  ExploreApp.prototype.loadListeners = function(){
    var _this = this;

    $(window).on("resize", function(){ _this.onResize(); });

    this.listening = false;
    var started = false;
    var touching = false;
    var $touch = $('#touch');
    var touchHandler = new Hammer($touch[0]);
    touchHandler.get('pinch').set({ enable: true });
    touchHandler.add( new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 0 }) );

    $touch.one('mousedown touchstart', function(){
      $('#instructions').css('display', 'none');
      $('.item-info').css('display', 'block');
      started = true;
    });

    // listen for touch events...
    touchHandler.on("panstart panmove panend pinchin pinchout tap", function(e) {
      touching = true;
      if (e.type === 'panstart') {
        _this.listening = true;
      } else if (e.type === 'panend') {
        _this.listening = false;
      } else if (e.type === 'panmove') {
        _this.listening = true;
        _this.pointerX = e.center.x;
        _this.pointerY = e.center.y;
      } else if (e.type === 'tap') {
        _this.play(e.center.x, e.center.y, true);
      } else if (e.type === 'pinchin') {
        _this.onScale(-1, e.center.x, e.center.y);
      } else if (e.type === 'pinchout') {
        _this.onScale(1, e.center.x, e.center.y);
      }
    });

    // listen for mouse events
    // var $doc = $(document);
    // var mousedown = false;
    // $doc.on("mousedown", function(e){
    //   if (touching || !started) return;
    //   e.preventDefault();
    //   mousedown = true;
    //   // _this.listening = true;
    // });
    // $doc.on("mouseup", function(e){
    //   if (touching || !started) return;
    //   mousedown = false;
    //   _this.listening = false;
    // });
    // $doc.on("mousemove", function(e){
    //   if (touching || !started) return;
    //   this.anchorX = e.pageX;
    //   this.anchorY = e.pageY;
    //   if (mousedown) _this.listening = true;
    //   if (_this.listening) {
    //     _this.pointerX = e.pageX;
    //     _this.pointerY = e.pageY;
    //   }
    // });
    // $doc.on("click", function(e){
    //   if (touching || !started) return;
    //   _this.play(e.pageX, e.pageY, true);
    // });

    // listen to mousewheel
    $(window).on('wheel', function(e){
      var direction = e.originalEvent.deltaY < 0 ? 1 : -1;
      // console.log(e.originalEvent.deltaY)
      _this.onScale(direction, e.pageX, e.pageY);
    });
  };

  ExploreApp.prototype.loadUI = function(){
    var _this = this;
    var options = this.spritedata;
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

    this.$wrapper = $('#app');
    this.wrapperW = this.$wrapper.width();
    this.wrapperH = this.$wrapper.height();
    this.pointerX = this.wrapperW * 0.5;
    this.pointerY = this.wrapperH * 0.5;
    // start centered
    this.scale = 1;
    this.scaledW = this.imageW;
    this.scaledH = this.imageH;
    this.translateX = (this.imageW - this.wrapperW) * -0.5;
    this.translateY = (this.imageH - this.wrapperH) * -0.5;
    this.$imageWrapper.css('transform', 'translate3d('+this.translateX+'px, '+this.translateY+'px, 0) scale3d('+this.scale+', '+this.scale+', '+this.scale+')');

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

  ExploreApp.prototype.onFilter = function(){
    var hasSubjects = this.subjects.length > 0;
    var subjectIndex = hasSubjects ? parseInt(this.$selectSubject.val()) : -1;
    var noteIndex = parseInt(this.$selectNote.val());
    var minPitch = parseFloat(this.$rangePitchMin.val());
    var maxPitch = parseFloat(this.$rangePitchMax.val());

    // set filters
    this.filters.subjectIndex = subjectIndex;
    this.filters.noteIndex = noteIndex;

    // min pitch changed
    if (minPitch !== this.filters.pitch[0]) {
      if (minPitch > this.filters.pitch[1]) {
        minPitch = this.filters.pitch[1];
        this.$rangePitchMin.val(minPitch);
      }
      this.filters.pitch[0] = minPitch;
      this.$rangePitchMinText.text(minPitch);
    }

    // max pitch changed
    if (maxPitch !== this.filters.pitch[1]) {
      if (maxPitch < this.filters.pitch[0]) {
        maxPitch = this.filters.pitch[0];
        this.$rangePitchMax.val(maxPitch);
      }
      this.filters.pitch[1] = maxPitch;
      this.$rangePitchMaxText.text(maxPitch);
    }

    this.setFilters(this.filters);
  };

  ExploreApp.prototype.onMetadataLoaded = function(metadata){
    var _this = this;
    var itemHeadings = metadata.itemHeadings;
    var itemLists = metadata.lists;
    var items = _.map(metadata.items, function(item){
      var itemObj = _.object(itemHeadings, item);
      var itemKey = ''+itemObj[_this.opt.itemKey];
      itemObj.itemId = itemKey.split('.')[0];
      if (itemObj.year && itemObj.year !== '' && !itemObj.title.endsWith(')')) itemObj.title += ' ('+itemObj.year+')';
      if (metadata.groups) {
        _.each(metadata.groups, function(groupList, key){
          itemObj[key+'Index'] = itemObj[key];
          // this is a list
          if (_.indexOf(itemLists, key) >= 0) {
            itemObj[key] = _.map(itemObj[key], function(groupIndex){ return groupList[groupIndex]; });
          } else {
            itemObj[key] = groupList[itemObj[key]];
          }
        });
      }
      if (!_.has(itemObj, 'provider')) itemObj.provider = _this.opt.provider;
      if (!_.has(itemObj, 'contributors')) itemObj.contributors = [itemObj.creator];
      itemObj.contributors = itemObj.contributors.join(" | ");
      return [itemKey, itemObj];
    });
    this.subjects = [];
    if (_.has(metadata.groups, 'subjects')) {
      this.subjects = metadata.groups.subjects;
    }
    this.itemLookup = _.object(items);
  };

  ExploreApp.prototype.onPhrasedataLoaded = function(phrasedata){
    var _this = this;
    var itemHeadings = phrasedata.itemHeadings;
    var phrases = _.map(phrasedata.items, function(item){
      var itemObj = _.object(itemHeadings, item);
      if (phrasedata.groups) {
        _.each(phrasedata.groups, function(groupList, key){
          itemObj[key+'Index'] = itemObj[key];
          itemObj[key] = groupList[itemObj[key]];
        });
      }
      return itemObj;
    });

    var phraseAudioDir = this.opt.phraseAudioDir + this.opt.uid + '/';
    var assetUrl = this.opt.assetUrl;
    var itemLookup = this.itemLookup;
    _.each(this.sprites, function(sprite, i){
      var item = itemLookup[sprite.itemId];
      var itemPhrases = _.filter(phrases, function(p){ return p.itemFilename === item.filename;});
      if (itemPhrases.length < 1) return;

      itemPhrases = _.sortBy(itemPhrases, function(p){
        // get the closest phrase by start time
        var delta = sprite.sourceStart - p.start;
        if (delta < 0) delta = 999999;
        return delta;
      });
      var clipFilename = itemPhrases[0].clipFilename;
      _this.sprites[i].phraseFilename = phraseAudioDir + clipFilename;
      _this.sprites[i].phraseDownloadFilename = assetUrl + phraseAudioDir + clipFilename.slice(0, clipFilename.length-3) + "wav";
    });
  };

  ExploreApp.prototype.onReady = function(){
    console.log("Ready.");

    $('#instructions-text').text('Drag your cursor to browse sounds');

    this.player = new Player();

    this.loadListeners();
    this.loadFilters();
    this.render();
  };

  ExploreApp.prototype.onResize = function(){
    this.wrapperW = this.$wrapper.width();
    this.wrapperH = this.$wrapper.height();
    this.minTranslateX = 0;
    this.minTranslateY = 0;
    this.maxTranslateX = 0;
    this.maxTranslateY = 0;

    if (this.scaledW > this.wrapperW) this.minTranslateX = -(this.scaledW - this.wrapperW);
    if (this.scaledH > this.wrapperH) this.minTranslateY = -(this.scaledH - this.wrapperH);
    if (this.wrapperW > this.scaledW) { this.maxTranslateX = (this.wrapperW - this.scaledW) * 0.5; this.minTranslateX = this.maxTranslateX; }
    if (this.wrapperH > this.scaledH) { this.maxTranslateY = (this.wrapperH - this.scaledH) * 0.5; this.minTranslateY = this.maxTranslateY; }

    this.translateX = MathUtil.clamp(this.translateX, this.minTranslateX, this.maxTranslateX);
    this.translateY = MathUtil.clamp(this.translateY, this.minTranslateY, this.maxTranslateY);
  };

  ExploreApp.prototype.onScale = function(direction, evx, evy){
    var oldScale = this.scale;
    this.scale = oldScale + direction * this.opt.scaleStep;
    this.scale = MathUtil.clamp(this.scale, this.opt.minScale, 1);

    if (oldScale === this.scale) return;

    // determine where the anchor is within the image
    var offsetX = this.offsetX + this.translateX;
    var offsetY = this.offsetY + this.translateY;
    var x = evx - offsetX; // the position within the parent
    var y = evy - offsetY;
    var anchorX = MathUtil.clamp(x, 0, this.scaledW-1);
    var anchorY = MathUtil.clamp(y, 0, this.scaledH-1);

    this.scaledW = this.imageW * this.scale;
    this.scaledH = this.imageH * this.scale;
    this.translateX = MathUtil.scaleAroundAnchor(this.translateX, this.scale / oldScale, anchorX);
    this.translateY = MathUtil.scaleAroundAnchor(this.translateY, this.scale / oldScale, anchorY);
    this.translateX = MathUtil.clamp(this.translateX, this.minTranslateX, this.maxTranslateX);
    this.translateY = MathUtil.clamp(this.translateY, this.minTranslateY, this.maxTranslateY);

    this.onResize();

    this.$imageWrapper.css('transform', 'translate3d('+this.translateX+'px, '+this.translateY+'px, 0) scale3d('+this.scale+', '+this.scale+', '+this.scale+')');

  };

  ExploreApp.prototype.onSpritedataLoaded = function(spritedata){
    this.spritedata = spritedata;
    var cols = spritedata.cols;
    var filenames = spritedata.filenames;
    var notes = spritedata.notes;
    var itemLookup = this.itemLookup;
    var hasSubjects = this.subjects.length > 0;
    this.notes = notes;

    var allSprites = _.map(spritedata.sprites, function(s, i){
      var itemId = filenames[s[4]];
      var subjects = [];
      if (hasSubjects) {
        var item = itemLookup[itemId];
        subjects = item.subjectsIndex;
      }
      return {
        "id": i,
        "fileIndex": s[0],
        "sourceStart": s[2],
        "audioPosition": [s[1], s[3]],
        "itemId": itemId,
        "pitch": s[5],
        "note": notes[s[6]],
        "noteIndex": s[6],
        "subjects": subjects,
        "active": true,
        "phraseFilename": false,
        "phraseDownloadFilename": false
      }
    });
    this.minPitch = _.min(allSprites, function(sprite){ return sprite.pitch; }).pitch;
    this.maxPitch = _.max(allSprites, function(sprite){ return sprite.pitch; }).pitch;
    this.sprites = allSprites;
    this.audioSpriteFiles = spritedata.audioSpriteFiles;
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
      this.player && this.player.stop();
      // play sound
      if (sprite.active) this.sounds[sprite.fileIndex].play(""+id);
      this.renderItem(sprite);
    } else if (forcePlay) {
      this.player && this.player.stop();
      // play sound
      if (sprite.active) this.sounds[sprite.fileIndex].play(""+id);
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
    var id = spriteItem.itemId;
    var phraseFilename = spriteItem.phraseFilename;
    var phraseDownloadFilename = spriteItem.phraseDownloadFilename;
    // console.log(this.itemLookup, id)
    var startTimeF = MathUtil.secondsToString(spriteItem.sourceStart/1000.0);
    var html = '';
    if (_.has(this.itemLookup, id)) {
      var item = this.itemLookup[id];
      html += '<div class="item-details">';
        var title = item.title + ' starting at '+startTimeF;
        html += '<h2 title="'+title+'">' + title + '</h2>';
        if (item.contributors.length)
          html += '<p>' + item.contributors + '</p>';
        else
          html += '<p>&nbsp;</p>';
      html += '</div>';
      var remixUrl = this.opt.baseUrl + '/' + this.opt.uid + '/remix/?itemId=' + item.itemId + '&itemStart=' + spriteItem.sourceStart;
      var buttonText = this.localItems ? 'View more details' : 'View on '+item.provider;
      html += '<div class="item-buttons">';
        html += '<a href="'+remixUrl+'" class="button inverted">Remix this</a>';
        if (phraseFilename) {
          html += '<a href="'+phraseFilename+'" class="button inverted toggle-play">Play in context</a>';
        }
        if (phraseDownloadFilename) {
          html += '<a href="'+phraseDownloadFilename+'" class="button inverted" download target="_blank">Download</a>';
        }
        html += '<a href="'+item.url+'" target="_blank" class="button inverted">'+buttonText+'</a>';
      html += '</div>';
    }
    this.$itemInfo.html(html);
  };

  ExploreApp.prototype.setFilters = function(filters){
    var _this = this;
    var filterData = this.filterData;

    _.each(this.sprites, function(sprite, i){
      var a = 0;
      filterData[i*4] = 0;
      filterData[i*4+1] = 0;
      filterData[i*4+2] = 0;
      if (filters.subjectIndex >= 0 && sprite.subjects.indexOf(filters.subjectIndex) < 0) a = 255;
      if (filters.noteIndex >= 0 && sprite.noteIndex !== filters.noteIndex) a = 255;
      if (sprite.pitch < filters.pitch[0] || sprite.pitch > filters.pitch[1]) a = 255;
      filterData[i*4+3] = a;
      _this.sprites[i].active = (a <= 0);
    });

    this.filterCtx.putImageData(this.filterImData, 0, 0);
  };

  return ExploreApp;

})();

$(function() {
  var app = new ExploreApp({});
});
