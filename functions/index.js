// functions/index.js

const functions = require("firebase-functions");

// 현재 우리는 Cloud Functions를 적극적으로 쓰고 있지 않으므로,
// 기본 헬로월드 예제만 남겨두거나 비워두셔도 됩니다.

exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});