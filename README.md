# octans-employee-recognition
Team Octans Repo for CS467

Instructions for setting up and running application:
1) Clone the repo - `git clone https://github.com/mmcewan/octans-employee-recognition.git`
2) Navigate to the directory you cloned the repo to.
3) Install dependencies using the `npm install` command.
4) Update /config/database.json file with database credentials of your local environment.
5) Run /sql/recreate_tables.sql to create tables in awarddb database (need to create awarddb database prior to running).
5) Start application, either using the `npm start` or `nodemon app.js` if you want to monitor and restart node if any file changes are detected.
5) Open a web browser and navigate to localhost:8080 to view the application.
