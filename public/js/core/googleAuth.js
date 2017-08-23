
import {constants} from '../constants.js';

export var googleAuth = {
  myId: null,
  signin: function(){
    gapi.auth2.getAuthInstance().signIn();
  },
  signout: function(){
    gapi.auth2.getAuthInstance().signOut();
  },
  init: function(updateSigninStatusCb, callback) {
    console.info('here', typeof(gapi));
    gapi.load('client:auth2', function () {
      // Initialize the client with API key and People API, and initialize OAuth with an
      // OAuth 2.0 client ID and scopes (space delimited string) to request access.
      gapi.client.init({
          'discoveryDocs': constants.discoveryDocs,
          'clientId': constants.clientId,
          'scope': constants.scopes
      }).then(function () {
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatusCb);
        // Handle the initial sign-in state.
        updateSigninStatusCb(gapi.auth2.getAuthInstance().isSignedIn.get());
        callback();
      });
    });
  }
};