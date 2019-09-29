'use strict';

var App = (function() {

  function App(config) {
    var defaults = {};
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  App.prototype.init = function(){
    this.sequencer = new Sequencer({
      "bpm": 94,
      "tracks": {
        "k": {
          "pattern": [1,0,0,0, 0,0,0,0, 1,1,0,1, 0,0,0,0],
          "url": "./audio/drum_machines/Roland_Tr-808_full__36kick.mp3"
        },
        "s": {
          "pattern": [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
          "url": "./audio/drum_machines/Roland_Tr-808_full__40snare.mp3"
        },
        "h": {
          "pattern": [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
          "url": "./audio/drum_machines/Roland_Tr-808_full__42hat_closed.mp3"
        }
      }
    });
  };

  return App;

})();

$(function() {
  var app = new App({});
});
