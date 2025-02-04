const request = require("supertest");
const app = require("../service");
const { Role, DB } = require("../database/database.js");

const testItem = {
  title: randomName(),
  description: randomName(),
  image: randomName() + ".png",
  price: 0.0001
};
let testItemId;

const testUser = { name: randomName(), email: randomName() + "@test.com", password: randomName() };
let testUserAuthToken;

let testAdmin;
let testAdminAuthToken;

beforeAll(async () => {
  // testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);

  testAdmin = await createAdminUser();
  const loginRes = await request(app).put("/api/auth").send(testAdmin);
  testAdminAuthToken = loginRes.body.token;
  expectValidJwt(testAdminAuthToken);
});

beforeEach(async () => {
  const addMenuItemRes = await addMenuItem(testItem);
  expect(addMenuItemRes.status).toBe(200);
  const addedItem = addMenuItemRes.body.find(
    (item) =>
      item.title === testItem.title &&
      item.description === testItem.description &&
      item.image === testItem.image &&
      item.price === testItem.price
  );
  expect(addedItem).toBeDefined();
  testItemId = addedItem.id;
});

test("get pizza menu", async () => {
  const getPizzaMenuRes = await request(app).get("/api/order/menu");
  expect(getPizzaMenuRes.status).toBe(200);
  testItem.id = testItemId;

  expect(getPizzaMenuRes.body).toEqual(expect.arrayContaining([testItem]));
});

test("add item to pizza menu", async () => {
  const newItem = {
    title: randomName(),
    description: randomName(),
    image: randomName() + ".png",
    price: 0.0001
  };
  const addMenuItemRes = await addMenuItem(newItem);
  expect(addMenuItemRes.status).toBe(200);

  const addedItem = addMenuItemRes.body.find(
    (item) =>
      item.title === newItem.title &&
      item.description === newItem.description &&
      item.image === newItem.image &&
      item.price === newItem.price
  );
  expect(addedItem).toBeDefined();
});

test("create orders", async () => {
  const testOrder = {
    franchiseId: 1,
    storeId: 1,
    items: [{ menuId: testItemId, description: testItem.title, price: testItem.price }]
  };
  const createOrderRes = await createOrder(testOrder);
  expect(createOrderRes.status).toBe(200);
  expect(createOrderRes.body.order).toMatchObject(testOrder);
  expectValidJwt(createOrderRes.body.jwt);
});

test("get orders", async () => {
  const testOrder = {
    franchiseId: 1,
    storeId: 1,
    items: [{ menuId: testItemId, description: testItem.title, price: testItem.price }]
  };
  const createOrderRes = await createOrder(testOrder);
  testOrder.id = createOrderRes.body.order.id;
  expect(createOrderRes.status).toBe(200);

  const getOrdersRes = await request(app)
    .get("/api/order")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(getOrdersRes.status).toBe(200);
  const fetchedOrder = getOrdersRes.body.orders.find((order) => order.id === testOrder.id);
  expect(fetchedOrder).toBeDefined();
  expect(fetchedOrder).toMatchObject(testOrder);
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

async function createAdminUser() {
  let user = { password: "toomanysecrets", roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + "@admin.com";

  user = await DB.addUser(user);
  return { ...user, password: "toomanysecrets" };
}

async function addMenuItem(item) {
  return request(app)
    .put("/api/order/menu")
    .send(item)
    .set("Authorization", `Bearer ${testAdminAuthToken}`);
}

async function createOrder(order) {
  return request(app)
    .post("/api/order")
    .send(order)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
}
