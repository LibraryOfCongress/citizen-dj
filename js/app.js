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
      "onChange": function(){ _this.onChangeDrums(); }
    });

    this.collections = new Collections({
      "el": _this.opt.el,
      "onChange": function(){ _this.onChangeCollections(); }
    });

    $.when(
      this.drums.load(),
      this.collections.load()

    ).done(function(){
      console.log("Loaded everything. Starting sequencer.")
      _this.onLoad();
    });
  };

  App.prototype.loadSequencer = function(){
    var _this = this;
    var tracks = _.extend({}, this.drums.tracks, this.collections.tracks);

    this.sequencer = new Sequencer({
      "el": _this.opt.el,
      "tracks": tracks
    });
  };

  App.prototype.onLoad = function(){
    this.loadSequencer();
  };

  App.prototype.onChangeDrums = function(){
    this.updateSequencer(this.drums.tracks, "drum");
  };

  App.prototype.onChangeCollections = function(){
    this.updateSequencer(this.collections.tracks, "collection");
  };

  App.prototype.updateSequencer = function(tracks, type){
    this.sequencer.update(tracks, type);
  };

  return App;

})();

$(function() {
  var app = new App({});
});
