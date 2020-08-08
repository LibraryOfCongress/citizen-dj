'use strict';

var Collections = (function() {

  function Collections(config) {
    var defaults = {
      "parent": "#sequencer",
      "el": "#collection-rack",
      "uid": "loc-john-and-ruby-lomax",
      "baseUrl": "",
      "metadataDir": "/data/metadata/",
      "sampledataDir": "/data/sampledata/",
      "audioDir": "/audio/collections/",
      "phraseDir": "/data/phrasedata/",
      "phraseAudioDir": "/audio/samplepacks/",
      "phraseImageDir": "/img/samplepacks/",
      "assetUrl": "",
      "sampleItemKey": "sourceFilename",
      "itemKey": "filename",
      "gain": -3,
      "beforeChange": function(){},
      "onChange": function(){},
      "onDataLoaded": function(){},
      "itemId": false,
      "itemStart": false,
      "localItems": ""
    };
    var globalConfig = typeof CONFIG !== 'undefined' ? CONFIG : {};
    var q = Util.queryParams();
    if (config.urlVarMap) {
      q = Util.mapVars(q, config.urlVarMap, true);
    }
    this.opt = _.extend({}, defaults, config, globalConfig, q);
    this.init();
  }

  Collections.prototype.init = function(){
    // subdivision in milliseconds
    this.beatMs = 1000;
    this.subdivision = this.beatMs / 16.0;
    this.maxSubdivisions = 4;
    this.minSubdivisions = 4;
    this.localItems = this.opt.localItems && this.opt.localItems.length;
    this.$parent = $(this.opt.parent);
    this.$el = $(this.opt.el);
  };

  Collections.prototype.load = function(){
    var _this = this;
    var deferred = $.Deferred();

    $.when(
      $.getJSON(this.opt.baseUrl + this.opt.metadataDir + this.opt.uid + '.json'),
      $.getJSON(this.opt.baseUrl + this.opt.sampledataDir + this.opt.uid + '.json'),
      $.getJSON(this.opt.baseUrl + this.opt.phraseDir + this.opt.uid + '.json')

    ).done(function(metadata, sampledata, phrasedata){
      metadata = metadata[0];
      sampledata = sampledata[0];
      phrasedata = phrasedata[0];

      console.log('Metadata, phrasedata, sample data loaded.');
      _this.onDataLoaded(metadata, sampledata, phrasedata);
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

    // $('.prev-item').on('click', function(e){
    //   _this.stepSample(-1);
    // });
    // $('.next-item').on('click', function(e){
    //   _this.stepSample(1);
    // });

    this.$el.on('click', '.prev-collection', function(e){
      _this.stepSample(-1);
    });
    this.$el.on('click', '.next-collection', function(e){
      _this.stepSample(1);
    });

    $(document).keypress(function(e) {
      if (e.which === 97) { // a
        e.preventDefault();
        _this.stepSample(-1);
      } else if (e.which === 100) { // d
        e.preventDefault();
        _this.stepSample(1);
      }
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
        "id": sample.id,
        "$parent": _this.$el,
        "pattern": trackPatterns[i],
        "url": sample.phraseFilename,
        // "downloadUrl": sample.downloadUrl,
        "title": _this.item.title,
        "sourceStart": sample.phraseStart,
        "phraseDownloadUrl": sample.phraseDownloadFilename,
        "clipStart": sample.phraseClipStart,
        "clipDur": sample.phraseClipDur,
        "clipImageUrl": sample.clipImageUrl,
        "trackType": "collection",
        "typeLabel": "Sample",
        "sequence": i+1,
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

    // load item select
    var $itemSelect = this.$parent.find(".select-item");
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

  Collections.prototype.onDataLoaded = function(metadata, sampledata, phrasedata){
    this.parseData(metadata, sampledata, phrasedata);
    this.loadTrackData();
    this.opt.onDataLoaded();
    this.loadUI();
    this.renderSource();
    this.loadListeners();
  };

  Collections.prototype.onItemChange = function(index){
    this.opt.beforeChange();
    this.itemIndex = index;
    this.item = this.items[this.itemIndex];
    this.sampleIndex = _.random(0, this.item.samples.length-1);
    this.loadTrackData();
    this.renderSource();
    this.opt.onChange();
  };

  Collections.prototype.parseData = function(metadata, sampledata, phrasedata){
    var _this = this;

    // parse phrases
    var phraseAudioDir = this.opt.phraseAudioDir + this.opt.uid + '/';
    var phraseImageDir = this.opt.phraseImageDir + this.opt.uid + '/';
    var phraseHeadings = phrasedata.itemHeadings;
    var phrases = _.map(phrasedata.items, function(item){
      var itemObj = _.object(phraseHeadings, item);
      if (phrasedata.groups) {
        _.each(phrasedata.groups, function(groupList, key){
          itemObj[key+'Index'] = itemObj[key];
          itemObj[key] = groupList[itemObj[key]];
        });
      }
      return itemObj;
    });

    // parse samples
    var sampleHeadings = sampledata.itemHeadings;
    var sampleCount = ""+sampledata.items.length;
    var padLength = sampleCount.length;
    var sampleItemKey = this.opt.sampleItemKey;
    var assetUrl = this.opt.assetUrl;
    var samples = _.map(sampledata.items, function(sample){
      var sampleObj = _.object(sampleHeadings, sample);
      // if (Number.isInteger(sampleObj.id)) sampleObj.id = MathUtil.pad(sampleObj.id, padLength);
      sampleObj.id = sampleObj.sourceFilename + '-' + sampleObj.sourceStart;
      sampleObj.title = 'starting at ' + MathUtil.secondsToString(sampleObj.sourceStart/1000.0, 3);
      // sampleObj.url = _this.opt.baseUrl + _this.opt.audioDir + _this.opt.uid + '/' + sampleObj.id + '.mp3';
      // sampleObj.downloadUrl = assetUrl + _this.opt.audioDir + _this.opt.uid + '/' + sampleObj.id + '.wav';
      if (sampledata.groups) {
        _.each(sampledata.groups, function(groupList, key){
          sampleObj[key] = groupList[sampleObj[key]];
        });
      }
      // find the right phrase
      sampleObj.phraseFilename = false;
      sampleObj.phraseDownloadFilename = false;
      var itemPhrases = _.filter(phrases, function(p){ return p.itemFilename === sampleObj[sampleItemKey];});
      if (itemPhrases.length > 1) {
        itemPhrases = _.sortBy(itemPhrases, function(p){
          // get the closest phrase by start time
          var delta = sampleObj.sourceStart - p.start;
          if (delta < 0) delta = 999999;
          return delta;
        });
      } else if (itemPhrases.length < 1) {
        console.log("Error: no phrases found for " + sampleObj.id);
        itemPhrases = phrases.slice(0);
      }
      // figure out where this clip is within the phrase audio file
      var phrase = itemPhrases[0];
      var clipFilename = phrase.clipFilename;
      sampleObj.phraseFilename = phraseAudioDir + clipFilename;
      sampleObj.phraseDownloadFilename = assetUrl + phraseAudioDir + clipFilename.slice(0, clipFilename.length-3) + "wav";
      sampleObj.clipImageUrl = phraseImageDir + clipFilename.slice(0, clipFilename.length-3) + "png";
      sampleObj.phraseStart = phrase.start / 1000.0;
      sampleObj.phraseClipStart = 0;
      sampleObj.phraseClipDur = sampleObj.dur / 1000.0;
      if (sampleObj.sourceStart > phrase.start) {
        sampleObj.phraseClipStart = (sampleObj.sourceStart - phrase.start) / 1000.0;
      }
      if (sampleObj.phraseClipStart + sampleObj.phraseClipDur > phrase.dur) {
        sampleObj.phraseClipDur = (phrase.dur - sampleObj.phraseClipStart) / 1000.0;
      }
      // console.log(sampleObj.phraseClipStart, sampleObj.phraseClipDur);
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
      itemObj.titleNoYear = itemObj.title;
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
    this.opt.beforeChange();
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
    this.renderSource();
    this.opt.onChange();
  };

  Collections.prototype.randomizePhraseSample = function(){
    this.opt.beforeChange();
    var sample = this.item.samples[this.sampleIndex];
    var sampleCandidates = _.where(this.item.samples, {phrase: sample.phrase});

    var newSample = _.sample(sampleCandidates);
    this.sampleIndex = newSample.index;
    this.loadTrackData();
    this.renderSource();
    this.opt.onChange();
  };

  Collections.prototype.randomizeSample = function(){
    this.opt.beforeChange();
    this.sampleIndex = _.random(this.item.samples.length-1);
    this.loadTrackData();
    this.renderSource();
    this.opt.onChange();
  };

  Collections.prototype.renderSource = function(){
    var item = this.item;
    var firstSample = this.item.samples[this.sampleIndex];
    var startTime = firstSample.sourceStart;
    var startTimeF = MathUtil.secondsToString(startTime/1000.0);
    var html = '';
    html += '<div class="source">';
      html += '<dt>Title</dt>';
      html += '<dd><a href="'+ item.url +'" target="_blank">'+ item.title +'</a></dd>';
      html += '<dt>Contributors</dt>';
      _.each(item.contributors, function(contributor) {
        html += '<dd>'+ contributor +'</dd>';
      });
      if (item.year && item.year !== '') {
        html += '<dt>Date created/published</dt>';
        html += '<dd>'+ item.year +'</dd>';
      }
    html += '</div>';
    this.$itemMeta.html(html);
    html = '';
      // access
      html += '<dt>How can it be accessed?</dt>';
      html += '<dd>There are a number of ways to access the source material:';
        html += '<ol>';
          html += '<li>You can download each clip individually (these samples start at <strong class="phrase-start-time">'+startTimeF+'</strong>):';
            html += '<ul id="track-list" class="track-list">';
            var number = 1;
            _.each(this.tracks, function(track, id){
              html += '<li><button class="download-track-audio small" data-id="'+id+'">Download sample '+number+'</button> <button class="play-track-audio small" data-id="'+id+'">Play sample '+number+'</button></li>';
              number++;
            });
            html += '</ul>';
          html += '</li>';
          if (firstSample.phraseFilename) {
            html += '<li>Or download a longer audio excerpt that the clips came from:';
              html += '<ul><li><a href="'+firstSample.phraseDownloadFilename+'" download class="button small" target="_blank">Download excerpt</a> <a href="'+firstSample.phraseFilename+'" class="play-audio button small">Play excerpt</a></li></ul>';
            html += '</li>';
          }
          html += '<li>You can visit this collection\'s <a href="'+this.opt.baseUrl+'/'+this.opt.uid+'/use/" class="button small">browse &amp; download page</a> for bulk downloads.</li>';
          if (!this.localItems) {
            html += '<li>You find and possibly download the full source audio on <a href="'+ item.url +'" class="button small" target="_blank">' + item.provider + '</a></li>';
          }
          // case: embeddable media
          if (item.embed_url && item.embed_url.length) {
            html += '<li>You also access in the player embedded below. The sample you hear starts at <strong class="phrase-start-time">'+startTimeF+'</strong>:';
            var iframeHeight = item.hasVideo > 0 ? '480' : '280';
            html += '<iframe src="'+ item.embed_url +'" width="640" height="'+iframeHeight+'" frameborder="0" webkitallowfullscreen="true" mozallowfullscreen="true" allowfullscreen></iframe></li>';
          // case: streaming media
          } else if (item.stream_url && item.stream_url.length) {
            html += '<li>You also access in the player embedded below. Or <a href="'+ item.stream_url +'" download class="button small">click here to download</a>. The sample you hear starts at <strong class="phrase-start-time">'+startTimeF+'</strong>:';
            var isVideo = item.stream_url.endsWith('.mp4');
            var assetBaseUrl = this.localItems ? this.opt.assetUrl : '';
            if (isVideo) {
              html += '<video src="'+ assetBaseUrl + item.stream_url +'" controls crossorigin="anonymous"></video></li>';
            } else {
              html += '<audio src="'+ assetBaseUrl + item.stream_url +'" controls crossorigin="anonymous"></audio></li>';
            }
          }
        html += '</ol>';
      html += '</dd>';
      // attribution
      html += '<dt>Giving attribution</dt>';
      html += '<dd>The following is an example of how to give attribution when reusing this material:</dd>';
      html += '<dd><blockquote>Contains samples of "' + item.titleNoYear + '" by ' +Util.listToString(item.contributors)+ '. Retrieved from ' + this.opt.credit + '</blockquote></dd>';
      html += '<dd>Note that this text was generated automatically from bibliographic data as a convenience, and may not be complete or accurate.</dd>';
    html += '</div>';
    this.$itemAccess.html(html);

  };

  // step through the phrases of the current item
  Collections.prototype.stepPhrase = function(amount){
    this.opt.beforeChange();
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
    this.renderSource();
    this.opt.onChange();
  };

  // step through the samples of the current phrase
  Collections.prototype.stepPhraseSample = function(amount){
    this.opt.beforeChange();
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
    this.renderSource();
    this.opt.onChange();
  };

  // step through the samples of the current item
  Collections.prototype.stepSample = function(amount){
    this.opt.beforeChange();
    var sample = this.item.samples[this.sampleIndex];
    var sampleCandidates = this.item.samples;

    var newIndex = this.sampleIndex + amount;
    newIndex = MathUtil.wrap(newIndex, 0, this.item.samples.length-1);

    this.sampleIndex = newIndex;
    this.loadTrackData();
    this.renderSource();
    this.opt.onChange();
  };

  Collections.prototype.toJSON = function(){
    var data = {
      "itemId": this.item.itemId,
      "itemStart": this.item.samples[this.sampleIndex].sourceStart
    };
    return data;
  };

  Collections.prototype.updateSource = function(){
    var startTime = this.item.samples[this.sampleIndex].sourceStart;
    var startTimeF = MathUtil.secondsToString(startTime/1000.0);
    this.$parent.find('.phrase-start-time').text(startTimeF);
  };

  return Collections;

})();
