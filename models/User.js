// 유효성 검증 관련
// - 이메일 : 자동 소문자 변환
// - 닉네임 : 2~20자, 한/영/숫자/특수문자(__,-) 허용
// - 출생연도 : 1900 ~ 현재 연도

// util 관련
// - 중복체크 : isEmailTaken(), isNicknameTaken()

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // 비밀번호 암호화 라이브러리

// 이런 형태의 userSchema를 정의하겠다는 의미..
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "이메일 주소는 필수 항목입니다."],
      unique: true, // 중복 불가
      lowercase: true, // 소문자 변환됨
      trim: true, // 앞뒤 공백 제거
      match: [
        // 정규식 사용해 이메일 형식 검증
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "올바른 이메일 형식을 입력해 주세요.",
      ],
    },

    // 비밀번호 필드 !! (중요)

    password: {
      type: String,
      required: [true, "비밀번호는 필수 항목입니다."],
      minlength: [6, "비밀번호는 최소 6자 이상이어야 합니다."],
      select: false, // 기본적으로 조회되지 않도록 설정하는 부분. User.find()로 조회해도 비번은 반환되지 않음..
    },

    nickname: {
      type: String,
      required: [true, "닉네임은 필수 항목입니다."],
      unique: true, // 중복 닉네임 일단 불가.
      trim: true, // 앞뒤 공백 제거
      minlength: [2, "닉네임은 최소 2자 이상이어야 합니다."],
      maxlength: [20, "닉네임 길이는 최대 20자입니다."],
      match: [
        /^[가-힣a-zA-Z0-9_-]+$/, // 한, 영, 숫, _, - OK
      ],
    },

    birthDate: {
      type: String, // 문자열로 저장 (8자리 숫자를 문자열로 처리)
      required: [true, "생년월일은 필수 항목입니다."],
      match: [
        /^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/,
        "생년월일은 8자리 형식이어야 합니다 (예: 20030913)",
      ],
      validate: {
        validator: function (v) {
          // 날짜 유효성 검사 (실제 존재하는 날짜인지 확인)
          if (!v || v.length !== 8) return false;

          const year = parseInt(v.substring(0, 4));
          const month = parseInt(v.substring(4, 6));
          const day = parseInt(v.substring(6, 8));

          // 현재 연도보다 미래가 아닌지 확인
          const currentYear = new Date().getFullYear();
          if (year > currentYear) return false;

          // JavaScript Date 객체로 실제 날짜 검증
          const date = new Date(year, month - 1, day);
          return (
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day
          );
        },
        message: "올바른 생년월일을 입력해주세요. (예: 19990913)",
      },
    },

    gender: {
      // 선택사항 !!
      type: String,
      enum: {
        values: ["F", "M", "N"], // N: 선택 안함
        message: "성별은 F(여성), M(남성), N(선택 안함) 중 하나여야 합니다.",
      },
      default: "N", // 기본값은 N
    },

    profileImage: {
      // 선택사항 !!
      type: String,
      default: null,

      validate: {
        validator: function (v) {
          // !v는 값이 없다면이라는 뜻
          if (!v) return true; // 값 없으면 통과 (선택사항이어서)

          // 정규식으로 이미지 파일 확장자 검증
          return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: "올바른 이미지 URL 형식이 아닙니다.",
      },
    },

    bio: {
      // 선택사항 !!
      type: String,
      maxlength: [100, "한줄소개는 최대 100자까지 입력할 수 있습니다."],
      trim: true,
      default: "",
    },

    isAdmin: {
      // 관리자 여부 - 일반 사용자는 접근 불가
      type: Boolean,
      default: false, // 기본값은 일반 사용자
    },

    createdAt: {
      type: Date,
      default: Date.now, // 계정 생성 시점
    },
  },
  {
    // 스키마 옵션

    timestamps: false, // Mongoose가 createdAt, updatedAt 자동 생성 안함 -> 왜?? 우리가 createdAt을 관리함.
    versionKey: false, // __v 필드 생성 안함 (버전 관리 필드)

    // toJSON : JSON 변환 시 동작 정의
    toJSON: {
      transform: function (doc, ret) {
        // doc : 원본 MongoDB 문서, ret: JSON으로 변환될 객체
        delete ret.password;
        return ret; // 비밀번호 필드 제거하고, 수정된 객체로 반환하는 것이다!
      },
    },
  }
);

