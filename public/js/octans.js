$( document ).ready(function() {

  $('.signup-button').click(function() {
    $.get("/signup", function(data) {
      $("#content").html(data);
    });
  });

  $('.login-button').click(function() {
    $.get("/login", function(data) {
      $("#content").html(data);
    });
  });

  $('#password').change(validatePasword);
  $('#confirm-password').change(validatePasword);

  $('#clearButton').click(function() {
    signaturePad.clear();
  });

  $('#complete-registration').click(function() {
    if (signaturePad.isEmpty()) {
      $('#complete-registration').get(0).setCustomValidity("Your signature is required to complete registration.");
    } else {
      var base64img = signaturePad.toDataURL();
      $('#sigData').val(base64img);
    }
  });

});

// custom validation to ensure password and confirm password fields match
function validatePasword() {
  var p1 = $('#password').val();
  var p2 = $('#confirm-password').val();
  if (p1 != p2) {
    $('#confirm-password').get(0).setCustomValidity("Passwords do not match.");
  }
  else {
    $('#confirm-password').get(0).setCustomValidity('');
  }
}

var canvas = document.getElementById("signature-wrapper").querySelector("canvas");
var signaturePad = new SignaturePad(canvas);
