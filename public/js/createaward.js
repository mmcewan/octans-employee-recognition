
  //    document.addEventListener('DOMContentLoaded', bindLogInButton);
      document.addEventListener('DOMContentLoaded', dropDown);
  /*
      function bindLogInButton(){
        document.getElementById('awardButton').addEventListener('click', function(event){
          event.preventDefault();
          var req = new XMLHttpRequest();
          var payload = {agiver:null, areceiver:null, atitle:null, amessage:null, adate:null, aemail:null, atype:null};
          
          payload.agiver = document.getElementById('agiver').value;
          payload.areceiver = document.getElementById('areceiver').value;
          payload.amessage = document.getElementById('amessage').value;
          payload.adate = document.getElementById('adate').value;
          payload.aemail = document.getElementById('aemail').value;
          payload.atype = document.getElementById('alist').value;
          payload.atitle = document.getElementById('atitle').value;
          
          req.open('POST', '/new_award', true);
          req.setRequestHeader('Content-Type', 'application/json');
       
          req.addEventListener('load',function(){
      		if(req.status >= 200 && req.status < 400){
      		    window.location.href="makeaward";
      		}
      		});
      		
          req.send(JSON.stringify(payload));  
        }); 
      }
      */

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