'use strict';

var RemixApp = (function() {

  function RemixApp(config) {
    var defaults = {
      "el": "#sequencer",
      "urlVarMap": { // aliases for url query vars
        "bpm": "b",
        "itemId": "i",
        "itemStart": "s",
        "drumId": "d",
        "patternId": "p",
        "patternEdits": "e",
        "trackEdits": "t"
      }
    };
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  RemixApp.prototype.init = function(){
    var _this = this;

    // console.log($.param({e: '9-._~:/?#[]@!$&()*+,;='}));

    // Tone.context.latencyHint = 'playback'; // prioritize sustained feedback; https://github.com/Tonejs/Tone.js/wiki/Performance
    // try {
    //   this.recordingStreamDestination = Tone.context.createMediaStreamDestination();
    // } catch(e) {
    //   console.log('Recording not supported');
    //   this.recordingStreamDestination = false;
    // }
    this.recordingStreamDestination = false;

    var q = Util.queryParams();
    this.hasQuery = !_.isEmpty(q);

    this.drums = new Drums({
      "parent": _this.opt.el,
      "urlVarMap": _this.opt.urlVarMap,
      "onChange": function(){ _this.onChangeDrums(); },
      "beforeChange": function(){ _this.beforeChange(); }
    });

    this.collections = new Collections({
      "parent": _this.opt.el,
      "urlVarMap": _this.opt.urlVarMap,
      "assetUrl": _this.opt.assetUrl,
      "onChange": function(){ _this.onChangeCollections(); },
      "beforeChange": function(){ _this.beforeChange(); }
    });

    var $loading = $('.loading');
    $.when(
      this.drums.load(),
      this.collections.load()

    ).done(function(){
      console.log("Loaded everything. Starting sequencer.");
      $loading.removeClass('active');
      _this.onLoad();
    });
  };

  RemixApp.prototype.beforeChange = function(){
    this.sequencer.resetSolo();
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

    // delay the change trigger so we're not constantly updating URL with a new bpm
    var onChange = _.debounce(function(){ _this.updateURL(); }, 1000);

    this.sequencer = new Sequencer({
      "el": _this.opt.el,
      "urlVarMap": _this.opt.urlVarMap,
      "tracks": tracks,
      "onChange": onChange,
      "recordingStreamDestination": this.recordingStreamDestination
    });
  };

  RemixApp.prototype.onLoad = function(){
    this.loadSequencer();
    //this.loadRecorder();
    if (!this.hasQuery) this.updateURL(true);
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
    this.sequencer.reloadFromUrl();
  };

  RemixApp.prototype.updateSequencer = function(tracks, type){
    this.sequencer.update(tracks, type);
    this.updateURL();
  };

  RemixApp.prototype.updateURL = function(replace){
    var data = _.extend({}, this.sequencer.toJSON(), this.collections.toJSON(), this.drums.toJSON());
    data = Util.mapVars(data, this.opt.urlVarMap);
    var urlEncoded = $.param(data);
    // console.log(urlEncoded);

    if (window.history.pushState) {
      var baseUrl = window.location.href.split('?')[0];
      var currentState = window.history.state;
      var newUrl = baseUrl + '?' + urlEncoded;

      // ignore if state is the same
      if (currentState) {
        var currentUrl = baseUrl + '?' + $.param(currentState);
        if (newUrl === currentUrl) return;
      }

      if (replace===true) window.history.replaceState(data, '', newUrl);
      else window.history.pushState(data, '', newUrl);
    }
  };

  return RemixApp;

})();

$(function() {
  var app = new RemixApp({});
});
