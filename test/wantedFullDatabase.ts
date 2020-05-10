export default `
CREATE TABLE IF NOT EXISTS Cart (
id INT AUTO_INCREMENT,
userId INT,
timestamp TIMESTAMP,
PRIMARY KEY (id),
FOREIGN KEY (userId) REFERENCES User(id),
UNIQUE KEY \`idx_Cart_userId\` (userId)
)  ENGINE=INNODB;

CREATE TABLE IF NOT EXISTS CartIngredientList (
cartId INT,
ingredientId INT,
quantity TINYINT,
doubleChecked BOOLEAN DEFAULT 1,
checked BOOLEAN DEFAULT 0,
PRIMARY KEY (cartId,ingredientId),
FOREIGN KEY (cartId) REFERENCES Cart(id),
FOREIGN KEY (ingredientId) REFERENCES Ingredient(id)
)  ENGINE=INNODB;

CREATE TABLE IF NOT EXISTS Ingredient (
id INT AUTO_INCREMENT,
name VARCHAR(70),
PRIMARY KEY (id),
UNIQUE KEY \`idx_Ingredient_name\` (name)
)  ENGINE=INNODB;

CREATE TABLE IF NOT EXISTS User (
id INT AUTO_INCREMENT,
roleId INT DEFAULT 0,
name VARCHAR(70) DEFAULT 'Joao',
age SMALLINT,
dateOfBirth DATE,
email VARCHAR(320),
gender TINYINT,
floatField FLOAT,
doubleField DOUBLE,
PRIMARY KEY (id),
FOREIGN KEY (roleId) REFERENCES Role(id),
UNIQUE KEY \`idx_User_email\` (email)
)  ENGINE=INNODB;

CREATE TABLE IF NOT EXISTS Role (
id INT AUTO_INCREMENT,
name VARCHAR(20),
PRIMARY KEY (id)
)  ENGINE=INNODB;

CREATE TABLE IF NOT EXISTS NoPrimaryKeyTable (
parameter INT,
field ENUM('entry1', 'data number 2', 'stuff really cool', 'entry3')
)  ENGINE=INNODB;
`