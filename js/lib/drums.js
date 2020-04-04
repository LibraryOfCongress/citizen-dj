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
      "onDataLoaded": function(){},
      "drumName": false,
      "patternName": false
    };
    var globalConfig = typeof CONFIG !== 'undefined' ? CONFIG : {};
    var q = Util.queryParams();
    this.opt = _.extend({}, defaults, config, globalConfig, q);
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
    this.$el = $(this.opt.el);
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

    // $('.prev-drum').on('click', function(e){
    //   _this.step(-1);
    // });
    // $('.next-drum').on('click', function(e){
    //   _this.step(1);
    // });

    this.$el.on('click', '.prev-drum', function(e){
      _this.step(-1);
    });
    this.$el.on('click', '.next-drum', function(e){
      _this.step(1);
    });

    $(document).keypress(function(e) {
      if (e.which === 119) { // w
        e.preventDefault();
        _this.step(-1);
      } else if (e.which === 115) { // s
        e.preventDefault();
        _this.step(1);
      }
    });
  };

  Drums.prototype.loadTrackData = function(){
    var _this = this;
    var pattern = this.patterns[this.patternIndex];
    var drum = this.drums[this.drumIndex];

    var tracks = {};
    _.each(pattern.pattern, function(instruments, col){
      _.each(instruments, function(instrument, instrumentIndex){
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
            var title = _this.patternKey[bestInstrument.instrument] + " (" + drum.name + " drum machine)";
            tracks[instrument] = {
              "pattern": pattern,
              "url": url,
              "title": title,
              "trackType": "drum",
              "typeLabel": "Drum",
              "sequence": 1,
              "gain": _this.opt.gain
            };
          }
        }
      });
    });

    _.each(_.keys(tracks), function(key, i){
      tracks[key].sequence = i+1;
    });

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
      html += '<option value="'+index+'"'+selected+'>'+pattern.name+'</option>';
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
    var _this = this;

    // parse drums
    var drumItemHeadings = drumData.itemHeadings;
    var drums = _.map(drumData.drums, function(drum){
      drum.instruments = _.map(drum.instruments, function(i){
        return _.object(drumItemHeadings, i);
      });
      return drum;
    });
    this.drums = drums;
    // this.drumIndex = _.random(0, this.drums.length-1);
    this.drumIndex = 0;

    if (this.opt.drumName !== false) {
      var foundIndex = _.findIndex(this.drums, function(drum){ return (drum.name === _this.opt.drumName); });
      if (foundIndex >= 0) this.drumIndex = foundIndex;
    }

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
    patterns = _.map(patterns, function(pattern){
      // var name = pattern.artist + ' - ' + pattern.title + ' (' + pattern.year + ') [';
      var name = pattern.label + ' [';
      if (!Number.isInteger(pattern.category)) name += pattern.category + " ";
      name += pattern.bar + ']';
      pattern.name = name;
      return pattern;
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

    if (this.opt.patternName !== false) {
      var foundPIndex = _.findIndex(this.patterns, function(pattern){ return (pattern.name === _this.opt.patternName); });
      if (foundPIndex >= 0) this.patternIndex = foundPIndex;
    }
  };

  Drums.prototype.randomize = function(){
    var patternIndex = _.random(0, this.patterns.length-1);
    this.$patternSelect.val(""+patternIndex).trigger('change');
  };

  Drums.prototype.reloadFromUrl = function(){
    var q = Util.queryParams();
    var changed = false;

    if (q.drumName !== undefined) {
      var foundIndex = _.findIndex(this.drums, function(drum){ return (drum.name === q.drumName); });
      if (foundIndex >= 0) {
        this.drumIndex = foundIndex;
        this.$drumSelect.val(""+foundIndex);
        changed = true;
      }
    }

    if (q.patternName !== undefined) {
      var foundPIndex = _.findIndex(this.patterns, function(pattern){ return (pattern.name === q.patternName); });
      if (foundPIndex >= 0) {
        this.patternIndex = foundPIndex;
        this.$patternSelect.val(""+foundPIndex);
        changed = true;
      }
    }

    if (!changed) return;

    this.loadTrackData();
    // this.opt.onChange();
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

  Drums.prototype.toJSON = function(){
    var data = {
      "drumName": this.drums[this.drumIndex].name,
      "patternName": this.patterns[this.patternIndex].name
    };
    return data;
  };

  return Drums;

})();
