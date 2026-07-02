import assert from "node:assert/strict";
import { getCustomerQualityFlags } from "../lib/admin-crm";

assert.deepEqual(
  getCustomerQualityFlags({
    phone: "",
    email: "",
    username: "client_ahmed_sara",
  }),
  [
    { key: "missing-phone", label: "بدون هاتف", severity: "danger" },
    { key: "missing-email", label: "بدون بريد", severity: "warning" },
    { key: "generated-username", label: "اسم دخول مولد", severity: "warning" },
  ],
);

assert.deepEqual(
  getCustomerQualityFlags({
    phone: "+201001234567",
    email: "client@example.com",
    username: "client_1001234567",
  }),
  [],
);
