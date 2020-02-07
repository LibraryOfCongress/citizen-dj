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

    this.recordingStreamDestination = Tone.context.createMediaStreamDestination();

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

  RemixApp.prototype.loadListeners = function(){
    var _this = this;

    if (window.history.pushState) {
      window.onpopstate = function(e){
        _this.reloadFromUrl();
      }
    }

  };

  RemixApp.prototype.loadRecorder = function(){
    var _this = this;

    this.recorder = new AudioRecorder({
      "destination": this.recordingStreamDestination
    });
  };

  RemixApp.prototype.loadSequencer = function(){
    var _this = this;
    var tracks = _.extend({}, this.drums.tracks, this.collections.tracks);

    this.sequencer = new Sequencer({
      "el": _this.opt.el,
      "tracks": tracks,
      "onChange": function(){ _this.updateURL(); },
      "recordingStreamDestination": this.recordingStreamDestination
    });
  };

  RemixApp.prototype.onLoad = function(){
    this.loadSequencer();
    this.loadRecorder();
    this.updateURL();
    this.loadListeners();
  };

  RemixApp.prototype.onChangeDrums = function(){
    this.updateSequencer(this.drums.tracks, "drum");
  };

  RemixApp.prototype.onChangeCollections = function(){
    this.updateSequencer(this.collections.tracks, "collection");
  };

  RemixApp.prototype.reloadFromUrl = function(){
    this.drums.reloadFromUrl();
    this.collections.reloadFromUrl();
    this.sequencer.update(this.drums.tracks, "drum");
    this.sequencer.update(this.collections.tracks, "collection");
  };

  RemixApp.prototype.updateSequencer = function(tracks, type){
    this.sequencer.update(tracks, type);
    this.updateURL();
  };

  RemixApp.prototype.updateURL = function(){
    var data = _.extend({}, this.collections.toJSON(), this.drums.toJSON());

    var urlEncoded = $.param(data);
    // console.log(urlEncoded);

    if (window.history.pushState) {
      var url = window.location.href.split('?')[0] + '?' + urlEncoded;
      window.history.pushState(data, '', url);
    }
  };

  return RemixApp;

})();

$(function() {
  var app = new RemixApp({});
});
