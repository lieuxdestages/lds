import $ from 'jquery';
import _ from 'lodash';

import {constants} from './constants.js';
import {googleAuth} from './core/googleAuth.js';
import {KModel} from './core/kmodel.js';
import {User} from './model/user.js';
import {Place} from './model/place.js';
import {Overlay} from './ui/overlay.js';
import {Table} from './ui/table.js';

// Updates login status
function updateSigninStatus(isSignedIn) {
  var navbar = $('.lds-header');
  if(isSignedIn){
    navbar.find('.lds-connect').hide();
    $('.lds-needuser').show();
    var user = gapi.auth2.getAuthInstance().currentUser.get(),
      profile = user.getBasicProfile();
    googleAuth.myId = user.getId();
    navbar.find('.userimg').attr('src', profile.getImageUrl());
    navbar.find('.username').html(profile.getName());
    updateUsersList(profile);
  } else {
    navbar.find('.lds-connect').show();
    $('.lds-needuser').hide();
    googleAuth.myId = null;
    navbar.find('.userimg').attr('src', '');
    navbar.find('.username').html('');
  }
}

// Create or updates current user info
function updateUsersList(profile){
  var guser, user, name,
    save = false;
  // if userList already loaded
  if(constants.usersList && googleAuth.myId){
    if(!profile){
      guser = gapi.auth2.getAuthInstance().currentUser.get();
      profile = guser.getBasicProfile();
    }
    if(profile){
      name = profile.getName();
      user = _.find(constants.usersList, function(u){ return u.get('id') === googleAuth.myId; });
      if(!user){
        user = new User();
        user.set('id', googleAuth.myId);
        user.set('type', 'Cuisine');
        user.set('name', name);
        constants.usersList.push(user);
        save = true;
      } else {
        // if name has changed
        if(user.get('name') !== name){
          user.set('name', name);
          save = true;
        }
      }
      if(save){
        user.save(function(err){
          var body;
          if(err && err.body){
            body = JSON.parse(err.body);
            if(body.error && body.error.code === 403){
              $('#main-alert').slideDown();
              $('#main-alert button.close').click(function(){
                $('#main-alert').slideUp();
                $('#main-alert .alert-content').html('');
              });
              $('#main-alert .alert-content').html('Le compte ' + name + ' n\'est pas autorisé à modifier la liste. Demander à Mme Labrousse pour y avoir accès.');
              googleAuth.signout();
            }
          }
        });
      }
    }
  }
}

// Hides main loading status
function loadingDone(){
  $('#loading-status').hide();
}

function showDropMenu(){
  $('.drop-menu ul').toggle();
}

window.onload = function(){
  googleAuth.init(updateSigninStatus, function(){
    KModel.loadFromSheet(User, constants.spreadsheetId, function(err, users){
      if(err) { console.error(err); }
      constants.usersList = users;
      updateUsersList();
      KModel.loadFromSheet(Place, constants.spreadsheetId, function(err, places){
        if(err) { console.error(err); }

        var tableElt = $('#places');
        constants.mainTable = new Table(tableElt, Place.metadata, places);
        constants.mainTable.display();
        // tableElt.resizableColumns({ store: store });

        function newPlace(){
          constants.overlay.setData(Place.metadata, null);
          constants.overlay.show();
          $('.drop-menu ul').hide();
        }

        constants.overlay = new Overlay();
        window.LDS = {
          'closeOverlay': constants.overlay.close,
          'newPlace': newPlace,
          'saveOverlay': constants.overlay.save,
          'showDropMenu': showDropMenu,
          'signout': googleAuth.signout,
          'signin': googleAuth.signin
        };

        loadingDone();
      });
    });
  });
};
