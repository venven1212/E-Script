# E-script demo

let name = "Venny"
print("Hello, {name}! Welcome to E-script.")

func square(x) => x * x
print("5 squared is {square(5)}")

func fizzbuzz(n) {
  repeat n as i {
    let num = i + 1
    if num % 15 == 0 {
      print("FizzBuzz")
    } else if num % 3 == 0 {
      print("Fizz")
    } else if num % 5 == 0 {
      print("Buzz")
    } else {
      print(num)
    }
  }
}
fizzbuzz(15)

let nums = [1, 2, 3, 4, 5]
let total = 0
for n in nums {
  total = total + n
}
print("Sum is {total}")

let double = x => x * 2
print("Double of 21 is {double(21)}")

let person = { name: "Ada", age: 30 }
print("{person.name} is {person.age}")

let isReady = true and not false
print("isReady: {isReady}")

let i = 0
while i < 3 {
  print("while loop i = {i}")
  i = i + 1
}
