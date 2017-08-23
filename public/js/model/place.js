import _ from 'lodash';

import {KModel} from '../core/kmodel.js';
import {Opinion} from './opinion.js';

export class Place extends KModel {
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
  { field: 'location', headerName: 'Lieu', col: 'B',
     values: ['','Centre','Mamoudzou','Nord','Petite-Terre','Sud']},
  { field: 'address', col: 'C'}, // , headerName: 'Adresse'
  { field: 'getRate', headerName:'Pertinence de l\'entreprise'},
  { field: 'getRateCount', label:'Nombre d\'avis'},
  { field: 'getComments', headerName:'Commentaires'},
  { field: 'getCommentCount', label:'Nombre de commentaires'},
  { field: 'tutor', headerName:'Tuteur', col: 'D'},
  { field: 'cell', headerName:'Portable', col: 'E'},
  { field: 'phone', headerName:'Fixe', col: 'F'},
  { field: 'fax', col: 'G'}, // , headerName:'Fax'
  { field: 'type', headerName:'Type', col: 'H',
     values: ['','Boulangerie', 'Restaurant', 'Traiteur']},
  { field: 'email', col: 'I'}, //, headerName:'E-mail'
  { field: 'id', col: 'J'},
  { field: 'opinions', array: 'Opinion', type: Opinion}
];
