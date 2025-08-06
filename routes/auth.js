// 프론트엔드용

const express = require("express");
const router = express.Router();
const User = require("../models/User");

// [API] 회원가입
router.post("/register", async (req, res) => {
  try {
    // 프론트엔드에서 보낸 데이터 추출
    const { email, password, nickname, birthDate, gender, bio } = req.body;

    // 필수항목 검증
    if (!email || !password || !nickname || !birthDate) {
      return res.status(400).json({
        success: false,
        message: "필수 필드가 누락되었습니다",
        required: ["email", "password", "nickname", "birthDate"],
      });
    }

    // 중복 체크
    const emailExists = await User.isEmailTaken(email);
    const nicknameExists = await User.isNicknameTaken(nickname);

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "사용 중인 이메일입니다.",
      });
    }

    if (nicknameExists) {
      return res.status(400).json({
        success: false,
        message: "사용 중인 닉네임입니다.",
      });
    }

    // 새 사용자 생성
    const newUser = new User({
      email,
      password,
      nickname,
      birthDate,
      gender: gender || "N",
      bio: bio || "",
    });

    const savedUser = await newUser.save();

    // 응답 (비밀번호 제외)
    res.status(201).json({
      success: true,
      message: "회원가입이 완료되었습니다",
      data: {
        id: savedUser._id,
        email: savedUser.email,
        nickname: savedUser.nickname,
        birthDate: savedUser.birthDate,
        age: savedUser.age,
        daysSinceJoined: savedUser.daysSinceJoined,
        gender: savedUser.gender,
        bio: savedUser.bio,
        createdAt: savedUser.createdAt,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "회원가입 실패",
      error: error.message,
    });
  }
});

// [API] 로그인
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "이메일과 비밀번호를 입력해주세요",
      });
    }

    // 사용자 찾기 (비밀번호 포함)
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "이메일 또는 비밀번호가 틀렸습니다",
      });
    }

    // 비밀번호 검증
    const isPasswordValid = await user.matchPassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "이메일 또는 비밀번호가 틀렸습니다",
      });
    }

    // 로그인 성공
    res.json({
      success: true,
      message: "로그인 성공",
      data: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        birthDate: user.birthDate,
        age: user.age,
        daysSinceJoined: user.daysSinceJoined,
        gender: user.gender,
        bio: user.bio,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "로그인 처리 중 오류가 발생했습니다",
      error: error.message,
    });
  }
});

// [API] 프로필 조회
router.get("/profile/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");

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
        daysSinceJoined: user.daysSinceJoined,
        gender: user.gender,
        bio: user.bio,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "프로필 조회 실패",
      error: error.message,
    });
  }
});

// [API] 프로필 수정
router.put("/profile/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nickname, bio, gender } = req.body;

    // 사용자 찾기
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다",
      });
    }

    // 닉네임 중복 체크 (현재 사용자 제외)
    if (nickname && nickname !== user.nickname) {
      const nicknameExists = await User.findOne({
        nickname,
        _id: { $ne: id },
      });

      if (nicknameExists) {
        return res.status(400).json({
          success: false,
          message: "이미 사용 중인 닉네임입니다",
        });
      }
    }

    const updateFields = {};
    if (nickname) updateFields.nickname = nickname;
    if (bio !== undefined) updateFields.bio = bio;
    if (gender) updateFields.gender = gender;

    // 사용자 정보 업데이트
    const updatedUser = await User.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: "프로필이 업데이트되었습니다",
      data: {
        id: updatedUser._id,
        email: updatedUser.email,
        nickname: updatedUser.nickname,
        birthDate: updatedUser.birthDate,
        age: updatedUser.age,
        daysSinceJoined: updatedUser.daysSinceJoined,
        gender: updatedUser.gender,
        bio: updatedUser.bio,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "프로필 업데이트 실패",
      error: error.message,
    });
  }
});

// [API] 이메일 중복 체크
router.post("/check-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "이메일을 입력해주세요",
      });
    }

    const exists = await User.isEmailTaken(email);

    res.json({
      success: true,
      available: !exists,
      message: exists
        ? "이미 사용 중인 이메일입니다"
        : "사용 가능한 이메일입니다",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "이메일 확인 중 오류가 발생했습니다",
    });
  }
});

// [API] 닉네임 중복 체크
router.post("/check-nickname", async (req, res) => {
  try {
    const { nickname } = req.body;

    if (!nickname) {
      return res.status(400).json({
        success: false,
        message: "닉네임을 입력해주세요",
      });
    }

    const exists = await User.isNicknameTaken(nickname);

    res.json({
      success: true,
      available: !exists,
      message: exists
        ? "이미 사용 중인 닉네임입니다"
        : "사용 가능한 닉네임입니다",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "닉네임 확인 중 오류가 발생했습니다",
    });
  }
});

module.exports = router;
