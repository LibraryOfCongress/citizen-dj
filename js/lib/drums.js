'use strict';

var Drums = (function() {

  function Drums(config) {
    var defaults = {
      "el": "#sequencer",
      "baseUrl": "",
      "drumsFile": "/data/drum_machines.json",
      "patternsFile": "/data/drum_patterns.json",
      "audioDir": "/audio/drum_machines/",
      "gain": -9,
      "onChange": function(){},
      "onDataLoaded": function(){}
    };
    var globalConfig = typeof CONFIG !== 'undefined' ? CONFIG : {};
    this.opt = _.extend({}, defaults, config, globalConfig);
    this.init();
  }

  function selectInstrument(instruments, instrumentKey) {
    var finstruments = _.where(instruments, {instrument: instrumentKey});
    if (finstruments.length > 1) {
      finstruments = _.sortBy(finstruments, 'priority');
      return finstruments[0];
    } else if (finstruments.length > 0) return finstruments[0];
    else return false;
  };

  Drums.prototype.init = function(){

  };

  Drums.prototype.load = function(){
    var _this = this;
    var deferred = $.Deferred();

    $.when(
      $.getJSON(this.opt.baseUrl + this.opt.drumsFile),
      $.getJSON(this.opt.baseUrl + this.opt.patternsFile)

    ).done(function(drumData, patternData){
      drumData = drumData[0];
      patternData = patternData[0];

      console.log('Drum and pattern data loaded.');
      _this.onDataLoaded(drumData, patternData);
      deferred.resolve();
    });

    return deferred;
  };

  Drums.prototype.loadListeners = function(){
    var _this = this;

    this.$drumSelect.on('change', function(e){
      _this.onChangeDrum(parseInt($(this).val()));
    });

    this.$patternSelect.on('change', function(e){
      _this.onChangePattern(parseInt($(this).val()));
    });

    $('.randomize-drum').on('click', function(e){
      _this.randomize();
    });

    $('.prev-drum').on('click', function(e){
      _this.step(-1);
    });

    $('.next-drum').on('click', function(e){
      _this.step(1);
    });
  };

  Drums.prototype.loadTrackData = function(){
    var _this = this;
    var pattern = this.patterns[this.patternIndex];
    var drum = this.drums[this.drumIndex];

    var tracks = {};
    _.each(pattern.pattern, function(instruments, col){
      _.each(instruments, function(instrument){
        // instrument already exists, just add to pattern
        if (_.has(tracks, instrument)) {
          tracks[instrument].pattern[col] = 1;
        // otherwise init track
        } else {
          var bestInstrument = selectInstrument(drum.instruments, instrument);
          if (bestInstrument !== false) {
            var pattern = _.times(16, function(n){ return 0; });
            pattern[col] = 1;
            var url = _this.opt.baseUrl + _this.opt.audioDir + bestInstrument.filename;
            var title = _this.patternKey[bestInstrument.instrument] + " / " + drum.name;
            tracks[instrument] = {
              "pattern": pattern,
              "url": url,
              "title": title,
              "trackType": "drum",
              "gain": _this.opt.gain
            };
          }
        }
      });
    });
    // console.log(tracks)

    this.tracks = tracks;
  };

  Drums.prototype.loadUI = function(){
    var _this = this;
    this.$el = $(this.opt.el);

    // load drum select
    var $drumSelect = this.$el.find(".select-drum");
    $drumSelect.empty();
    var html = '';
    _.each(this.drums, function(drum, index){
      var selected = '';
      if (index === _this.drumIndex) selected = ' selected';
      html += '<option value="'+index+'"'+selected+'>'+drum.name+'</option>';
    });
    $drumSelect.html(html);
    this.$drumSelect = $drumSelect;

    // load pattern select
    var $patternSelect = this.$el.find(".select-pattern");
    $patternSelect.empty();
    html = '';
    _.each(this.patterns, function(pattern, index){
      var selected = '';
      if (index === _this.patternIndex) selected = ' selected';
      var name = pattern.artist + ' - ' + pattern.title + ' (' + pattern.year + ') [';
      if (!Number.isInteger(pattern.category)) name += pattern.category + " ";
      name += pattern.bar + ']';
      html += '<option value="'+index+'"'+selected+'>'+name+'</option>';
    });
    $patternSelect.html(html);
    this.$patternSelect = $patternSelect;
  };

  Drums.prototype.onChangeDrum = function(index){
    this.drumIndex = index;
    this.loadTrackData();
    this.opt.onChange();
  };

  Drums.prototype.onChangePattern = function(index){
    this.patternIndex = index;
    this.loadTrackData();
    this.opt.onChange();
  };

  Drums.prototype.onDataLoaded = function(drumData, patternData){
    this.parseData(drumData, patternData);
    this.loadTrackData();
    this.opt.onDataLoaded();
    this.loadUI();
    this.loadListeners();
  };

  Drums.prototype.parseData = function(drumData, patternData){
    // parse drums
    var drumItemHeadings = drumData.itemHeadings;
    var drums = _.map(drumData.drums, function(drum){
      drum.instruments = _.map(drum.instruments, function(i){
        return _.object(drumItemHeadings, i);
      });
      return drum;
    });
    this.drums = drums;
    this.drumIndex = _.random(0, this.drums.length-1);

    // parse patterns
    var patternItemHeadings = patternData.itemHeadings;
    var patterns = [];
    _.each(patternData.patterns, function(p, i){
      var meta = _.object(patternItemHeadings, p);
      var bars = meta.bars;
      meta = _.omit(meta, 'bars');
      _.each(bars, function(pattern, j){
        patterns.push(_.extend({}, meta, {groupIndex: i, pattern: pattern, bar: (j+1), index: patterns.length}));
      });
    });
    this.patterns = patterns;
    // break patterns up into groups
    var patternGroupsLookup = _.groupBy(patterns, 'groupIndex');
    var patternGroups = [];
    _.times(patternData.patterns.length, function(i){
      var gpatterns = _.sortBy(patternGroupsLookup[i], 'bar');
      patternGroups.push(gpatterns);
    });
    this.patternKey = patternData.patternKey;
    this.patternIndex = _.random(0, this.patterns.length-1);
    this.patternGroups = patternGroups;
  };

  Drums.prototype.randomize = function(){
    var patternIndex = _.random(0, this.patterns.length-1);
    this.$patternSelect.val(""+patternIndex).trigger('change');
  };

  // step through the bars of the current pattern group
  Drums.prototype.step = function(amount){
    var pattern = this.patterns[this.patternIndex];
    var patternGroup = this.patternGroups[pattern.groupIndex];
    if (patternGroup.length < 2) {
      console.log('Only one pattern in this group');
      return;
    }
    var barIndex = pattern.bar - 1 + amount;
    barIndex = MathUtil.wrap(barIndex, 0, patternGroup.length-1);
    var newPattern = patternGroup[barIndex];
    this.$patternSelect.val(""+newPattern.index).trigger('change');
  };

  return Drums;

})();
