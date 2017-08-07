SET FOREIGN_KEY_CHECKS=0;

-- Create User data table
DROP TABLE IF EXISTS `user_profile`;
CREATE TABLE user_profile (
  id INT NOT NULL AUTO_INCREMENT,
	username VARCHAR(255) NOT NULL UNIQUE,
	password VARCHAR(255) NOT NULL,
	firstname VARCHAR(40),
  lastname VARCHAR(40),
  email_address VARCHAR(255) UNIQUE,
	signature VARCHAR(255),
	admin_flag VARCHAR(1) NOT NULL,
	created_ts TIMESTAMP NOT NULL,
  resetPasswordToken VARCHAR(255),
  resetPasswordExpires BIGINT,
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
	award_date DATETIME NOT NULL,
  PRIMARY KEY (id),
	CONSTRAINT FOREIGN KEY (sender_id) REFERENCES user_profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT FOREIGN KEY (recepient_id) REFERENCES user_profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT FOREIGN KEY (award_type) REFERENCES award_type(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = 'InnoDB';

SET FOREIGN_KEY_CHECKS=1;

-- Insert statements for user table
-- Admin role :: username: admin, password: cs467 (hashed)
INSERT INTO user_profile (username, password, firstname, lastname, email_address, signature, admin_flag, created_ts, resetPasswordToken, resetPasswordExpires) VALUES
('admin', '$2y$10$bYrE1D2ZK8oS3tQFw6W8B.j8NaFYDef63Kv3kqf7maCQXPjQ.T1Lm', NULL, NULL, NULL, NULL, 'Y', CURRENT_TIMESTAMP, NULL, NULL);
-- Test user :: username: octansosu, password: coffee123 (hashed)
INSERT INTO user_profile (username, password, firstname, lastname, email_address, signature, admin_flag, created_ts, resetPasswordToken, resetPasswordExpires) VALUES
('octansosu', '$2y$10$GPORmfRXJ3HQmVvdZbxqRu9sDxHY8HU7kFVazIfIG/7fabtadop0W', 'Octans', 'Team', 'octansosu@gmail.com', 'http://res.cloudinary.com/hvij0ogeg/image/upload/octansosu', 'N', CURRENT_TIMESTAMP, NULL, NULL);
-- Test user :: username: testuser1, password: osu1 (hashed)
INSERT INTO user_profile (username, password, firstname, lastname, email_address, signature, admin_flag, created_ts, resetPasswordToken, resetPasswordExpires) VALUES
('testuser1', '$2a$10$FMiRrnmuac4jERlsyWd6D.JWzOV7jW3492VYyGv0MTHun/tS6xAH.', 'Test', 'User1','testuser1@test.com', 'http://res.cloudinary.com/hvij0ogeg/image/upload/testuser1', 'N', CURRENT_TIMESTAMP, NULL, NULL);
-- Test user :: username: testuser2, password: osu2 (hashed)
INSERT INTO user_profile (username, password, firstname, lastname, email_address, signature, admin_flag, created_ts, resetPasswordToken, resetPasswordExpires) VALUES
('testuser2', '$2a$10$OrhgZM1BUlfF4j5APpNFMej7KepCoCS/MxVjkuhCUJHyrZSp06IyK', 'Test', 'User2', 'testuser2@test.com', 'http://res.cloudinary.com/hvij0ogeg/image/upload/testuser2', 'N', CURRENT_TIMESTAMP, NULL, NULL);
-- Test user :: username: testuser3, password: osu3 (hashed)
INSERT INTO user_profile (username, password, firstname, lastname, email_address, signature, admin_flag, created_ts, resetPasswordToken, resetPasswordExpires) VALUES
('testuser3', '$2a$10$u83YaALhGrJvYAhTVs4oMumb872RTbk/BIkhuC6H.P2n30WTmNU92', 'Test', 'User3', 'testuser3@test.com', 'http://res.cloudinary.com/hvij0ogeg/image/upload/testuser3', 'N', CURRENT_TIMESTAMP, NULL, NULL);

-- Insert statements for award_type table
INSERT INTO award_type (description) VALUES
('Education'),
('Innovation'),
('Inspiration'),
('Teamwork'),
('Appreciation');

-- Insert statements for award table
INSERT INTO award (sender_id, recepient_id, award_type, comment, award_date) VALUES
(3, 4, 1, 'Great job!', '2017-08-03 15:30:00');
