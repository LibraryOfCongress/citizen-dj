'use strict';

var UseApp = (function() {

  function UseApp(config) {
    var defaults = {};
    var globalConfig = typeof CONFIG !== 'undefined' ? CONFIG : {};
    this.opt = _.extend({}, defaults, config, globalConfig);
    this.init();
  }

  UseApp.prototype.init = function(){
    var player = new Player();
  };

  return UseApp;

})();

$(function() {
  var app = new UseApp({});
});
