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
    var base64img = signaturePad.toDataURL();
    $('#sigData').val(base64img);
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

// Adjust canvas coordinate space taking into account pixel ratio,
// to make it look crisp on mobile devices.
// This also causes canvas to be cleared.
function resizeCanvas() {
    // When zoomed out to less than 100%, for some very strange reason,
    // some browsers report devicePixelRatio as less than 1
    // and only part of the canvas is cleared then.
    var ratio =  Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
}

window.onresize = resizeCanvas;
resizeCanvas();

var signaturePad = new SignaturePad(canvas);
