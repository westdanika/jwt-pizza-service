const request = require("supertest");
const app = require("../service");
// const { DB, Role } = require("../database/database.js");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;

let newTestUser;
let newTestUserAuthToken;

beforeAll(async () => {
  // testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

beforeEach(async () => {
  newTestUser = randomUser();
  const registerRes = await register(newTestUser);
  newTestUserAuthToken = registerRes.body.token;
  expectValidJwt(newTestUserAuthToken);
});

afterEach(async () => {
  await request(app).delete("/api/auth").set("Authorization", `Bearer ${newTestUserAuthToken}`);
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
  expect(updateUserRes.body.name).toBe(newTestUser.name);
});

test("list users unauthorized", async () => {
  const listUsersRes = await request(app).get("/api/user");
  expect(listUsersRes.status).toBe(401);
});

test("list users not admin", async () => {
  const [, userToken] = await registerUser(request(app));
  const listUsersRes = await request(app)
    .get("/api/user")
    .set("Authorization", "Bearer " + userToken);
  expect(listUsersRes.status).toBe(403);
});

test("list users", async () => {
  const [, userToken] = await loginAdmin(request(app));
  const listUsersRes = await request(app)
    .get("/api/user")
    .set("Authorization", "Bearer " + userToken);
  expect(listUsersRes.status).toBe(200);
  expect(Array.isArray(listUsersRes.body.users)).toBe(true);
  expect(listUsersRes.body.users.length).toBeGreaterThan(0);
  expect(listUsersRes.body.users[0]).toHaveProperty("name");
  expect(listUsersRes.body.users[0]).toHaveProperty("email");
  expect(listUsersRes.body.users[0]).not.toHaveProperty("role");
});

test("list users paginated", async () => {
  const [, userToken] = await loginAdmin(request(app));
  const listUsersRes1 = await request(app)
    .get("/api/user?page=0&limit=5")
    .set("Authorization", "Bearer " + userToken);
  expect(listUsersRes1.status).toBe(200);
  expect(Array.isArray(listUsersRes1.body.users)).toBe(true);
  expect(listUsersRes1.body.users.length).toBeGreaterThan(0);
  expect(listUsersRes1.body.users.length).toBeLessThanOrEqual(5);

  if (listUsersRes1.body.more) {
    const listUsersRes2 = await request(app)
      .get("/api/user?page=1&limit=5")
      .set("Authorization", "Bearer " + userToken);
    expect(listUsersRes2.status).toBe(200);
    expect(Array.isArray(listUsersRes2.body.users)).toBe(true);
    expect(listUsersRes2.body.users.length).toBeGreaterThan(0);
    expect(listUsersRes2.body.users.length).toBeLessThanOrEqual(5);
    expect(listUsersRes2.body.users[0].id).not.toBe(listUsersRes1.body.users[0].id);
  }
});

test("list users name filter", async () => {
  const [, userToken] = await loginAdmin(request(app));
  const listUsersRes = await request(app)
    .get("/api/user?name=pizza diner")
    .set("Authorization", "Bearer " + userToken);
  expect(listUsersRes.status).toBe(200);
  expect(Array.isArray(listUsersRes.body.users)).toBe(true);
  expect(listUsersRes.body.users.length).toBeGreaterThan(0);
  expect(listUsersRes.body.users[0].name).toBe("pizza diner");
});

test("delete user unauthorized", async () => {
  const [user] = await registerUser(request(app));

  const deleteUserRes = await request(app).delete("/api/user/" + user.id);
  expect(deleteUserRes.status).toBe(401);
});

test("delete user", async () => {
  const [user] = await registerUser(request(app));
  const [, adminToken] = await loginAdmin(request(app));

  const deleteUserRes = await request(app)
    .delete("/api/user/" + user.id)
    .set("Authorization", "Bearer " + adminToken);
  expect(deleteUserRes.status).toBe(200);
  expect(deleteUserRes.body.message).toBe("User deleted");
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

// async function login(user) {
//   return request(app).put("/api/auth").send(user);
// }

async function register(user) {
  return request(app).post("/api/auth").send(user);
}

async function loginAdmin(service) {
  const adminUser = {
    email: "admin@jwt.com",
    password: "d00m$lugMushrooms!"
  };
  const loginRes = await service.put("/api/auth").send(adminUser);
  expectValidJwt(loginRes.body.token);
  return [loginRes.body.user, loginRes.body.token];
}

async function registerUser(service) {
  const testUser = {
    name: "pizza diner",
    email: `${randomName()}@test.com`,
    password: "a"
  };
  const registerRes = await service.post("/api/auth").send(testUser);
  registerRes.body.user.password = testUser.password;

  return [registerRes.body.user, registerRes.body.token];
}
