import http from "node:http";

const BASE = "http://localhost:3001";

function jsonReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname, headers: { "Content-Type": "application/json" } };
    const r = http.request(opts, res => { let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, data: JSON.parse(d) })); });
    r.on("error", reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function uploadFile(token, filename, content) {
  const boundary = "----Boundary" + Date.now() + Math.random();
  const body = [
    "--" + boundary,
    `Content-Disposition: form-data; name="files"; filename="${filename}"`,
    "Content-Type: application/octet-stream",
    "",
    content,
    "--" + boundary + "--",
    ""
  ].join("\r\n");

  return new Promise((resolve, reject) => {
    const opts = {
      method: "POST", hostname: "localhost", port: 3001, path: "/api/upload",
      headers: { Authorization: "Bearer " + token, "Content-Type": "multipart/form-data; boundary=" + boundary, "Content-Length": Buffer.byteLength(body) }
    };
    const r = http.request(opts, res => { let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, data: JSON.parse(d) })); });
    r.on("error", reject);
    r.write(body);
    r.end();
  });
}

const login = await jsonReq("POST", "/api/auth/signin", { email: "admin@appolice.gov.in", password: "Admin@2026" });
console.log("Login:", login.status === 200 ? "OK" : "FAIL");
const token = login.data.token;

const u1 = await uploadFile(token, "file1.txt", "first file content");
console.log("Upload 1:", u1.status, JSON.stringify(u1.data));

const u2 = await uploadFile(token, "file2.txt", "second file content");
console.log("Upload 2:", u2.status, JSON.stringify(u2.data));

console.log("Both OK:", u1.status === 201 && u2.status === 201 ? "YES" : "NO");
