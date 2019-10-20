'use strict';

var Collections = (function() {

  function Collections(config) {
    var defaults = {
      "el": "#sequencer",
      "collectionId": "ia_fedflixnara_us_information_agency",
      "metadataDir": "/data/metadata/",
      "sampledataDir": "/data/sampledata/",
      "audioDir": "./audio/collections/",
      "sampleItemKey": "sourceFilename",
      "itemKey": "filename",
      "onChange": function(){},
      "onDataLoaded": function(){}
    };
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  Collections.prototype.init = function(){

  };

  Collections.prototype.load = function(){
    var _this = this;
    var deferred = $.Deferred();

    $.when(
      $.getJSON(this.opt.metadataDir + this.opt.collectionId + '.json'),
      $.getJSON(this.opt.sampledataDir + this.opt.collectionId + '.json')

    ).done(function(metadata, sampledata){
      metadata = metadata[0];
      sampledata = sampledata[0];

      console.log('Metadata and sample data loaded.');
      _this.onDataLoaded(metadata, sampledata);
      deferred.resolve();
    });

    return deferred;
  };

  Collections.prototype.loadListeners = function(){
    var _this = this;

    this.$itemSelect.on('change', function(e){
      _this.onItemChange(parseInt($(this).val()));
    });
  };

  Collections.prototype.loadTrackData = function(){

  };

  Collections.prototype.loadUI = function(){
    this.$el = $(this.opt.el);
    
    // load item select
    var $itemSelect = this.$el.find(".select-item");
    var html = $itemSelect.html();
    $itemSelect.empty();
    _.each(this.items, function(item, index){
      html += '<option value="'+(index+1)+'">'+item.title+'</option>';
    });
    $itemSelect.html(html);
    this.$itemSelect = $itemSelect;
  };

  Collections.prototype.onDataLoaded = function(metadata, sampledata){
    this.parseData(metadata, sampledata);
    this.loadTrackData();
    this.opt.onDataLoaded();
    this.loadUI();
    this.loadListeners();
  };

  Collections.onItemChange = function(index){};

  Collections.prototype.parseData = function(metadata, sampledata){
    this.items = [];
    this.samples = [];
  };

  return Collections;

})();
