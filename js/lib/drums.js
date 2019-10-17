'use strict';

var Drums = (function() {

  function Drums(config) {
    var defaults = {
      "el": "#sequencer",
      "drumsFile": "/data/drum_machines.json",
      "patternsFile": "/data/drum_patterns.json",
      "audioDir": "./audio/drum_machines/",
      "onChange": function(){},
      "onDataLoaded": function(){}
    };
    this.opt = _.extend({}, defaults, config);
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
    var _this = this;

    $.when(
      $.getJSON(this.opt.drumsFile),
      $.getJSON(this.opt.patternsFile)

    ).done(function(drumData, patternData){
      drumData = drumData[0];
      patternData = patternData[0];

      console.log('Drum and pattern data loaded.');
      _this.onDataLoaded(drumData, patternData);
    });
  };

  Drums.prototype.loadListeners = function(){
    var _this = this;

    this.$drumSelect.on('change', function(e){
      _this.onChangeDrum(parseInt($(this).val()));
    });

    this.$patternSelect.on('change', function(e){
      _this.onChangePattern(parseInt($(this).val()));
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
            var url = _this.opt.audioDir + bestInstrument.filename;
            var title = _this.patternKey[bestInstrument.instrument] + " / " + drum.name;
            tracks[instrument] = { "pattern": pattern, "url": url, "title": title };
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
    _.each(patternData.patterns, function(p){
      var meta = _.object(patternItemHeadings, p);
      var bars = meta.bars;
      meta = _.omit(meta, 'bars');
      _.each(bars, function(pattern, i){
        patterns.push(_.extend({}, meta, {pattern: pattern, bar: (i+1)}));
      });
    });
    this.patterns = patterns;
    this.patternKey = patternData.patternKey;
    this.patternIndex = _.random(0, this.patterns.length-1);
  };

  return Drums;

})();
