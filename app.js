const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // CORS

// MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ockidea", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB 연결 성공"))
  .catch((err) => console.error("MongoDB 연결 실패:", err));

// 기본 라우트
app.get("/", (req, res) => {
  res.json({
    message: "ockidea 서버 정상 실행중",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      ideas: "/api/ideas",
      comments: "/api/comments",
    },
  });
});

// API 라우트
app.use("/api/test", require("./routes/test")); // (User 모델) 테스트용

app.use("/api/auth", require("./routes/auth")); // 프론트엔드용

// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/ideas', require('./routes/ideas'));
// app.use('/api/comments', require('./routes/comments'));

// 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "요청한 엔드포인트를 찾을 수 없습니다.",
  });
});

// 전역 에러
app.use((err, req, res, next) => {
  console.error("🔴 서버 에러:", err.stack);

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "서버 내부 오류가 발생했습니다."
        : err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// 서버 시작
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🌟🌟 okidea 서버가 포트 ${PORT}에서 실행 중입니다. 🌟🌟`);
  console.log(`URL: http://localhost:${PORT}`);
});

module.exports = app;
