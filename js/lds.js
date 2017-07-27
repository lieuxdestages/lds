(function(){
  'use strict';

  var spreadsheetId = '1uDAlb1t3MKqzODuFhWZ2hjD-fEIqlvUv0AMd5wygLmU';

  var clientId = '61423845060-c7ttllntmklka9r516vf118v45jskh93.apps.googleusercontent.com',
    apiKey = 'AIzaSyDVYUtOyW6PSSPJOqE7EB85hMoRGUVktdY',
    discoveryDocs = ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    scopes = 'https://www.googleapis.com/auth/spreadsheets',
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  var myId = null,     // google user id for current user
    mainTable,
    overlay;

  class KModel {
    constructor(model){
      if(!model) { return console.error('Missing model'); }
      if(!model.metadata) { return console.error('Missing metadata'); }
      if(!model.sheet) { return console.error('Missing model sheet'); }
      if(!model.type) { return console.error('Missing type'); }
      this.metadata   = model.metadata;
      this.sheet = model.sheet;
      this._type = model.type;
      this._rowIdx = 0;
      this._data = {};
      this._updateCallbacks = [];
    }

   setValuesFromRow(rowIndex, row){
      var self = this;
      self._rowIdx = rowIndex;
      _.forEach(self.metadata, meta => {
        var i;
        if(meta.col){
          i = letters.indexOf(meta.col);
          self._data[meta.field] = row[i];
        } else if(meta.array){
          self._data[meta.field] = [];
        }
      });
    }

    setValuesFromModel(model){
      var self = this;
      _.forEach(self.metadata, meta => {
        if(meta.array){
          self._data[meta.field] = [];
          model.get(meta.field).forEach(function(o){
            self._data[meta.field].push(o.clone());
          });
        } else {
          self._data[meta.field] = model.get(meta.field);
        }
      });
    }

    clone(){
      var p = new this._type();
      p._rowIdx = this._rowIdx;
      p.setValuesFromModel(this);
      return p;
    }

    get(field){
      var val;
      if((typeof(this._data[field]) === 'function')){
        val = this._data[field]();
      } else {
        val = this._data[field];
      }
      return val;
    }

    set(field, val){
      this._data[field] = val;
      _.forEach(this._updateCallbacks, function(f){ f(); });
    }

    onUpdate(cb){
      if(typeof(cb) !== 'function') {
        return console.warn('Invalid update callback function');
      }
      this._updateCallbacks.push(cb);
    }

    eq(other) {
      if(!other){ return false; }
      var self = this,
        res = true;
      // find first different field value
      _.find(self.metadata, function(key){
        if(key.array) { return false; } // not deep comparison for now
        if(self.get(key.field) !== other.get(key.field)){
          // console.info('diff', key.field, self.get(key.field), other.get(key.field));
          res = false;
        }
        return !res;
      });
      return res;
    }

    save(err, cb){
      var self = this,
        values = [],
        range,first,last,
        firstIdx = Number.MAX_SAFE_INTEGER,
        lastIdx = 0;
      _.forEach(self.metadata, function(meta){
        var i;
        if(meta.col){
          i = letters.indexOf(meta.col);
          if(i < firstIdx){ firstIdx = i; first = meta.col; }
          if(i > lastIdx){ lastIdx = i; last = meta.col; }
          values[i] = self._data[meta.field];
        }
      });
      if(self._rowIdx){
        range = self.sheet + '!' + first + self._rowIdx + ':' + last + self._rowIdx;
        gapi.client.sheets.spreadsheets.values.update({
          'spreadsheetId': spreadsheetId,
          'range': range,
          'valueInputOption': 'RAW'
        }, {
          'majorDimension': 'ROWS',
          'values': [ values ]
        }).then(function(){
          self._logSave(JSON.stringify(values), err, cb);
        }, function(e){
          console.error(':( Error during save action.', e);
          if(err) { err(e); }
        });
      } else {
        range = self.sheet + '!' + first + '1:' + last + '1';
        gapi.client.sheets.spreadsheets.values.append({
          'spreadsheetId': spreadsheetId,
          'range': range,
          'valueInputOption': 'RAW',
          'insertDataOption': 'INSERT_ROWS'
        }, {
          'majorDimension': 'ROWS',
          'values': [ values ]
        }).then(function(){
          self._logSave(JSON.stringify(values), err, cb);
        }, function(e){
          console.error(':( Error during create action.', e);
          if(err) { err(e); }
        });
      }
    }

    _logSave(content, err, cb){
      var self = this;
      gapi.client.sheets.spreadsheets.values.append({
        'spreadsheetId': spreadsheetId,
        'range': 'Log!A1:D1',
        'valueInputOption': 'RAW',
        'insertDataOption': 'INSERT_ROWS'
      }, {
        'majorDimension': 'ROWS',
        'values': [ [ myId, new Date(), self.sheet, content ] ]
      }).then(cb, function(e){
        console.error(':( Error during log.', err);
        if(err) { err(e); }
      });
    }

    /** Get range for this type, with either one row index (rowIdx) or a max
     * number of rows (limit). Default is all rows. */
    static getRange(model,rowIdx,limit){
      var range,
        firstIdx = Number.MAX_SAFE_INTEGER,
        lastIdx = 0,
        startRow = '2',
        lastRow = '';

      if(rowIdx){
        startRow = String(rowIdx);
        lastRow = String(rowIdx);
      }
      if(limit){
        if(rowIdx) { console.error('limit cannot be used with rowIdx'); }
        else {
          lastRow = String(limit + 1);
        }
      }
      _.forEach(model.metadata, function(meta){
        var i;
        if(meta.col){
          i = letters.indexOf(meta.col);
          if(i < firstIdx){ firstIdx = i; }
          if(i > lastIdx){ lastIdx = i; }
        }
      });
      range = model.sheet + '!' + letters[firstIdx] + startRow +
                    ':' + letters[lastIdx] + lastRow;
      return range;
    }

    static loadFromSheet(model, spreadsheetId, callback){
      var instances = [];
      console.info('Load from gsheet');
      if(!model){
        console.error('Missing model, unable to load data.');
        return [];
      }
      if(!model.sheet){
        console.error('Missing sheet name, unable to load data for:', model.name);
        return [];
      }
      gapi.client.sheets.spreadsheets.values.batchGet({
        'key': apiKey,
        'spreadsheetId': spreadsheetId,
        'ranges': [
          KModel.getRange(model),
          'Avis!A2:E'
        ]
      }).then(function(res) {
        if(res && res.result && res.result.valueRanges){
          var instance,
            instanceMap = {};
          // instances definition
          _.forEach(res.result.valueRanges[0].values, function(row, idx){
            instance = new model();
            instance.setValuesFromRow(idx+2, row);
            instanceMap[row[9]] = instance;
            instances.push(instance);
          });
          // opinions
          _.forEach(res.result.valueRanges[1].values, function(row, idx){
            var instance = instanceMap[row[2]],
              opinion;
            if(instance){
              opinion = new Opinion();
              opinion.setValuesFromRow(idx+2, row);
              instance.setOpinion(opinion);
            }
          });
        }
        callback(null, instances);
      });
    }
  }

  class Place extends KModel {
    constructor(){
      super(Place);
      var self = this;
      self.rate = null;               // Place's rate (average)
      self.rateCnt = 0;             // Place's rate count
      self.commentCnt = 0;    // Place's comments count
      _.assign(self._data, {
        getRate: function(){
          return self.rate ? self.rate + ' / 5' : '?';
        },
        getRateCount: function(){
          return self.rateCnt ? self.rateCnt : 'Aucun';
        },
        getCommentCount: function(){
          if(!self.commentCnt){ return 'Aucun commentaire'; }
          return self.commentCnt +
            ((self.commentCnt > 1) ? ' commentaires' : ' commentaire');
        },
        getComments: function(){
          var str = '';
          _.forEach(self._data.opinions, function(op){
            var comment = op.get('comment');
            if(comment && comment.length){
              str += '<p class="comment">' + comment + '</p>';
            }
          });
          return '<div>' + str + '</div>';
        }
      });
    }

    setOpinion(opinion){
      if(!opinion) { console.error('Invalid opinion value'); return; }
      var self = this,
        opinions = self.get('opinions'),
        idx = _.findIndex(opinions, function(o){    // find opinion for same user
          return o.get('userId') === opinion.get('userId');
        });
      if(!opinions){
        opinions = [];
        self.set('opinions', opinions);
      }
      if(idx >= 0){
        opinions[idx] = opinion;
      } else {
        opinions.push(opinion);
      }
      self.refresh();
    }

    getOpinion(userId){
      return _.find(this.get('opinions'), function(op){
        return op.get('userId') === userId;
      });
    }

    refresh(){
      var self = this,
        opinions = self.get('opinions');
      self.rate = 0;
      self.rateCnt = 0;
      self.commentCnt = 0;
      _.forEach(opinions, function(op){
        var comment = op.get('comment');
        if(op.get('rating') > 0){
          self.rate += parseInt(op.get('rating'));
          self.rateCnt++;
        }
        if(comment && comment.length > 0){
          self.commentCnt++;
        }
      });
      if(self.rateCnt > 0) { self.rate /= self.rateCnt; } else { self.rate = null; }
    }
  }

  Place.type = Place;
  Place.sheet = 'Lieux';
  Place.metadata = [
    { field: 'name', headerName: 'Nom', col: 'A'},
    { field: 'location', headerName: 'Lieu', col: 'B'},
    { field: 'address', col: 'C'}, // , headerName: 'Adresse'
    { field: 'getRate', headerName:'Pertinence de l\'entreprise'},
    { field: 'getRateCount', label:'Nombre d\'avis'},
    { field: 'getComments', headerName:'Commentaires'},
    { field: 'getCommentCount', label:'Nombre de commentaires'},
    { field: 'tutor', headerName:'Tuteur', col: 'D'},
    { field: 'cell', headerName:'Portable', col: 'E'},
    { field: 'phone', headerName:'Fixe', col: 'F'},
    { field: 'fax', col: 'G'}, // , headerName:'Fax'
    { field: 'type', headerName:'Type', col: 'H'},
    { field: 'email', col: 'I'}, //, headerName:'E-mail'
    { field: 'id', col: 'J'},
    { field: 'opinions', array: 'Opinion'}
  ];

  class Opinion extends KModel {
    constructor(){
      super(Opinion);
    }
  }

  Opinion.type = Opinion;
  Opinion.sheet = 'Avis';
  Opinion.metadata = [
    { field: 'userId', col: 'A'},
    { field: 'date', col: 'B'},
    { field: 'placeId', col: 'C'},
    { field: 'rating', col: 'D'},
    { field: 'comment', col: 'E'},
  ];

  // # View
  function Overlay() {
      var self = this,
        overlayElt= $('#overlay'),
        origin = null,                          // Original model
        model = null,                         // current data
        editElt = null,                         // current edition element
        originOpinion = null,              // Original user opinion
        opinion = null;                        // user opinion

    $('#myrating').click(function(){
      edit('#myrating');
    });
    $('#mycomment').click(function(){
      edit('#mycomment');
    });
    overlayElt.find('[lds-text-edit]').click(function(evt){
      toggleEltEdit($(evt.target));
      evt.stopPropagation();
    });
    overlayElt.find('.alert .close').click(function(evt){
      overlayElt.find('.alert').slideUp();
    });
    overlayElt.click(function(){
      var last;
      if(editElt){
        last = editElt;
        editElt = null;
        toggleEltEdit(last);
      }
    });

    function toggleTextEdit(elt, field){
      if(!myId) {
        overlayElt.find('.alert').slideDown();
        setTimeout(function(){
          overlayElt.find('.alert').slideUp();
        }, 5000);
        return;
      }
      var oldVal = model.get(field),
        newVal, input, last;
      if(elt.hasClass('edit')){
        input = elt.find('input');
        newVal = input.val();
        if(newVal !== oldVal){
          model.set(field, newVal);
        }
        elt.removeClass('edit');
        elt.html(newVal);
      } else {
        if(editElt){
          last = editElt;
          editElt = null;
          toggleEltEdit(last);
        }
        input = $('<input type="text" class="form-control"></input>');
        input.val(oldVal);
        input.keydown(function(e){
          if(e.keyCode === 9){ e.preventDefault(); }    // Tab
        });
        input.keyup(function(e){
          var elts;
          if(e.keyCode === 9){                                      // Tab
            toggleEltEdit(elt);
            elts = overlayElt.find('[lds-text-edit]');
            _.findIndex(elts, function(e){
              console.info(e);
              return false;
            });
          }
          if(e.keyCode === 13){ toggleEltEdit(elt); }     // Return
        });
        editElt = elt;
        elt.addClass('edit');
        elt.html(input);
        input.focus();
      }
    }

    function displayRating(elt){
      elt = elt || overlayElt.find('#myrating');
      if(opinion.get('rating')){
        elt.html(opinion.get('rating') + ' / 5');
      } else {
        elt.html('Aucun avis');
      }
    }

    function displayComment(elt){
      elt = elt || overlayElt.find('#mycomment');
      var comment = opinion.get('comment');
      if(comment && comment.length){
        elt.html(comment);
      } else {
        elt.html('Aucun commentaire');
      }
    }

    function toggleEltEdit(elt){
      if(!elt) { return; }
      var field = elt.attr('lds-text-edit'),
        last;

      if(field){ toggleTextEdit(elt, field); }
      else {
        let closeElt,
          content;
        if(elt[0] === overlayElt.find('#myrating')[0]){
          if(elt.hasClass('edit')){
            if(editElt){
              last = editElt;
              editElt = null;
              toggleEltEdit(last);
            }
            elt.removeClass('edit');
            displayRating(elt);
          } else {
            elt.addClass('edit');
            content = $('<div class="rating"></div>');
            _.times(5, function(idx){
              var star = $('<span>☆</span>');
              star.click(function(evt){
                opinion.set('rating', String(idx+1));
                toggleEltEdit(elt);
                evt.stopPropagation();
              });
              content.prepend(star);
            });
            elt.html(content);
            closeElt = $('<i class="fa fa-close pull-right"></i>');
            closeElt.click(function(evt){
              toggleEltEdit(elt);
              evt.stopPropagation();
            });
            content.before(closeElt);
          }
        } else if(elt[0] === overlayElt.find('#mycomment')[0]){
          if(elt.hasClass('edit')){
            let comment = elt.find('textarea').val();
            opinion.set('comment', comment);
            elt.removeClass('edit');
            displayComment(elt);
          } else {
            if(editElt){
              last = editElt;
              editElt = null;
              toggleEltEdit(last);
            }
            elt.addClass('edit');
            elt.html('<textarea class="form-control" cols="40" rows="6">' +
                         (opinion.get('comment') || '')  + '</textarea>');
            closeElt = $('<i class="fa fa-close pull-right"></i>');
            closeElt.click(function(evt){
              toggleEltEdit(elt);
              evt.stopPropagation();
            });
            elt.append(closeElt);
            elt.find('textarea').focus();
          }
        }
      }
    }

    self.setData = function(keys, data){
      var opinions, list;
      if(data){
        origin = data;
        model = origin.clone();
        originOpinion = origin.getOpinion(myId);
        if(originOpinion) {
          opinion = originOpinion.clone();
        }
      } else {
        model = new Place();
        model.set('id', genUid(32));
        _.forEach(keys, function(key){
          if(key.field){ model[key.field] = null; }
        });
      }
      if(!opinion){
        opinion = new Opinion();
        opinion.set('userId', myId);
        opinion.set('date', new Date());
        opinion.set('placeId', model.get('id'));
      }
      _.forEach(keys, function(key){
        var val = model.get(key.field) || key.headerName;
        overlayElt.find('.' + key.field).html(val);
      });
      opinions = model.get('opinions');
      list = overlayElt.find('.comments');
      list.empty();
      _.forEach(opinions, function(op){
        var content,
          comment = op.get('comment');
        if(comment && comment.length){
          content = '<div class="comment"><div class="date">' +
            moment(op.get('date')).format('Do MMMM YYYY') +
            '</div><div class="text">' +
            comment +
            '</div></div>';
          list.append(content);
        }
      });
      displayRating();
      displayComment();
      model.onUpdate(refreshButtons);
      opinion.onUpdate(refreshButtons);
    };

    self.show = function(){
      overlayElt.addClass('enabled');
      // lock scroll
      $('body').css({'overflow':'hidden'});
      $(document).bind('scroll',function () {
        window.scrollTo(0,0);
      });
    };

    self.close = function(){
      overlayElt.find('.buttons .close').show();
      overlayElt.find('.buttons .btn').hide();
      if(editElt) { toggleEltEdit(editElt); }
      editElt = null;
      opinion = null;
      $(document).unbind('scroll');
      $('body').css({'overflow':'visible'});
      $('#overlay').removeClass('enabled');
    };

    self.save = function(){
      function saveModel(cb){
        if(model.eq(origin)){ return cb(); }
        model.save(null, function(){
          console.info('Place saved');
          if(origin){
            origin.setValuesFromModel(model);
          }
          cb();
        });
      }
      function saveOpinion(cb){
        if(opinion.eq(originOpinion)){ return cb(); }
        opinion.save(null, function(){
          console.info('Opinion saved');
          if(originOpinion){
            originOpinion.setValuesFromModel(opinion);
          } else {
            // Add new opinion to place
            if(origin){
              origin.setOpinion(opinion);
            }
          }
          if(origin){ origin.refresh(); }
          cb();
        });
      }
      saveModel(()=>{
        saveOpinion(()=>{
          mainTable.refresh();
          self.close();
        });
      });
    };

    function edit(eltQuery){
      var elt = $(eltQuery);
      if(editElt && editElt[0] === elt[0]){
        editElt = null;
      } else {
        editElt = elt;
      }
    }

    function refreshButtons(){
      var same = model.eq(origin),
        osame = opinion.eq(originOpinion);
      if(same && osame){
        overlayElt.find('.buttons .btn').hide();
        overlayElt.find('.buttons .close').show();
      } else {
        overlayElt.find('.buttons .close').hide();
        overlayElt.find('.buttons .btn').show();
      }
    }
  } // [/ Overlay ]

  class Table {
    constructor(parentTable, columns, data){
      this._parentTable = parentTable;
      this.columns = columns;
      this.data = data;
      this._sort = {
        field: null,
        asc: true
      };
    }

    orderBy(column){
      var self = this,
        hCol = $('.h-column-' + column.field);
      if(self._sort.field === column.field){
        self._sort.asc = !self._sort.asc;
      } else {
        if(self._sort.field){
          $('.h-column-' + self._sort.field).removeClass('sorted');
        }
        self._sort.field = column.field;
        self._sort.asc = true;
        hCol.addClass('sorted');
      }
      if(self._sort.asc){
        hCol.removeClass('desc');
      } else {
        hCol.addClass('desc');
      }
      self.data.sort(function(a,b) {
        var av = a.get(column.field),
          bv = b.get(column.field),
          res = 0;
          if(typeof(av) === 'string'){
            res = av.localeCompare(bv);
          } else {
            res = av - bv;
          }
          return res * (self._sort.asc ? 1: -1);
      });
      self.refresh();
    }

    display(){
      var self = this,
        header = $('<thead></thead>'),
        row = $('<tr></tr>');
      _.forEach(this.columns, function(column){
        var th;
        if(column.headerName && column.visible !== false){
          th = $('<th class="h-column-' +column.field + '">' + column.headerName + '</th>');
          th.click(function(){
            self.orderBy(column);
          });
          row.append(th);
        }
      });
      header.append(row);
      this._parentTable.html(header);
      this.refresh();
    }


    refresh(){
      var self = this,
        body = $('<tbody></tbody>'),
        body0 = self._parentTable.find('tbody');

      _.forEach(self.data, function(place){
        var row = $('<tr></tr>');
        row.click(function(){
          overlay.setData(self.columns, place);
          overlay.show();
        });
        _.forEach(self.columns, function(col){
          if(!col.headerName || col.visible === false){ return; }
          var cell = $('<td class="'+ col.field +'"></td>'),
            val = place.get(col.field);
          if(val){ cell.html(val); }
          row.append(cell);
        });
        body.append(row);
      });
      if(!body0.length) {        // if body doesn't exists yet
        self._parentTable.append(body);
      } else {
        body0.replaceWith(body);
      }
    }
  }

  // Updates login status
  function updateSigninStatus(isSignedIn) {
    var navbar = $('.lds-header');
    if(isSignedIn){
      navbar.find('.lds-connect').hide();
      $('.lds-needuser').show();
      var user = gapi.auth2.getAuthInstance().currentUser.get(),
        profile = user.getBasicProfile();
      myId = user.getId();
      navbar.find('.userimg').attr('src', profile.getImageUrl());
      navbar.find('.username').html(profile.getName());
    } else {
      navbar.find('.lds-connect').show();
      $('.lds-needuser').hide();
      navbar.find('.userimg').attr('src', '');
      navbar.find('.username').html('');
    }
  }

  // Hides main loading status
  function loadingDone(){
    $('#loading-status').hide();
  }

  // # Utils
  function genUid(length){
      var i, text = '',
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      length = length || 8;
      for(i=0; i < length; i++){
        text += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return text;
  }

  function initGapi(callback) {
    gapi.load('client:auth2', function () {
      // Initialize the client with API key and People API, and initialize OAuth with an
      // OAuth 2.0 client ID and scopes (space delimited string) to request access.
      gapi.client.init({
          'discoveryDocs': discoveryDocs,
          'clientId': clientId,
          'scope': scopes
      }).then(function () {
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        // Handle the initial sign-in state.
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        callback();
      });
    });
  }

  function signin(){
    gapi.auth2.getAuthInstance().signIn();
  }

  function signout(){
    gapi.auth2.getAuthInstance().signOut();
  }

  window.onload = function(){

    initGapi(function(){
      KModel.loadFromSheet(Place, spreadsheetId, function(err, places){
        if(err) { console.error(err); }

        var tableElt = $('#places');
        mainTable = new Table(tableElt, Place.metadata, places);
        mainTable.display();
        tableElt.resizableColumns();

        function newPlace(){
          overlay.setData(Place.metadata, null);
          overlay.show();
        }

        overlay = new Overlay();
        window.LDS = {
          'closeOverlay': overlay.close,
          'newPlace': newPlace,
          'saveOverlay': overlay.save,
          'signout': signout,
          'signin': signin
        };

        loadingDone();
      });
    });
  };
})();