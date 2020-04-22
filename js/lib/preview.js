'use strict';

var Preview = (function() {

  function Preview() {
    this.init();
  }

  function getQueryParams(){
    if (location.search.length) {
      var search = location.search.substring(1);
      return JSON.parse('{"' + search.replace(/&/g, '","').replace(/=/g,'":"') + '"}', function(key, value) { return key===""?value:decodeURIComponent(value) });
    }
    return {};
  };

  function objectHas(object, key) {
    return object ? hasOwnProperty.call(object, key) : false;
   }

  Preview.prototype.init = function(){
    var sessionName = 'previewConfirmed';

    // Get saved data from sessionStorage
    var isConfirmed = sessionStorage.getItem(sessionName);
    if (isConfirmed) return;

    // check for loop11 test
    var q = getQueryParams();
    if (objectHas(q, 'l11_uid') || objectHas(q, 'l11_mode')) {
      sessionStorage.setItem(sessionName, 'confirmed');
      return;
    }

    confirm('Citizen DJ is actively under construction and available for review & feedback only. *Please do not share.* Public launch is expected to be in summer 2020. Find updates at https://labs.loc.gov/experiments/citizen-dj/.');

    sessionStorage.setItem(sessionName, 'confirmed');
  };

  return Preview;

})();


var previewApp = new Preview();
