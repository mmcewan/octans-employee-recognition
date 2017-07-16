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
