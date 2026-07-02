import assert from "node:assert/strict";
import { buildCustomerPasswordSeed, buildCustomerUsername } from "../lib/customer-identity";

assert.equal(buildCustomerUsername({ phone: "+20 100 123 4567", code: "ahmed-sara" }), "client_201001234567");
assert.equal(buildCustomerUsername({ phone: "", code: "Ahmed & Sara 2026" }), "client_ahmed_sara_2026");
assert.equal(buildCustomerPasswordSeed({ phone: "+20 100 123 4567", code: "ahmed-sara" }), "1234567".slice(-6));
assert.equal(buildCustomerPasswordSeed({ phone: "", code: "ahmed-sara" }), "ahmed-sara-admin");
