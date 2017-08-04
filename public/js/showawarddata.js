

document.addEventListener('DOMContentLoaded', createChart);

//create award chart
      function createChart(){
            var myChart = document.getElementById("myChart"); 
            var num_edu = document.getElementById("num_edu"); 
            var num_inno = document.getElementById("num_inno"); 
            var num_ins = document.getElementById("num_ins"); 
            var num_team = document.getElementById("num_team"); 
            var num_ty = document.getElementById("num_ty");

			
			var edu=num_edu.value, inno=num_inno.value, ins=num_ins.value, team=num_team.value, ty=num_ty.value;
			var ctx = document.getElementById("myChart").getContext('2d');
			   var chart = new Chart(ctx,  {
					type: 'bar',
					data: {
						labels: ["Education", "Innovation", "Inspiration", "Teamwork", "Appreciation"],
						datasets: [{
							label: 'Number of Awards',
							backgroundColor: 'rgba(255,99,132,0.2)',
							borderColor: 'rgba(255,99,132,1)',
							borderWidth: 2,
							hoverBackgroundColor: 'rgba(255,99,132,0.6)',
							hoverBorderColor: 'rgba(255,99,132,1)',
							data: [edu, inno, ins, team, ty],
						}],
					},
					options: {
						responsive: false,
						title: { 
							display: true,
							text: "Types of Awards Created",
						},
						legend: {
							position: 'bottom'
						},
						scales: {
							yAxes: [{
								ticks:  {
									beginAtZero: true
								}
							}],
							xAxes: [{
								gridLines: {
									display: false
								}
							}]
						},
					}
				});
			};