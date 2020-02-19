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
      "onDataLoaded": function(){},
      "itemId": false,
      "itemStart": false
    };
    var globalConfig = typeof CONFIG !== 'undefined' ? CONFIG : {};
    var q = Util.queryParams();
    this.opt = _.extend({}, defaults, config, globalConfig, q);
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

    var trackPatterns = [
      [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
      [0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,1,0],
      [0,0,1,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
      [0,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0]
    ];

    var trackSamples = [];
    _.times(4, function(i){
      var sample = samples[sampleIndex];
      tracks[sample.id] = {
        "pattern": trackPatterns[i],
        "url": sample["url"],
        "title": _this.item.title + ' (' + sample.title + ')',
        "trackType": "collection",
        "gain": _this.opt.gain
      };
      trackSamples.push(sample);
      sampleIndex += 1;
      if (sampleIndex >= samples.length) sampleIndex = 0;
    });

    // manually uncheck pattern columns if previous beat is too long
    _.each(trackSamples, function(sample, i){
      var nearestSubdivisions = Math.floor(sample.dur / _this.subdivision);
      if (nearestSubdivisions > 3) {
        if (i===0) tracks[trackSamples[2].id].pattern[2] = 0;
        else if (i===1) tracks[trackSamples[3].id].pattern[6] = 0;
        else if (i===2) tracks[trackSamples[0].id].pattern[10] = 0;
        else tracks[trackSamples[1].id].pattern[14] = 0;
      }
    });

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

    this.$itemMeta = $('#item-meta');
    this.$itemAccess = $('#item-access');
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
      sampleObj.title = 'starting at ' + MathUtil.secondsToString(sampleObj.sourceStart/1000.0);
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
    var itemLists = metadata.lists;
    var items = _.map(metadata.items, function(item, index){
      var itemObj = _.object(itemHeadings, item);
      var itemKey = ''+itemObj[_this.opt.itemKey];
      itemObj.itemId = itemKey.split('.')[0];
      if (itemObj.year && itemObj.year !== '' && !itemObj.title.endsWith(')')) itemObj.title += ' ('+itemObj.year+')';
      itemObj.samples = _.has(sampleLookup, itemKey) ? _.sortBy(sampleLookup[itemKey], 'sourceStart') : [];
      itemObj.samples = _.map(itemObj.samples, function(s, j){
        s.index = j;
        return s;
      })
      if (metadata.groups) {
        _.each(metadata.groups, function(groupList, key){
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
      itemObj.phrases = _.uniq(_.pluck(itemObj.samples, 'phrase'));
      itemObj.phrases.sort();
      return itemObj;
    });

    items = _.filter(items, function(item){ return item.samples && item.samples.length > 1; });
    items = _.sortBy(items, 'title');
    this.items = items;

    var itemIndex = _.random(0, this.items.length-1);
    if (this.opt.itemId !== false) {
      var foundIndex = _.findIndex(items, function(item){ return (item.itemId === _this.opt.itemId); });
      if (foundIndex >= 0) itemIndex = foundIndex;
    }

    this.itemIndex = itemIndex;
    this.item = this.items[this.itemIndex];

    var sampleIndex = _.random(0, this.item.samples.length-1);
    if (this.opt.itemStart !== false) {
      var itemStart = parseInt(""+this.opt.itemStart);
      var foundSampleIndex = _.findIndex(this.item.samples, function(s){ return (s.sourceStart <= itemStart && itemStart < (s.sourceStart + s.dur)); });
      // console.log(foundSampleIndex)
      if (foundSampleIndex >= 0) sampleIndex = foundSampleIndex;
    }
    this.sampleIndex = sampleIndex;

    // console.log(this.item.phrases)
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

  Collections.prototype.reloadFromUrl = function(){
    var q = Util.queryParams();
    var changed = false;

    if (q.itemId !== undefined) {
      var foundIndex = _.findIndex(this.items, function(item){ return (item.itemId === q.itemId); });
      if (foundIndex >= 0) {
        this.itemIndex = foundIndex;
        this.item = this.items[this.itemIndex];
        this.$itemSelect.val(""+foundIndex);
        changed = true;
      }
    }

    if (q.itemStart !== undefined) {
      var itemStart = parseInt(""+q.itemStart);
      var foundSampleIndex = _.findIndex(this.item.samples, function(s){ return (s.sourceStart <= itemStart && itemStart < (s.sourceStart + s.dur)); });
      if (foundSampleIndex >= 0) {
        this.sampleIndex = foundSampleIndex;
        changed = true;
      } else if (changed) {
        this.sampleIndex = 0;
      }
    }

    if (!changed) return;

    this.loadTrackData();
    this.updateSource();
    // this.opt.onChange();
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
    html += '</div>';
    this.$itemMeta.html(html);
    html = '';
      html += '<dt>How can it be accessed?</dt>';
      html += '<dd>You find more details about this item as well as access and download the entire source media file on ' + item.provider + '. <a href="'+ item.url +'" class="button" target="_blank">Click here to view on ' + item.provider + '</a></dd>';
      if (item.embed_url && item.embed_url.length) {
        html += '<dd>You also access in the player embedded below. The sample you hear starts at <strong class="phrase-start-time">'+startTimeF+'</strong>):';
        var iframeHeight = item.hasVideo > 0 ? '480' : '280';
        html += '<iframe src="'+ item.embed_url +'" width="640" height="'+iframeHeight+'" frameborder="0" webkitallowfullscreen="true" mozallowfullscreen="true" allowfullscreen></iframe></dd>';
      } else {
        html += '<dd>The sample you hear starts at <strong class="phrase-start-time">'+startTimeF+'</strong></dd>';
      }
      html += '<dt>Samples used</dt>';
      html += '<dd>The following are the '+_.keys(this.tracks).length+' samples used in this sequence:</dd>';
      html += '<dd><ul>';
      _.each(this.tracks, function(track, id){
        html += '<li><a href="'+track.url+'" download>'+track.title+'</a> <a href="'+track.url+'" download><img src="../../img/icon_download.svg" alt="Download icon" title="Download this file" /></a> <a href="'+track.url+'" class="play-audio"><img src="../../img/icon_play.svg" alt="Play icon" title="Play this file" /></a></li>';
      });
      html += '</ul></dd>';
    html += '</div>';
    this.$itemAccess.html(html);

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

  Collections.prototype.toJSON = function(){
    return {
      "itemId": this.item.itemId,
      "itemStart": this.item.samples[this.sampleIndex].sourceStart
    }
  };

  Collections.prototype.updateSource = function(){
    var startTime = this.item.samples[this.sampleIndex].sourceStart;
    var startTimeF = MathUtil.secondsToString(startTime/1000.0);
    this.$el.find('.phrase-start-time').text(startTimeF);
  };

  return Collections;

})();
