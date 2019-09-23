'use strict';

var Pattern = (function() {

  function Pattern(config) {
    var defaults = {
      "matrix": {
        "k": [1,0,0,0, 0,0,0,0, 1,1,0,1, 0,0,0,0],
        "s": [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
        "h": [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]
      }
    };
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  Pattern.prototype.init = function(){
    this.subdivision = this.opt.subdivision || 16;
    this.matrix = {};

    this.set(this.opt.matrix);
  };

  Pattern.prototype.addRow = function(key){
    var newRow = _.times(this.subdivision, function(n){ return 0; });
    this.setRow(key, newRow);
  };

  Pattern.prototype.removeRow = function(key){
    this.matrix = _.omit(this.matrix, key);
  };

  Pattern.prototype.set = function(patternMatrix){
    if (patternMatrix) {
      this.subdivision = _.values(patternMatrix)[0].length;
      this.matrix = patternMatrix;
    }
  };

  Pattern.prototype.setCell = function(key, col, val){
    this.matrix[key][col] = val;
  };

  Pattern.prototype.setRow = function(key, row){
    this.matrix[key] = row;
  };

  return Pattern;

})();
