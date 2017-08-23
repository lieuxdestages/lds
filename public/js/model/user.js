import {KModel} from '../core/kmodel.js';

export class User extends KModel {
  constructor(){
    super(User);
  }
}

User.type = User;
User.sheet = 'Users';
User.metadata = [
  { field: 'id', col: 'A'},
  { field: 'type', col: 'B'},
  { field: 'name', col: 'C'}
];