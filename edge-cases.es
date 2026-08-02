let x = (2 + 3) * 4
print("x = {x}")

let makeAdder = a => b => a + b
let add5 = makeAdder(5)
print("add5(10) = {add5(10)}")

func sumAll(items) {
  let total = 0
  for item in items {
    total = total + item
  }
  return total
}
print("sumAll = {sumAll([1,2,3,4,5])}")

let nested = { user: { name: "Ada", tags: ["a", "b"] } }
print("{nested.user.name} likes {nested.user.tags[0]}")

let count = 0
repeat 3 {
  count = count + 1
}
print("count (no loop var) = {count}")
