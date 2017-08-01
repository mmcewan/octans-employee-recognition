
      document.addEventListener('DOMContentLoaded', addNavButtons);
      
      
      function addNavButtons(){
            var menu = document.getElementById("menulinks"); 
            var req = new XMLHttpRequest();
          		req.open("GET", "/logged_status", true);
          		req.setRequestHeader('Content-Type', 'application/json');
          		req.addEventListener("load", function(){
          			if(req.status >= 200 && req.status < 400){
              			var user_status = req.responseText;
              			if(user_status == 'true'){
			    	        var logoutitem = document.createElement("li"); 
	            			var logoutlink = document.createElement("a"); 
    			        	logoutlink.text = "Log Out";
				            logoutlink.href = "/logout";
				            logoutitem.appendChild(logoutlink);
				            menu.appendChild(logoutitem);
                  			}
              			}
		            else {
    		        console.log("Error");
           				}
		          });
        		req.send();  
			}