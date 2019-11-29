'use strict';

var Collections = (function() {

  function Collections(config) {
    var defaults = {
      "el": "#sequencer",
      "uid": "loc-john-and-ruby-lomax",
      "baseUrl": "",
      "metadataDir": "/data/metadata/",
      "sampledataDir": "/data/sampledata/",
      "audioDir": "/audio/collections/",
      "sampleItemKey": "sourceFilename",
      "itemKey": "filename",
      "gain": -3,
      "onChange": function(){},
      "onDataLoaded": function(){}
    };
    var globalConfig = typeof CONFIG !== 'undefined' ? CONFIG : {};
    this.opt = _.extend({}, defaults, config, globalConfig);
    this.init();
  }

  Collections.prototype.init = function(){
    // subdivision in milliseconds
    this.beatMs = 1000;
    this.subdivision = this.beatMs / 16.0;
    this.maxSubdivisions = 4;
    this.minSubdivisions = 4;
  };

  Collections.prototype.load = function(){
    var _this = this;
    var deferred = $.Deferred();

    $.when(
      $.getJSON(this.opt.baseUrl + this.opt.metadataDir + this.opt.uid + '.json'),
      $.getJSON(this.opt.baseUrl + this.opt.sampledataDir + this.opt.uid + '.json')

    ).done(function(metadata, sampledata){
      metadata = metadata[0];
      sampledata = sampledata[0];

      console.log('Metadata and sample data loaded.');
      _this.onDataLoaded(metadata, sampledata);
      deferred.resolve();
    });

    return deferred;
  };

  Collections.prototype.loadListeners = function(){
    var _this = this;

    this.$itemSelect.on('change', function(e){
      _this.onItemChange(parseInt($(this).val()));
    });

    $('.randomize-collection').on('click', function(e){
      _this.randomizeItem();
    });

    // $('.randomize-phrase').on('click', function(e){
    //   _this.randomizePhraseItem();
    // });

    $('.randomize-item').on('click', function(e){
      _this.randomizeSample();
    });

    $('.prev-item').on('click', function(e){
      _this.stepSample(-1);
    });

    $('.next-item').on('click', function(e){
      _this.stepSample(1);
    });

    // $('.prev-phrase').on('click', function(e){
    //   _this.stepPhraseSample(-1);
    // });
    //
    // $('.next-phrase').on('click', function(e){
    //   _this.stepPhraseSample(1);
    // });
  };

  Collections.prototype.loadTrackData = function(){
    // console.log(this.sampleIndex);
    var _this = this;
    var tracks = {};
    var sampleIndex = this.sampleIndex;
    var samples = this.item.samples;
    var col = 0;
    while(col < 16) {
      var sample = samples[sampleIndex];
      var pattern = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      pattern[col] = 1;
      tracks[sample.id] = {
        "pattern": pattern,
        "url": sample["url"],
        "title": this.item.title + ' (' + sample.title + ')',
        "trackType": "collection",
        "gain": _this.opt.gain
      };
      var nearestSubdivisions = Math.floor(sample.dur / this.subdivision);
      nearestSubdivisions = MathUtil.clamp(nearestSubdivisions, this.minSubdivisions, this.maxSubdivisions);
      col += nearestSubdivisions;
      sampleIndex += 1;
      if (sampleIndex >= samples.length) sampleIndex = 0;
    }

    // console.log(tracks)
    this.tracks = tracks;

    var phraseCount = this.item.phrases.length;
    if (phraseCount > 1) $('.nav-group-collection-item').addClass('active');
    else $('.nav-group-collection-item').removeClass('active');
  };

  Collections.prototype.loadUI = function(){
    var _this = this;
    this.$el = $(this.opt.el);

    // load item select
    var $itemSelect = this.$el.find(".select-item");
    $itemSelect.empty();
    var html = '';
    _.each(this.items, function(item, index){
      var selected = '';
      if (index === _this.itemIndex) selected = ' selected';
      html += '<option value="'+index+'"'+selected+'>'+item.title+'</option>';
    });
    $itemSelect.html(html);
    this.$itemSelect = $itemSelect;

    this.$itemSource = $('#item-source');
  };

  Collections.prototype.onDataLoaded = function(metadata, sampledata){
    this.parseData(metadata, sampledata);
    this.loadTrackData();
    this.opt.onDataLoaded();
    this.loadUI();
    this.renderSource();
    this.loadListeners();
  };

  Collections.prototype.onItemChange = function(index){
    this.itemIndex = index;
    this.item = this.items[this.itemIndex];
    this.sampleIndex = _.random(0, this.item.samples.length-1);
    this.loadTrackData();
    this.renderSource();
    this.opt.onChange();
  };

  Collections.prototype.parseData = function(metadata, sampledata){
    // parse samples
    var _this = this;

    var sampleHeadings = sampledata.itemHeadings;
    var sampleCount = ""+sampledata.items.length;
    var padLength = sampleCount.length;
    var samples = _.map(sampledata.items, function(sample){
      var sampleObj = _.object(sampleHeadings, sample);
      if (Number.isInteger(sampleObj.id)) sampleObj.id = MathUtil.pad(sampleObj.id, padLength);
      sampleObj.title = MathUtil.secondsToString(sampleObj.sourceStart/1000.0);
      sampleObj.url = _this.opt.baseUrl + _this.opt.audioDir + _this.opt.uid + '/' + sampleObj.id + '.mp3';
      if (sampledata.groups) {
        _.each(sampledata.groups, function(groupList, key){
          sampleObj[key] = groupList[sampleObj[key]];
        });
      }
      return sampleObj;
    });
    // create a lookup table
    var sampleLookup = _.groupBy(samples, this.opt.sampleItemKey);

    // parse items
    var itemHeadings = metadata.itemHeadings;
    var items = _.map(metadata.items, function(item){
      var itemObj = _.object(itemHeadings, item);
      var itemKey = ''+itemObj[_this.opt.itemKey];
      if (itemObj.year !== '' && !itemObj.title.endsWith(')')) itemObj.title += ' ('+itemObj.year+')';
      itemObj.samples = _.has(sampleLookup, itemKey) ? _.sortBy(sampleLookup[itemKey], 'sourceStart') : [];
      itemObj.samples = _.map(itemObj.samples, function(s, j){
        s.index = j;
        return s;
      })
      if (metadata.groups) {
        _.each(metadata.groups, function(groupList, key){
          itemObj[key] = groupList[itemObj[key]];
        });
      }
      if (!_.has(itemObj, 'provider')) itemObj.provider = 'the Internet Archive';
      if (!_.has(itemObj, 'contributors')) itemObj.contributors = itemObj.creator;
      itemObj.contributors = itemObj.contributors.split(" | ");
      itemObj.phrases = _.uniq(_.pluck(itemObj.samples, 'phrase'));
      itemObj.phrases.sort();
      return itemObj;
    });

    items = _.filter(items, function(item){ return item.samples && item.samples.length > 1; });
    items = _.sortBy(items, 'title');
    this.items = items;
    this.itemIndex = _.random(0, this.items.length-1);
    this.item = this.items[this.itemIndex];
    // console.log(this.item.phrases)
    this.sampleIndex = _.random(0, this.item.samples.length-1);
    // console.log(this.item.samples)
  };

  Collections.prototype.randomizeItem = function(){
    var itemIndex = _.random(0, this.items.length-1);
    this.$itemSelect.val(""+itemIndex).trigger('change');
  };

  Collections.prototype.randomizePhrase = function(){
    var sample = this.item.samples[this.sampleIndex];
    var phrases = this.item.phrases;
    if (phrases.length <= 1) {
      console.log('Only one phrase available');
      return;
    }

    var phraseCandidates = _.without(phrases, sample.phrase);
    var newPhrase = _.sample(phraseCandidates);
    var sampleCandidates = _.where(this.item.samples, {phrase: newPhrase});
    if (sampleCandidates.length < 1) {
      console.log('No samples in this phrase '+newPhrase);
      return;
    }

    var newSample = _.sample(sampleCandidates);
    this.sampleIndex = newSample.index;
    this.loadTrackData();
    this.updateSource();
    this.opt.onChange();
  };

  Collections.prototype.randomizePhraseSample = function(){
    var sample = this.item.samples[this.sampleIndex];
    var sampleCandidates = _.where(this.item.samples, {phrase: sample.phrase});

    var newSample = _.sample(sampleCandidates);
    this.sampleIndex = newSample.index;
    this.loadTrackData();
    this.updateSource();
    this.opt.onChange();
  };

  Collections.prototype.randomizeSample = function(){
    this.sampleIndex = _.random(this.item.samples.length-1);
    this.loadTrackData();
    this.updateSource();
    this.opt.onChange();
  };

  Collections.prototype.renderSource = function(){
    var item = this.item;
    var startTime = this.item.samples[this.sampleIndex].sourceStart;
    var startTimeF = MathUtil.secondsToString(startTime/1000.0);
    var html = '';
    html += '<div class="source">';
      html += '<dt>Title</dt>';
      html += '<dd><a href="'+ item.url +'" target="_blank">'+ item.title +'</a></dd>';
      html += '<dt>Contributors</dt>';
      _.each(item.contributors, function(contributor) {
        html += '<dd>'+ contributor +'</dd>';
      });
      if (item.year !== '') {
        html += '<dt>Date created/published</dt>';
        html += '<dd>'+ item.year +'</dd>';
      }
      html += '<dt>How can it be used?</dt>';
      html += '<dd>This item is in the <a href="https://creativecommons.org/publicdomain/mark/1.0/" target="_blank">Public Domain</a> which means that is free of known copyright restrictions and therefore you are free to use this material without restriction. However, please also see this <a href="{{ site.baseurl }}/guide/">detailed guide</a> covering the copyright and ethical considerations of digital sampling of audio and video materials.</dd>';
      html += '<dt>How can it be accessed?</dt>';
      html += '<dd>You find more details about this item as well as access and download the entire source media file on ' + item.provider + '. <a href="'+ item.url +'" class="button" target="_blank">Click here to view on ' + item.provider + '</a></dd>';
      if (item.embed_url && item.embed_url.length) {
        html += '<dd>You also access in the player embedded below. The sample you hear starts at <strong class="phrase-start-time">'+startTimeF+'</strong>):';
        var iframeHeight = item.hasVideo > 0 ? '480' : '280';
        html += '<iframe src="'+ item.embed_url +'" width="640" height="'+iframeHeight+'" frameborder="0" webkitallowfullscreen="true" mozallowfullscreen="true" allowfullscreen></iframe></dd>';
      } else {
        html += '<dd>The sample you hear starts at <strong class="phrase-start-time">'+startTimeF+'</strong></dd>';
      }
    html += '</div>';
    this.$itemSource.html(html);
  };

  // step through the phrases of the current item
  Collections.prototype.stepPhrase = function(amount){
    var sample = this.item.samples[this.sampleIndex];
    var phrases = this.item.phrases;
    var phraseIndex = _.indexOf(phrases, sample.phrase);
    if (phraseIndex < 0) {
      console.log('Could not find phrase '+sample.phrase);
      return;
    }

    phraseIndex += amount;
    phraseIndex = MathUtil.wrap(phraseIndex, 0, phrases.length-1);
    var newPhrase = phrases[phraseIndex];
    var sampleCandidates = _.where(this.item.samples, {phrase: newPhrase});
    if (sampleCandidates.length < 1) {
      console.log('Could not find samples with phrase '+newPhrase);
      return;
    }

    var newSample = _.sample(sampleCandidates);
    this.sampleIndex = newSample.index;
    this.loadTrackData();
    this.updateSource();
    this.opt.onChange();
  };

  // step through the samples of the current phrase
  Collections.prototype.stepPhraseSample = function(amount){
    var sample = this.item.samples[this.sampleIndex];
    var sampleCandidates = _.where(this.item.samples, {phrase: sample.phrase});

    var indexInPhrase = _.findIndex(sampleCandidates, function(s){ return s.index===sample.index; });
    if (indexInPhrase < 0) {
      console.log('Could not find current sample');
      return;
    }
    indexInPhrase += amount;
    indexInPhrase = MathUtil.wrap(indexInPhrase, 0, sampleCandidates.length-1);

    var newSample = sampleCandidates[indexInPhrase];
    this.sampleIndex = newSample.index;
    this.loadTrackData();
    this.updateSource();
    this.opt.onChange();
  };

  // step through the samples of the current item
  Collections.prototype.stepSample = function(amount){
    var sample = this.item.samples[this.sampleIndex];
    var sampleCandidates = this.item.samples;

    var newIndex = this.sampleIndex + amount;
    newIndex = MathUtil.wrap(newIndex, 0, this.item.samples.length-1);

    this.sampleIndex = newIndex;
    this.loadTrackData();
    this.updateSource();
    this.opt.onChange();
  };

  Collections.prototype.updateSource = function(){
    var startTime = this.item.samples[this.sampleIndex].sourceStart;
    var startTimeF = MathUtil.secondsToString(startTime/1000.0);
    this.$el.find('.phrase-start-time').text(startTimeF);
  };

  return Collections;

})();
