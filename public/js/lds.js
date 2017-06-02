(function(){
  'use strict';

//   var clientId = '61423845060-c7ttllntmklka9r516vf118v45jskh93.apps.googleusercontent.com',
//     scopes = 'https://spreadsheets.google.com/feeds';

//   window.init = function() {
//     gapi.auth.authorize(
//         {client_id: clientId, scope: scopes, immediate: false},
//         handleAuthResult);
//   }

//   window.handleAuthResult = function(authResult) {
//     console.warn('there');
//     var authorizeButton = document.getElementById('authorize-button');
//     if (authResult && !authResult.error) {
//       authorizeButton.style.visibility = 'hidden';
//       makeApiCall();
//     } else {
//       authorizeButton.style.visibility = '';
//       authorizeButton.onclick = handleAuthClick;
//     }
//   }

//   function handleAuthClick(event) {
//     gapi.auth.authorize(
//         {client_id: clientId, scope: scopes, immediate: false},
//         handleAuthResult);
//     return false;
//   }

//   function makeApiCall() {
//   var tqUrl = 'https://docs.google.com/spreadsheets' +
//       '/d/1uDAlb1t3MKqzODuFhWZ2hjD-fEIqlvUv0AMd5wygLmU/gviz/tq' +
// //      '?tq=select%20A%2C%20B%20group%20by%20B' +
//       '?tqx=responseHandler:handleTqResponse' +
//       '&access_token=' + encodeURIComponent(gapi.auth.getToken().access_token);

//     document.write('<script src="' + tqUrl +'" type="text/javascript"></script>');
//   }

//   window.handleTqResponse = function(resp) {
//     document.write(JSON.stringify(resp));
//   }


  // google.charts.load('current', { packages: ['corechart'] });
  // google.charts.setOnLoadCallback(displaySheet);

  // function displaySheet() {
  //   var query = new google.visualization.Query("https://docs.google.com/spreadsheets/d/1uDAlb1t3MKqzODuFhWZ2hjD-fEIqlvUv0AMd5wygLmU");
  //   query.setQuery('select A, B group by B');
  //   query.send(function(){
  //     console.info('here');
  //   });
  //   https://docs.google.com/spreadsheets/d/1uDAlb1t3MKqzODuFhWZ2hjD-fEIqlvUv0AMd5wygLmU/gviz/tq?tq=select%20A%2C%20B%20group%20by%20B
  //   $('#myPieChart').html('<div>' +  encodeURIComponent('select A, B group by B') + '</div>');
  // }

  window.onload = function(){
    // i18n
    var catalog,
      keys;
    if(window.LANG && window.LANG.fr){
      catalog = window.LANG.fr;
      keys = Object.keys(catalog);
      $('[translate]').each(function(idx, elt){
        var text = $(elt).text().trim();
        if(!catalog[text]){
          console.log('Translation not found:', text);
        } else {
          $(elt).text(catalog[text]);
          if(keys.indexOf(text) > -1){
            keys.splice(keys.indexOf(text), 1);
          }
        }
      });
      if(keys.length){
        console.warn('Unused translation keys', keys);
      }
    }
  };
})();