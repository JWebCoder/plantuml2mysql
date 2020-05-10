```plantuml
@startuml database diagram
  class Cart {
    #id INT AUTO_INCREMENT
    -userId UNIQUE REF(User.id)
  }
  class Cart {
    #id INT AUTO_INCREMENT
    timestamp DATE
  }
@enduml
```