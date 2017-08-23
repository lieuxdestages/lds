import _ from 'lodash';
import $ from 'jquery';
import moment from 'moment';
import 'moment/locale/fr';

import {constants} from '../constants.js';
import {googleAuth} from '../core/googleAuth.js';
import {Opinion} from '../model/opinion.js';
import {Place} from '../model/place.js';

export function Overlay() {
    var self = this,
      overlayElt= $('#overlay'),
      origin = null,                          // Original model
      model = null,                         // current data
      editElt = null,                         // current edition element
      originOpinion = null,              // Original user opinion
      opinion = null,                        // user opinion
      saving = false;

  $('#myrating').click(function(){
    edit('#myrating');
  });
  $('#mycomment').click(function(){
    edit('#mycomment');
  });
  overlayElt.find('[lds-text-edit], [lds-select-edit]').click(function(evt){
    toggleEltEdit($(evt.target));
    evt.stopPropagation();
  });
  overlayElt.find('.alert .close').click(function(){
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

  function buildTextInput(model, field){
    var input = $('<input type="text" class="form-control"></input>');
      input.val(model.get(field));
      input.keydown(function(){
        // if(e.keyCode === 9){ e.preventDefault(); }    // Tab
      });
      input.keyup(function(){
        // var elts, idx;
        // if(e.keyCode === 9){                                      // Tab
          // toggleEltEdit(elt);
          // elts = overlayElt.find('[lds-text-edit]');
          // idx = _.findIndex(elts, function(editElt){
          //   return (elt[0] === editElt);
          // }) + 1;
          // if(idx > 0){
          //   if(idx === elts.length) { idx = 0; }
          //   console.info(idx, elts[idx]);
          //   toggleEltEdit($(elts[idx]));
          //   // e.preventDefault();
          // }
        // }
        // if(e.keyCode === 13){ toggleEltEdit(elt, field); }     // Return
        // else {
          var newVal = input.val();
          model.set(field, newVal);
        // }
      });
    // }
    return input;
  }

  function buildSelectInput(model, field){
    var input = null,
      meta = _.find(model.metadata, (m) => { return m.field === field; });
    if(meta.values){
      input = $('<select id="'+ field + '"></select>');
      _.forEach(meta.values, function(value){
        $('<option value="'+ value +'">' + value + '</option>').appendTo(input);
      });
      input.val(model.get(field));
      input.change(function(){
        model.set(field, input.val());
      });
    }
    return input;
  }

  function toggleEdit(inputFactory, elt, field){
    if(!googleAuth.myId) {
      overlayElt.find('.alert').slideDown();
      setTimeout(function(){
        overlayElt.find('.alert').slideUp();
      }, 5000);
      return;
    }
    var oldVal = model.get(field),
      newVal, input, last;
    if(elt.hasClass('edit')){
      input = elt.find('input, select');
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
      input = inputFactory(model, field);
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
      select = elt.attr('lds-select-edit'),
      last;

    if(field){ toggleEdit(buildTextInput, elt, field); }
    else if(select){ toggleEdit(buildSelectInput, elt, select); }
    else {
      let closeElt,
        content,
        textAreaElt;
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
          textAreaElt = $('<textarea class="form-control" cols="40" rows="6">' +
                       (opinion.get('comment') || '')  + '</textarea>');
          textAreaElt.keyup(function(){
            var newVal = textAreaElt.val();
            opinion.set('comment', newVal);
          });
          elt.empty();
          elt.append(textAreaElt);
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
      originOpinion = origin.getOpinion(googleAuth.myId);
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
      opinion.set('userId', googleAuth.myId);
      opinion.set('date', new Date());
      opinion.set('placeId', model.get('id'));
      originOpinion = opinion.clone();
    }
    _.forEach(keys, function(key){
      var val = model.get(key.field) || key.headerName;
      overlayElt.find('.' + key.field).html(_.isUndefined(val) ? '' : val);
    });
    opinions = model.get('opinions');
    list = overlayElt.find('.comments');
    list.empty();
    _.forEach(opinions, function(op){
      var content, name,
        comment = op.get('comment');
      _.find(constants.usersList, function(u) {
        if(u.get('id') === op.get('userId')){
          name = u.get('name');
          return true;
        }
      });
      if(comment && comment.length){
        content = '<div class="comment">' +
          '<div class="date">' +
          moment(op.get('date')).format('Do MMMM YYYY') +
          '</div>' +
          '<div class="name">' +
          name +
          '</div>' +
          '<div class="text">' +
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
    refreshButtons();
    // lock scroll
    $('body').css({'overflow':'hidden'});
    $(document).bind('scroll',function () {
      window.scrollTo(0,0);
    });
  };

  self.close = function(){
    overlayElt.find('.buttons .close').show();
    overlayElt.find('.buttons .btn').hide();
    saving = false;
    if(editElt) { toggleEltEdit(editElt); }
    editElt = null;
    opinion = null;
    overlayElt.find('.edit').removeClass('edit');
    $(document).unbind('scroll');
    $('body').css({'overflow':'visible'});
    $('#overlay').removeClass('enabled');
  };

  self.save = function(){
    saving = true;
    refreshButtons();
    function saveModel(cb){
      if(model.eq(origin)){ return cb(); }
      model.save(null, function(){
        console.info('Place saved', model);
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
        }
        if(origin){
          origin.setOpinion(opinion);
          origin.refresh();     // Compute new avg rate
        }
        cb();
      });
    }
    saveModel(()=>{
      saveOpinion(()=>{
        constants.mainTable.refresh();
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
    if(saving){
      overlayElt.find('.buttons .btn').hide();
      overlayElt.find('.buttons .close').hide();
      overlayElt.find('.buttons .saving').show();
    } else if(same && osame){
      overlayElt.find('.buttons .btn').hide();
      overlayElt.find('.buttons .saving').hide();
      overlayElt.find('.buttons .close').show();
    } else {
      overlayElt.find('.buttons .close').hide();
      overlayElt.find('.buttons .saving').hide();
      overlayElt.find('.buttons .btn').show();
    }
  }
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
