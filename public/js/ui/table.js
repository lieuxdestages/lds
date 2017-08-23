import _ from 'lodash';
import $ from 'jquery';

import {constants} from '../constants.js';

export class Table {
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
      firstColumn = null,
      header = $('<thead></thead>'),
      row = $('<tr></tr>');
    _.forEach(this.columns, function(column){
      var th;
      if(!firstColumn) { firstColumn = column; }
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
    this.orderBy(firstColumn);
  }


  refresh(){
    var self = this,
      body = $('<tbody></tbody>'),
      body0 = self._parentTable.find('tbody');

    _.forEach(self.data, function(place){
      var row = $('<tr></tr>');
      row.click(function(){
        constants.overlay.setData(self.columns, place);
        constants.overlay.show();
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