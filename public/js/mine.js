$( document ).ready(function() {

  $('.signup-button').click(function() {
    $.get("/signup", function(data) {
      $("#content").html(data);
    });
    event.preventDefault();
  });

  $('.login-button').click(function() {
    $.get("/login", function(data) {
      $("#content").html(data);
    });
    event.preventDefault();
  });
  
});
