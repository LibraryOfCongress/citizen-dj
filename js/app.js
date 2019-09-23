'use strict';

var App = (function() {

  function App(config) {
    var defaults = {};
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  App.prototype.init = function(){
    this.sequencer = new Sequencer({
      "bpm": 94
    });
  };

  return App;

})();

$(function() {
  var app = new App({});
});
