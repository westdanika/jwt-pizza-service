const request = require("supertest");
const app = require("../service");
const { Role, DB } = require("../database/database.js");

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

// const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
// let testUserAuthToken;
let testAdmin;
let testAdminAuthToken;

const testFranchise = { name: randomName(), admins: [] };
let testFranchiseId;

beforeAll(async () => {
  testAdmin = await createAdminUser();
  //   testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const loginRes = await request(app).put("/api/auth").send(testAdmin);
  testAdminAuthToken = loginRes.body.token;

  testFranchise.admins.push({ email: testAdmin.email });
  expectValidJwt(testAdminAuthToken);
});

beforeEach(async () => {
  const createFranchiseRes = await createFranchise(testFranchise);
  testFranchiseId = createFranchiseRes.body.id;
  expect(createFranchiseRes.status).toBe(200);
});

afterEach(async () => {
  await deleteFranchise(testFranchiseId);
});

test("get all franchises", async () => {
  // How do I test this in a way that works if there are zero franchises or multiple?
  const getFranchiseRes = await request(app).get("/api/franchise");
  expect(getFranchiseRes.status).toBe(200);
  const fetchedFranchise = getFranchiseRes.body.find(
    (franchise) => franchise.id === testFranchiseId
  );

  expect(fetchedFranchise.name).toEqual(testFranchise.name);
});

test("get a user's franchises", async () => {
  const getUserFranchisesRes = await request(app)
    .get(`/api/franchise/${testAdmin.id}`)
    .set("Authorization", `Bearer ${testAdminAuthToken}`);
  expect(getUserFranchisesRes.status).toBe(200);
  const expectedFranchise = { ...testFranchise, stores: [] };

  expect(getUserFranchisesRes.body.length).toBe(1);
  const receivedFranchise = getUserFranchisesRes.body[0];
  delete receivedFranchise.id;
  expect(receivedFranchise.id).toBe(expectedFranchise.id);
  expect(receivedFranchise.name).toBe(expectedFranchise.name);
  expect(receivedFranchise.stores).toMatchObject(expectedFranchise.stores);
});

test("create a franchise", async () => {
  const newTestFranchise = { name: randomName(), admins: [{ email: testAdmin.email }] };
  const createFranchiseRes = await createFranchise(newTestFranchise);
  expect(createFranchiseRes.status).toBe(200);

  let newTestFranchiseID = createFranchiseRes.body.id;
  const expectedFranchise = { ...newTestFranchise, id: newTestFranchiseID };
  expect(createFranchiseRes.body).toMatchObject(expectedFranchise);
});

// test("bad create a franchise", async () => {
//   jest.spyOn("createFranchise").mockImplementation(async (franchise) => {
//     return request(app)
//       .post("/api/franchise")
//       .send(franchise)
//       .set("Authorization", `Bearer invalidToken`);
//   });

//   const badCreateFranchiseRes = await createFranchise(testFranchise);
//   expect(badCreateFranchiseRes.status).toBe(401);
//   expect(badCreateFranchiseRes.body).toMatchObject({ message: "invalid token" });
// });

test("delete a franchise", async () => {
  // FIXME - do I need to create a new test franchise first?
  const deleteFranchiseRes = await deleteFranchise(testFranchiseId);
  expect(deleteFranchiseRes.status).toBe(200);
  expect(deleteFranchiseRes.body).toMatchObject({ message: "franchise deleted" });
});

test("create a store", async () => {
  let testStore = { franchiseId: testFranchiseId, name: randomName() };
  const createStoreRes = await createStore(testStore);
  expect(createStoreRes.status).toBe(200);

  let testStoreID = createStoreRes.body.id;
  const expectedStore = { ...testStore, id: testStoreID };
  expect(createStoreRes.body).toMatchObject(expectedStore); // FIXME - update the testStore object to match the response

  await deleteStore(createStoreRes.body);
});

test("delete a store", async () => {
  // FIXME - factor out the store creation
  let testStore = { franchiseId: testFranchiseId, name: randomName() };
  let testStoreID = (await createStore(testStore)).body.id;
  testStore.id = testStoreID;

  const deleteStoreRes = await deleteStore(testStore);
  expect(deleteStoreRes.status).toBe(200);
  expect(deleteStoreRes.body).toMatchObject({ message: "store deleted" });
});

test("bad delete a store", async () => {
  let testStore = { id: 90, franchiseId: 5, name: randomName() };

  jest.spyOn(DB, "getFranchise").mockImplementation(async (id) => {
    return false;
  });

  const badDeleteStoreRes = await deleteStore(testStore);
  expect(badDeleteStoreRes.status).toBe(403);
  expect(badDeleteStoreRes.body).toMatchObject({ message: "unable to delete a store" });
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: "toomanysecrets", roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + "@admin.com";

  user = await DB.addUser(user);
  return { ...user, password: "toomanysecrets" };
}

async function createFranchise(franchise) {
  return request(app)
    .post("/api/franchise")
    .send(franchise)
    .set("Authorization", `Bearer ${testAdminAuthToken}`);
}

async function deleteFranchise(franchiseId) {
  return request(app)
    .delete(`/api/franchise/${franchiseId}`)
    .set("Authorization", `Bearer ${testAdminAuthToken}`);
}

async function createStore(store) {
  return request(app)
    .post(`/api/franchise/${store.franchiseId}/store`)
    .send(store)
    .set("Authorization", `Bearer ${testAdminAuthToken}`);
}

async function deleteStore(store) {
  return request(app)
    .delete(`/api/franchise/${store.franchiseId}/store/${store.id}`)
    .set("Authorization", `Bearer ${testAdminAuthToken}`);
}
