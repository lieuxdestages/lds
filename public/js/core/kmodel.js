import _ from 'lodash';
import {constants} from '../constants.js';
import {googleAuth} from './googleAuth.js';


const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class KModel {
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
        'spreadsheetId': constants.spreadsheetId,
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
        'spreadsheetId': constants.spreadsheetId,
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
      'spreadsheetId': constants.spreadsheetId,
      'range': 'Log!A1:D1',
      'valueInputOption': 'RAW',
      'insertDataOption': 'INSERT_ROWS'
    }, {
      'majorDimension': 'ROWS',
      'values': [ [ googleAuth.myId, new Date(), self.sheet, content ] ]
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
    var instances = [],
      ranges = [],
      types = [model],
      names = [null];
    if(!model){
      console.error('Missing model, unable to load data.');
      return [];
    }
    if(!model.sheet){
      console.error('Missing sheet name, unable to load data for:', model.name);
      return [];
    }
    ranges.push(KModel.getRange(model));
    _.forEach(model.metadata, function(meta){
      var range;
      if(meta.type){
        range = KModel.getRange(meta.type);
        ranges.push(range);
        types.push(meta.type);
        names.push(meta.array ? meta.array : meta.field);
      }
    });
    gapi.client.sheets.spreadsheets.values.batchGet({
      'key': constants.apiKey,
      'spreadsheetId': spreadsheetId,
      'ranges': ranges
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
        // sub elements
        if(res.result.valueRanges[1]){
          _.forEach(res.result.valueRanges[1].values, function(row, idx){
            var instance = instanceMap[row[2]],
              subElt;
            if(instance){
              subElt = new types[1]();
              subElt.setValuesFromRow(idx+2, row);
              instance['set' + names[1]](subElt);
            }
          });
        }
      }
      callback(null, instances);
    });
  }
}
