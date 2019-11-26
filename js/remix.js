'use strict';

var RemixApp = (function() {

  function RemixApp(config) {
    var defaults = {
      "el": "#sequencer"
    };
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  RemixApp.prototype.init = function(){
    var _this = this;

    // Tone.context.latencyHint = 'playback'; // prioritize sustained feedback; https://github.com/Tonejs/Tone.js/wiki/Performance

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

  RemixApp.prototype.loadSequencer = function(){
    var _this = this;
    var tracks = _.extend({}, this.drums.tracks, this.collections.tracks);

    this.sequencer = new Sequencer({
      "el": _this.opt.el,
      "tracks": tracks
    });
  };

  RemixApp.prototype.onLoad = function(){
    this.loadSequencer();
  };

  RemixApp.prototype.onChangeDrums = function(){
    this.updateSequencer(this.drums.tracks, "drum");
  };

  RemixApp.prototype.onChangeCollections = function(){
    this.updateSequencer(this.collections.tracks, "collection");
  };

  RemixApp.prototype.updateSequencer = function(tracks, type){
    this.sequencer.update(tracks, type);
  };

  return RemixApp;

})();

$(function() {
  var app = new RemixApp({});
});
