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

    var $menuLinks = $('.submenu-link');

    $menuLinks.parent().on('click', function(e){
      e.stopPropagation();
      var $link = $(this).find('.submenu-link');
      var expanded = $link.attr('aria-expanded') === 'true';
      if (expanded) $link.attr('aria-expanded', 'false');
      else $link.attr('aria-expanded', 'true');
    });

    $(document).click(function() {
      $menuLinks.attr('aria-expanded', 'false');
    });
  };

  return UI;

})();

$(function() {
  var app = new UI({});
});
