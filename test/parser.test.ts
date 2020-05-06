import parseFile from '../src/index'

const wantedResult = `
CREATE TABLE IF NOT EXISTS Cart (
id INT AUTO_INCREMENT PRIMARY KEY,
userId INT,
FOREIGN KEY (userId) REFERENCES User(id)
)  ENGINE=INNODB;

CREATE TABLE IF NOT EXISTS CartIngredientList (
cartId INT PRIMARY KEY,
ingredientId INT PRIMARY KEY,
quantity TINYINT,
checked DEFAULT(false),
FOREIGN KEY (cartId) REFERENCES Cart(id),
FOREIGN KEY (ingredientId) REFERENCES Ingredient(id)
)  ENGINE=INNODB;

CREATE TABLE IF NOT EXISTS Ingredient (
id INT AUTO_INCREMENT PRIMARY KEY,
name UNIQUE
)  ENGINE=INNODB;

CREATE TABLE IF NOT EXISTS User (
id INT AUTO_INCREMENT PRIMARY KEY,
roleId INT,
name VARCHAR(70),
age SMALLINT,
email UNIQUE,
gender TINYINT,
FOREIGN KEY (roleId) REFERENCES Role(id)
)  ENGINE=INNODB;

CREATE TABLE IF NOT EXISTS Role (
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(20)
)  ENGINE=INNODB;
`

describe('Parser tests', () => {

  it('it should parse the file line by line', (done) => {
    parseFile('../database.md').then(
      (result) => {
        expect(result).toEqual(wantedResult)
        done()
      }
    )
  })
})
