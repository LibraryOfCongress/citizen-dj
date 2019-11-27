'use strict';

var UI = (function() {

  function UI(config) {
    var defaults = {};
    var globalConfig = typeof CONFIG !== 'undefined' ? CONFIG : {};
    this.opt = _.extend({}, defaults, config, globalConfig);
    this.init();
  }

  UI.prototype.init = function(){
    this.loadListeners();
  };

  UI.prototype.loadListeners = function(){
    $('.submenu-link').on('click', function(){
      // console.log($(this).attr('aria-expanded'))
      var expanded = $(this).attr('aria-expanded') === 'true';
      if (expanded) $(this).attr('aria-expanded', 'false');
      else $(this).attr('aria-expanded', 'true');
    });
  };

  return UI;

})();

$(function() {
  var app = new UI({});
});