// 인덱스 생성

userSchema.index({ email: 1 }); // 이메일로 검색할 때 빠르게 (로그인)
userSchema.index({ nickname: 1 }); // 닉네임으로 검색할 때 빠르게 (프로필조회)
userSchema.index({ createdAt: -1 }); // 가입일 최신순 정렬할 때 빠르게 (내림차순으로)

// 미들웨어 (특정 시점에 자동으로 실행되는 코드를 의미 !!)

// pre('save'): 데이터를 저장하기 "전에" 실행되는 함수
userSchema.pre("save", async function (next) {
  // 비번이 수정되지 않았다면 암호화 X
  if (!this.isModified("password")) {
    return next(); // 다음단계로~
  }

  try {
    // bcrypt로 비밀번호 해싱
    // salt로 암호화 강도 설정 (보통 10~12 정도..)

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt); // 원본 비번 -> 암호화된 비번으로 교체
    next();
  } catch (error) {
    next(error); // 에러 발생 시 다음 단계로 넘김 (저장 중단)
  }
});

// 인스턴스 메서드 (개별 사용자 객체가 가지는 함수들)

// matchPassword : 입력된 비밀번호와 저장된 비밀번호 비교

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
  // 결과는 true or false
};

// 스태틱 메서드 (모델 자체가 가지는 함수들 - 공용 도구 같은 개념 !)

// isEmailTaken, isNicknameTaken : 이메일, 닉네임 중복 체크

userSchema.statics.isEmailTaken = async function (email) {
  // 여기서 this는 User 모델 전체를 가리킨다.
  const user = await this.findOne({ email: email.toLowerCase() });
  return !!user; // user가 있으면 true, 없으면 false 반환 ( !!는 boolean 변환 )
};

userSchema.statics.isNicknameTaken = async function (nickname) {
  // 여기서 this는 User 모델 전체를 가리킨다.
  const user = await this.findOne({ nickname });
  return !!user; // user가 있으면 true, 없으면 false 반환 ( !!는 boolean 변환 )
};

// virtual 필드 (실제로 db상에 저장되지 않지만, 필요할 때마다 계산해서 보여주는 함수들)

// age : 현재 나이(만나이로) 계산
userSchema.virtual("age").get(function () {
  if (!this.birthDate) return null;

  // 생년월일 문자열 파싱 (예: "19990913" → year: 1999, month: 9, day: 13)
  const year = parseInt(this.birthDate.substring(0, 4));
  const month = parseInt(this.birthDate.substring(4, 6));
  const day = parseInt(this.birthDate.substring(6, 8));

  const today = new Date();
  let age = today.getFullYear() - year;

  // 생일이 아직 지나지 않았으면 나이를 1 빼기
  const hasNotHadBirthdayThisYear =
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day);

  if (hasNotHadBirthdayThisYear) {
    age--;
  }

  return age;
});

// daysSinceJoined: 가입한 지 몇 일 되었는지 자동으로 계산 (프로필에서 N일차 기록중! 띄우기 위함)
userSchema.virtual("daysSinceJoined").get(function () {
  if (!this.createdAt) return 1; // 가입일이 없으면 1일차로 처리

  // 가입일의 날짜만 추출 (시간은 무시하고 00:00:00으로 설정)
  const joinDate = new Date(this.createdAt);
  const joinDateOnly = new Date(
    joinDate.getFullYear(),
    joinDate.getMonth(),
    joinDate.getDate()
  );

  // 오늘 날짜 (시간은 무시하고 00:00:00으로 설정)
  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  // 날짜 차이 계산 (밀리초 → 일수 변환)
  const diffTime = todayOnly.getTime() - joinDateOnly.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // 가입 당일부터 1일차로 시작 (0일차가 X)
  return diffDays + 1;
});

// 기존 코드때문에 추가 (호환용))
userSchema.virtual("birthYear").get(function () {
  if (!this.birthDate) return null;
  return parseInt(this.birthDate.substring(0, 4));
});

// 모델 생성, 내보내기

// mongoose.model() :  스키마를 실제 사용할 수 있는 모델로 변환
// User : MongoDB 컬렉션 이름 (자동으로 users로 변환됨)
// userSchema : 위에서 만든 스키마 객체

module.exports = mongoose.model("User", userSchema);
