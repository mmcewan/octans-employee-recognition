
      document.addEventListener('DOMContentLoaded', bindLogInButton);
      document.addEventListener('DOMContentLoaded', typedropDown);
      document.addEventListener('DOMContentLoaded', userdropDown);

      function bindLogInButton(){
        document.getElementById('awardButton').addEventListener('click', function(event){
          event.preventDefault();
          var req = new XMLHttpRequest();
          var payload = {agiver:null, areceiver:null, atitle:null, amessage:null, adate:null, aemail:null, atype:null};
          
          payload.areceiver = document.getElementById('areceiver').value;
          payload.amessage = document.getElementById('amessage').value;
          payload.atype = document.getElementById('alist').value;
          
          req.open('POST', '/new_award', true);
          req.setRequestHeader('Content-Type', 'application/json');
          req.addEventListener('load', function(){
                var response = JSON.parse(req.responseText);
                console.log(response);});
          req.send(JSON.stringify(payload));  
        }); 
      }


//populate award type drop down menu
      function typedropDown(){
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
      
//populate award recipient options drop down menu
      function userdropDown(){
          var req = new XMLHttpRequest();
          req.open("GET", "/users/list", true);
          req.setRequestHeader('Content-Type', 'application/json');
          req.addEventListener("load", function(){
            if(req.status >= 200 && req.status < 400){
              
              var response = JSON.parse(req.responseText);
                  
                  for (var i in response){ 
                    
                    var a = document.getElementById("areceiver"); 
                    var b = document.createElement("option"); 
                    var user_description_text = response[i].firstname + " " + response[i].lastname + " (" + response[i].email_address + ")";
                    b.text = user_description_text;
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
      