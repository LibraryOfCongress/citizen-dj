'use strict';

var App = (function() {

  function App(config) {
    var defaults = {
      "el": "#sequencer"
    };
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  App.prototype.init = function(){
    var _this = this;

    this.drums = new Drums({
      "el": _this.opt.el,
      "onChange": function(){ _this.onChangeDrums(); },
      "onDataLoaded": function(){ _this.onLoadDrums(); }
    });
  };

  App.prototype.loadSequencer = function(){
    var _this = this;

    this.sequencer = new Sequencer({
      "el": _this.opt.el,
      "tracks": _this.drums.tracks
    });
  };

  App.prototype.onLoadDrums = function(){
    this.loadSequencer();
  };

  App.prototype.onChangeDrums = function(){
    this.updateSequencer();
  };

  App.prototype.updateSequencer = function(){
    this.sequencer.update(this.drums.tracks);
  };

  return App;

})();

$(function() {
  var app = new App({});
});
