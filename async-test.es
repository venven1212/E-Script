async func fakeApi(path) {
  return { ok: true, status: 200, data: { message: "loaded {path}" } }
}

async func renderStuff() {
  let { ok, status, data } = await fakeApi("/api/my-bets")
  if not ok {
    print("Error {status}")
  } else {
    print("Got data: {data.message}")
  }
}

renderStuff()

let asyncDouble = async x => {
  return x * 2
}

async func main() {
  let result = await asyncDouble(21)
  print("async arrow result: {result}")
}
main()
