'use strict';

var Sequencer = (function() {

  function Sequencer(config) {
    var defaults = {
      "keyUrls": {},
      "subdivision": 16,
      "bpm": 120,
      "playerGain": 0,
      "playerFadeOut": "64n"
    };
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  Sequencer.prototype.init = function(){
    var _this = this;

    this.subdStr = this.opt.subdivision + "n";
    this.subdArr = _.times(this.opt.subdivision, function(n){ return n; });
    this.setBPM(this.opt.bpm);

    this.keys = new Tone.Players(this.opt.keyUrls, {
      "volume": this.opt.playerGain,
      "fadeOut": this.opt.playerFadeOut
    }, function(){ _this.onPlayersLoad(); });
    this.keyNames = _.keys(this.opt.keyUrls);

    this.setPattern(this.opt.pattern);

    this.loop = new Tone.Sequence(function(time, col){
      _this.onStep(time, col);
    }, this.subdArr, this.subdStr);
  };

  Sequencer.prototype.addPatternRow = function(row, index){
    index = index || 0;
    this.pattern.splice(index, 0, row);
  };

  Sequencer.prototype.onPlayersLoad = function(){

  };

  Sequencer.prototype.onStep = function(time, col){

  };

  Sequencer.prototype.setBPM = function(bpm){
    Tone.Transport.bpm.value = bpm;
  };

  Sequencer.prototype.removePatternRow = function(row){
    this.pattern.splice(row, 1);
  };

  Sequencer.prototype.setPattern = function(patternMatrix){
    // if no pattern, initialize one with the right width and height
    if (!patternMatrix) {
      var subd = this.opt.subdivision;
      patternMatrix = _.times(this.keyNames.length, function(row){
        return _.times(subd, function(col){ return 0; });
      });
    }
    this.pattern = patternMatrix;
  };

  Sequencer.prototype.setPatternUnitValue = function(row, col, val){
    this.pattern[row][col] = val;
  };

  Sequencer.prototype.start = function(t){
    t = t || 0;
    this.loop.start(t);
  };

  Sequencer.prototype.stop = function(){
    this.loop.stop(t);
  };

  return Sequencer;

})();
