```plantuml
@startuml database diagram
  class Cart {
    #id INT AUTO_INCREMENT
    -userId UNIQUE REF(User.id)
    timestamp TIMESTAMP
  }

  class CartIngredientList {
    +cartId REF(Cart.id)
    +ingredientId REF(Ingredient.id) UNKNOWN
    ..
    quantity TINYINT NN
    later BOOLEAN DEFAULT(true) REF(Cart.Id)
    checked BOOLEAN NN DEFAULT(false) REF(cart.id)
  }

  class Ingredient {
    #id INT AUTO_INCREMENT
    ..
    name VARCHAR(70) UNIQUE
  }
  
  class User {
    #id INT AUTO_INCREMENT
    -roleId NN DEFAULT(0) REF(Role.id)
    ..
    name VARCHAR(70) NN DEFAULT(Joao)
    age SMALLINT
    dateOfBirth DATE
    email VARCHAR(320) NN UNIQUE
    gender TINYINT
    floatField FLOAT
    doubleField DOUBLE
  }
  
  class Role {
    #id INT AUTO_INCREMENT
    ..
    name VARCHAR(20) NN
  }

  class NoPrimaryKeyTable {
    parameter INT
  }
  
  User "0..*" o--o "1" Role

  User "1" *--o "0..1" Cart

  Cart "0..*" o--o "1..*" Ingredient
  (Cart, Ingredient) .. CartIngredientList

@enduml
```