'use strict';

var Favorites = (function() {

  function Favorites(config) {
    var defaults = {
      'storageKey': 'favdata'
    };
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  Favorites.prototype.init = function(){
    this.$button = $('.fav-button');
    this.$count = $('.fav-count-button');
    this.textOff = this.$button.first().text();
    this.textOn = this.$button.first().attr('data-on');
    this.$dialog = $('#modal-favs');
    this.$list = $('#favs-list');
    // console.log(this.textOff, this.textOn);

    if (typeof(Storage) == "undefined") {
      console.log('No storage available');
      this.$button.css('display', 'none');
      this.$count.css('display', 'none');
      return;
    }

    this.storage = window.localStorage;
    this.currentTitle = this.opt.currentTitle;
    this.currentUrl = window.location.href;
    if (!this.currentUrl.includes('?')) {
      this.currentUrl = false;
    }
    // console.log('Init URL', this.currentUrl);

    this.loadData();
    this.loadListeners();
  };

  Favorites.prototype.favOn = function(url){
    var time = new Date().getTime();
    var title = this.currentTitle;
    this.favData.push({
      'url': url,
      'datetime': time,
      'title': title
    });
    this.onFavChange();
  };

  Favorites.prototype.favOff = function(url){
    this.favData = _.reject(this.favData, function(d){ return d.url == url; });
    this.onFavChange();
  };

  Favorites.prototype.setDataAsString = function(){
    var data = _.map(this.favData, function(item){
      return [item.url, item.datetime, item.title];
    });
    var data = _.flatten(data, true);
    // console.log('Setting data: ', data);
    this.storage.setItem(this.opt.storageKey, JSON.stringify(data));
  };

  Favorites.prototype.getStringAsData = function(){
    if (!this.storage.getItem(this.opt.storageKey)) {
      return [];
    }
    var data = JSON.parse(this.storage.getItem(this.opt.storageKey));
    data = _.chunk(data, 3);
    data = _.map(data, function(item){
      return {
        'url': item[0],
        'datetime': item[1],
        'title': item[2]
      }
    });
    // console.log('Loaded data: ', data);
    return data;
  };

  Favorites.prototype.isCurrentUrlFav = function(){
    return _.findWhere(this.favData , {url: this.currentUrl});
  }

  Favorites.prototype.loadData = function(){
    this.favData = this.getStringAsData();
    this.onFavChange();
  };

  Favorites.prototype.loadListeners = function(){
    var _this = this;
    var $doc = $(document);

    this.$button.on('click', function(e){
      _this.toggleFav($(this));
    });

    this.$count.on('click', function(e){
      _this.showFavs();
    });

    $doc.on('change-url', function(e, newUrl, newTitle) {
      _this.onChangeUrl(newUrl, newTitle);
    });

    $doc.on('click', '.unfav-button', function(e){
      _this.favOff($(this).attr('data-url'));
    });
  };

  Favorites.prototype.onChangeUrl = function(newUrl, newTitle){
    // console.log('Update URL', newUrl);
    this.currentUrl = newUrl;
    this.currentTitle = newTitle;
    this.onFavChange();
  };

  Favorites.prototype.onFavChange = function(){
    var isFav = this.isCurrentUrlFav();

    // update button
    if (isFav) {
      this.$button.text(this.textOn);
      this.$button.addClass('active');
    } else {
      this.$button.text(this.textOff);
      this.$button.removeClass('active');
    }

    // update count
    if (this.favData.length > 0) {
      this.$count.text(this.favData.length.toLocaleString());
      this.$count.addClass('active');
    } else {
      this.$count.text('0');
      this.$count.removeClass('active');
    }

    var html = '';
    _.each(this.favData, function(pattern){
      html += '<li>';
        html += '<div class="links">';
          html += '<a href="'+pattern.url+'">'+pattern.title+'</a>';
          html += '<button class="unfav-button small" data-url="'+pattern.url+'">Remove</button>';
        html += '</div>';
        var datetimeF = (new Date(pattern.datetime)).toISOString().slice(0, 19).replace("T", " ");
        html += '<div class="date">';
          html += '<small>Added on '+datetimeF+'</small>';
        html += '</div>';
      html += '</li>';
    });
    this.$list.html(html);

    this.setDataAsString();
  };

  Favorites.prototype.showFavs = function(){
    this.$dialog.addClass('active');
  };

  Favorites.prototype.toggleFav = function($button){
    var isFav = this.isCurrentUrlFav();
    if (isFav) this.favOff(this.currentUrl);
    else this.favOn(this.currentUrl);
  };

  return Favorites;

})();
