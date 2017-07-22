
      document.addEventListener('DOMContentLoaded', bindLogInButton);
      document.addEventListener('DOMContentLoaded', dropDown);
  
      function bindLogInButton(){
        document.getElementById('loginButton').addEventListener('click', function(event){
          event.preventDefault();
          var req = new XMLHttpRequest();
          var payload = {username:null, password:null};
          
          payload.username = document.getElementById('lusername').value;
          payload.password = document.getElementById('lpassword').value;
          
          req.open('POST', '/auth', true);
          req.setRequestHeader('Content-Type', 'application/json');
          req.addEventListener('load',function(){
      		if(req.status >= 200 && req.status < 400){
      		    window.location.href="/";
      		} else {
      		    var a = document.getElementById("loginResult"); 
              var b = document.createElement("a"); 
                b.href = "/";
                b.text = "Log in failed. Try again.";
                a.appendChild(b);
                console.log("Error in network request: " + req.statusText);
     			 }});
          req.send(JSON.stringify(payload));  
        }); 
      }

      function dropDown(){
          var req = new XMLHttpRequest();
          req.open("GET", "/awards/list", true);
          req.setRequestHeader('Content-Type', 'application/json');
          req.addEventListener("load", function(){
            if(req.status >= 200 && req.status < 400){
              
              var response = JSON.parse(req.responseText);
                  
                  for (var i in response){ 
                    
                    var a = document.getElementById("alist"); 
                    var b = document.createElement("option"); 
                    b.text = response[i].description;
                    b.value = response[i].id;
                    a.appendChild(b);
                  }
              }
            else {
            console.log("Error");
            }
          });
          req.send();  
      }