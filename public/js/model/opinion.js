
import {KModel} from '../core/kmodel.js';

export class Opinion extends KModel {
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
  { field: 'comment', col: 'E'}
];
