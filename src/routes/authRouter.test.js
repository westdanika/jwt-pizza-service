const request = require("supertest");
const app = require("../service");

// const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
// let testUserAuthToken;

let newTestUser;
let newTestUserAuthToken;

// beforeAll(async () => {
//   // testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
//   const registerRes = await request(app).post("/api/auth").send(testUser);
//   testUserAuthToken = registerRes.body.token;
//   expectValidJwt(testUserAuthToken);
// });

beforeEach(async () => {
  newTestUser = randomUser();
  const registerRes = await register(newTestUser);
  newTestUserAuthToken = registerRes.body.token;
  expectValidJwt(newTestUserAuthToken);
});

// afterEach(async () => {
//   await request(app).delete("/api/auth").set("Authorization", `Bearer ${newTestUserAuthToken}`);
// });

test("register", async () => {
  const user = { name: "pizza diner", email: "reg@test.com", password: "a" };
  user.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(user);
  expect(registerRes.status).toBe(200);
  expectValidJwt(registerRes.body.token);

  const expectedUser = { ...user, roles: [{ role: "diner" }] }; // const { password, ...expectedUser } = { ...user, roles: [{ role: "diner" }] };
  delete expectedUser.password;
  expect(registerRes.body.user).toMatchObject(expectedUser);
});

test("register with missing fields", async () => {
  const user = { name: "pizza failure", email: "reg@test.com" };
  user.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(user);
  expect(registerRes.status).toBe(400);
});

test("login", async () => {
  const loginRes = await request(app).put("/api/auth").send(newTestUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...newTestUser, roles: [{ role: "diner" }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test("login multiple times", async () => {
  // FIXME - not sure if this is a good test
  const loginRes1 = await login(newTestUser);
  const loginRes2 = await login(newTestUser);
  expect(loginRes1.body.token).not.toBe(loginRes2.body.token);
});

test("logout", async () => {
  const logoutRes = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${newTestUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body).toEqual({ message: "logout successful" });
});

test("updateUser", async () => {
  const loginRes = await request(app).put("/api/auth").send(newTestUser);
  const authToken = loginRes.body.token;
  const userId = loginRes.body.user.id;

  const updatedEmail = Math.random().toString(36).substring(2, 12) + "@test.com";
  const updatedUser = { ...newTestUser, email: updatedEmail };
  const updateUserRes = await request(app)
    .put(`/api/auth/${userId}`)
    .set("Authorization", `Bearer ${authToken}`)
    .send(updatedUser);
  expect(updateUserRes.status).toBe(200);
  expect(updateUserRes.body.email).toBe(updatedEmail);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

function randomUser() {
  return {
    name: randomName(),
    email: randomName() + "@test.com",
    password: randomName()
  };
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function login(user) {
  return request(app).put("/api/auth").send(user);
}

async function register(user) {
  return request(app).post("/api/auth").send(user);
}
