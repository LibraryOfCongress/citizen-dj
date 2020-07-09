'use strict';

var Drums = (function() {

  function Drums(config) {
    var defaults = {
      "parent": "#sequencer",
      "el": "#drum-rack",
      "baseUrl": "",
      "drumsFile": "/data/drum_machines.json",
      "patternsFile": "/data/drum_patterns.json",
      "audioDir": "/audio/drum_machines/",
      "gain": -12,
      "beforeChange": function(){},
      "onChange": function(){},
      "onDataLoaded": function(){},
      "drumName": false,
      "patternName": false,
      "drumId": false,
      "patternId": false
    };
    var globalConfig = typeof CONFIG !== 'undefined' ? CONFIG : {};
    var q = Util.queryParams();
    if (config.urlVarMap) {
      q = Util.mapVars(q, config.urlVarMap, true);
    }
    this.opt = _.extend({}, defaults, config, globalConfig, q);
    this.init();
  }

  function selectInstrument(instruments, instrumentKey) {
    var finstruments = _.where(instruments, {instrument: instrumentKey});
    if (finstruments.length > 0) return finstruments[0];
    else return false;
  };

  Drums.prototype.init = function(){
    this.$parent = $(this.opt.parent);
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
              "id": instrument,
              "$parent": _this.$el,
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

    // load drum select
    var $drumSelect = this.$parent.find(".select-drum");
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
    var $patternSelect = this.$parent.find(".select-pattern");
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
    this.opt.beforeChange();
    this.drumIndex = index;
    this.loadTrackData();
    this.opt.onChange();
  };

  Drums.prototype.onChangePattern = function(index){
    this.opt.beforeChange();
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

    // check for existing drum
    var foundIndex = -1;
    if (this.opt.drumName !== false) {
      foundIndex = _.findIndex(this.drums, function(drum){ return (drum.name === _this.opt.drumName); });
    } else if (this.opt.drumId !== false) {
      foundIndex = _.findIndex(this.drums, function(drum){ return (drum.id === _this.opt.drumId); });
    }
    if (foundIndex >= 0) this.drumIndex = foundIndex;

    // parse patterns
    var patternItemHeadings = patternData.itemHeadings;
    var patterns = _.map(patternData.patterns, function(p){
      var pattern = _.object(patternItemHeadings, p);
      return pattern;
    });
    this.patterns = patterns;
    this.patternKey = patternData.patternKey;
    this.patternIndex = _.random(0, this.patterns.length-1);

    // check for existing pattern
    var foundPIndex = -1;
    if (this.opt.patternName !== false) {
      foundPIndex = _.findIndex(this.patterns, function(pattern){ return (pattern.name === _this.opt.patternName); });
    } else if (this.opt.patternId !== false) {
      foundPIndex = _.findIndex(this.patterns, function(pattern){ return (pattern.id === _this.opt.patternId); });
    }
    if (foundPIndex >= 0) this.patternIndex = foundPIndex;
  };

  Drums.prototype.randomize = function(){
    var patternIndex = _.random(0, this.patterns.length-1);
    this.$patternSelect.val(""+patternIndex).trigger('change');
  };

  Drums.prototype.reloadFromUrl = function(){
    var q = Util.queryParams();
    var changed = false;
    var foundIndex = -1;

    if (q.drumName !== undefined) {
      foundIndex = _.findIndex(this.drums, function(drum){ return (drum.name === q.drumName); });
    } else if (q.drumId !== undefined) {
      foundIndex = _.findIndex(this.drums, function(drum){ return (drum.id === q.drumId); });
    }
    if (foundIndex >= 0) {
      this.drumIndex = foundIndex;
      this.$drumSelect.val(""+foundIndex);
      changed = true;
    }

    var foundPIndex = -1;
    if (q.patternName !== undefined) {
      foundPIndex = _.findIndex(this.patterns, function(pattern){ return (pattern.name === q.patternName); });
    } else if (q.patternId !== undefined) {
      foundPIndex = _.findIndex(this.patterns, function(pattern){ return (pattern.id === q.patternId); });
    }
    if (foundPIndex >= 0) {
      this.patternIndex = foundPIndex;
      this.$patternSelect.val(""+foundPIndex);
      changed = true;
    }

    if (!changed) return;

    this.loadTrackData();
    // this.opt.onChange();
  };

  // step through the bars of the current pattern group
  Drums.prototype.step = function(amount){
    var index = this.patternIndex + amount;
    index = MathUtil.wrap(index, 0, this.patterns.length-1);
    this.$patternSelect.val(""+index).trigger('change');
  };

  Drums.prototype.toJSON = function(){
    var data = {
      "drumId": this.drums[this.drumIndex].id,
      "patternId": this.patterns[this.patternIndex].id
    };
    return data;
  };

  return Drums;

})();
