const express = require("express");
const router = express.Router();
const User = require("../models/User"); // User 모델 불러오기

// 테스트용 사용자 생성
router.post("/create-user", async (req, res) => {
  try {
    const testUser = new User({
      email: "test@example.com",
      password: "password123",
      nickname: "테스트유저",
      birthDate: "20030913",
      gender: "F",
      bio: "테스트용 사용자입니다",
    });

    const savedUser = await testUser.save();

    res.status(201).json({
      success: true,
      message: "테스트 사용자가 생성되었습니다",
      data: {
        id: savedUser._id,
        email: savedUser.email,
        nickname: savedUser.nickname,
        birthDate: savedUser.birthDate,
        age: savedUser.age,
        birthYear: savedUser.birthYear, // 연도
        daysSinceJoined: savedUser.daysSinceJoined, // N일차
        createdAt: savedUser.createdAt,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "사용자 생성 실패",
      error: error.message,
    });
  }
});

// 여러 사용자 한번에 생성하기
router.post("/create-multiple-users", async (req, res) => {
  try {
    const testUsers = [
      {
        email: "user1@example.com",
        password: "password123",
        nickname: "사용자1",
        birthDate: "19950825",
        gender: "M",
      },
      {
        email: "user2@example.com",
        password: "password123",
        nickname: "사용자2",
        birthDate: "20000101",
        gender: "F",
      },
      {
        email: "user3@example.com",
        password: "password123",
        nickname: "사용자3",
        birthDate: "19881224",
        gender: "N",
      },
    ];

    const savedUsers = [];
    for (const userData of testUsers) {
      const user = new User(userData);
      const savedUser = await user.save();
      savedUsers.push({
        id: savedUser._id,
        email: savedUser.email,
        nickname: savedUser.nickname,
        birthDate: savedUser.birthDate,
        age: savedUser.age,
        daysSinceJoined: savedUser.daysSinceJoined,
      });
    }

    res.status(201).json({
      success: true,
      message: `${savedUsers.length}명의 테스트 사용자가 생성되었습니다`,
      data: savedUsers,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "다중 사용자 생성 실패",
      error: error.message,
    });
  }
});

// 생년월일 유효성 검사
router.post("/test-birthdate-validation", async (req, res) => {
  const invalidDates = [
    "19901301",
    "19900232",
    "20300101",
    "1899123",
    "199001",
    "abcd1234",
  ];

  const results = [];

  for (const birthDate of invalidDates) {
    try {
      const testUser = new User({
        email: "invalid@example.com",
        password: "password123",
        nickname: "잘못된테스트",
        birthDate: birthDate,
      });

      await testUser.save();
      results.push({ birthDate, valid: true, error: null });
    } catch (error) {
      results.push({ birthDate, valid: false, error: error.message });
    }
  }

  res.json({
    success: true,
    message: "생년월일 유효성 검사 테스트 완료",
    results: results,
  });
});

// 비밀번호 검증
router.post("/test-password", async (req, res) => {
  try {
    const user = await User.findOne({ email: "test@example.com" }).select(
      "+password"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다",
      });
    }

    const isMatch = await user.matchPassword("password123");

    res.json({
      success: true,
      message: "비밀번호 검증 테스트",
      passwordMatch: isMatch,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "비밀번호 테스트 실패",
      error: error.message,
    });
  }
});

// 중복 체크
router.get("/check-duplicates", async (req, res) => {
  try {
    const emailTaken = await User.isEmailTaken("test@example.com");
    const nicknameTaken = await User.isNicknameTaken("테스트유저");

    res.json({
      success: true,
      message: "중복 체크 테스트",
      results: {
        email_taken: emailTaken,
        nickname_taken: nicknameTaken,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "중복 체크 테스트 실패",
      error: error.message,
    });
  }
});

// 모든 사용자 조회 (개발용) : virtual 필드도 같이 조회.
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}).select("-password");

    const usersWithVirtual = users.map((user) => ({
      id: user._id,
      email: user.email,
      nickname: user.nickname,
      birthDate: user.birthDate,
      age: user.age, // Virtual
      birthYear: user.birthYear,
      daysSinceJoined: user.daysSinceJoined, // Virtual
      gender: user.gender,
      bio: user.bio,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    }));

    res.json({
      success: true,
      count: usersWithVirtual.length,
      data: usersWithVirtual,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "사용자 조회 실패",
      error: error.message,
    });
  }
});

// 상세 정보 조회
router.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다",
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        birthDate: user.birthDate,
        age: user.age,
        birthYear: user.birthYear,
        daysSinceJoined: user.daysSinceJoined,
        gender: user.gender,
        bio: user.bio,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        // 추가 계산 정보
        calculations: {
          isAdult: user.age >= 19,
          ageGroup:
            user.age < 20
              ? "10대"
              : user.age < 30
              ? "20대"
              : user.age < 40
              ? "30대"
              : "40대 이상",
          serviceUsagePeriod: `${user.daysSinceJoined}일차`,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "사용자 조회 실패",
      error: error.message,
    });
  }
});

// 테스트 데이터 일괄삭제
router.delete("/cleanup", async (req, res) => {
  try {
    const result = await User.deleteMany({});

    res.json({
      success: true,
      message: `${result.deletedCount}개의 테스트 데이터가 삭제되었습니다`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "데이터 삭제 실패",
      error: error.message,
    });
  }
});

// 중요: router 내보내기!!!!!
module.exports = router;
