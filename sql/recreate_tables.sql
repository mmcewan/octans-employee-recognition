SET FOREIGN_KEY_CHECKS=0;

-- Create User data table
DROP TABLE IF EXISTS `user_profile`;
CREATE TABLE user_profile (
    id INT NOT NULL AUTO_INCREMENT,
	username VARCHAR(255) NOT NULL,
	password VARCHAR(255) NOT NULL, 
	firstname VARCHAR(40),
    lastname VARCHAR(40),
	signature VARCHAR(255),
	admin_flag VARCHAR(1) NOT NULL,
	created_ts TIMESTAMP NOT NULL,
    PRIMARY KEY (id)
) ENGINE = 'InnoDB';

-- Create Award Type data table
DROP TABLE IF EXISTS `award_type`;
CREATE TABLE award_type (
    id INT NOT NULL AUTO_INCREMENT,
    description VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
) ENGINE = 'InnoDB';

-- Create Award data table
DROP TABLE IF EXISTS `award`;
CREATE TABLE award (
    id INT NOT NULL AUTO_INCREMENT,
	sender_id INT NOT NULL,
	recepient_id INT NOT NULL,
	award_type INT NOT NULL,
	comment VARCHAR(255) NOT NULL,
	award_date DATE NOT NULL,
    PRIMARY KEY (id),
	FOREIGN KEY (sender_id) REFERENCES user_profile(id) ON UPDATE CASCADE,
	FOREIGN KEY (recepient_id) REFERENCES user_profile(id) ON UPDATE CASCADE,
	FOREIGN KEY (award_type) REFERENCES award_type(id) ON UPDATE CASCADE
) ENGINE = 'InnoDB';

SET FOREIGN_KEY_CHECKS=1;

-- Insert statements for user table
INSERT INTO user_profile (username, password, firstname, lastname, signature, admin_flag, created_ts) VALUES
('testerjoe', 'abc123', 'Joe', 'Tester', NULL, NULL, CURRENT_TIMESTAMP),
('admin', 'admin', NULL, NULL, NULL, 'Y', CURRENT_TIMESTAMP);

-- Insert statements for award_type table
INSERT INTO award_type (description) VALUES
('Educational'),
('Innovative'),
('Inspiring'),
('Teamwork'),
('Thank you');

-- Insert statements for award table
INSERT INTO award (sender_id, recepient_id, award_type, comment, award_date) VALUES
(1, 2, 1, 'Great job!', '2017.07.03');