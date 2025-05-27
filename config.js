// 페이지 설정
const pageConfig = {
  pages: [
    {
      id: 1,
      title: "만 알아보기",
      file: "page1.html",
      description:
        "1000의 10개인 수를 10000 또는 1만이라 쓰고, 만 또는 일만 이라고 읽습니다",
      problems: [
        {
          question: "9996 - 9997 - __ - __ - 10000",
          answer: ["9998", "9999"],
          type: "fill_blanks",
        },
        {
          question: "9960 - __ - __ - 9990 - 10000",
          answer: ["9970", "9980"],
          type: "fill_blanks",
        },
        {
          question: "9600 - __ - 9800 - __ - 10000",
          answer: ["9700", "9900"],
          type: "fill_blanks",
        },
        {
          question: "6000 - 7000 - __ - __ - 10000",
          answer: ["8000", "9000"],
          type: "fill_blanks",
        },
      ],
    },
    {
      id: 2,
      title: "다섯 자리 수 알아보기",
      file: "page2.html",
      description: "46571 -> 4만 6천 5백 7십 1",
      problems: [
        {
          question: "46571",
          answer: "사만 육천오백칠십일",
          type: "number_to_korean",
        },
        {
          question: "46571 = 40000+6000+500+70+1",
          answer: true,
          type: "decomposition",
        },
        {
          question: "93475",
          answer: "구만 삼천사백칠십오",
          type: "number_to_korean",
        },
        {
          question: "56871",
          answer: "오만 육천팔백칠십일",
          type: "number_to_korean",
        },
      ],
    },
    {
      id: 3,
      title: "십만, 백만, 천만을 알아보기",
      file: "page3.html",
      description: "1만 -> 10만 -> 100만 -> 1000만",
      problems: [
        {
          question: "10000이 86297개인 수는",
          answer: "862970000",
          type: "calculation",
        },
        { question: "1만이 10개", answer: "10만", type: "unit_conversion" },
        { question: "10만이 10개", answer: "100만", type: "unit_conversion" },
        { question: "100만이 10개", answer: "1000만", type: "unit_conversion" },
      ],
    },
    {
      id: 4,
      title: "억을 알아보기",
      file: "page4.html",
      description: "1억은 1000만이 10개인 수에요!",
      problems: [
        {
          question: "1000만이 10개인 수는",
          answer: "1억",
          type: "unit_conversion",
        },
        {
          question: "1억이 8670개, 1만이 1593개, 1이 4260개인 수는",
          answer: "867015934260",
          type: "place_value",
        },
      ],
    },
    {
      id: 5,
      title: "조를 알아보기",
      file: "page5.html",
      description: "1조는 1000억이 10개인 수에요!",
      problems: [
        {
          question: "1000억이 10개인 수는",
          answer: "1조",
          type: "unit_conversion",
        },
        {
          question:
            "1조가 3745개, 1억이 8670개, 1만이 15937개, 1이 4260개인 수는",
          answer: "374586701593742600",
          type: "place_value",
        },
      ],
    },
    {
      id: 6,
      title: "뛰어세기",
      file: "page6.html",
      description: "만씩 뛰어세기: 만의 자리 숫자가 1씩 커져.",
      problems: [
        {
          question: "25000 - 35000 - __ - __",
          answer: ["45000", "55000"],
          type: "skip_counting",
        },
        {
          question: "10억씩 뛰어 세기: 910억 - 920억 - __ - 940억 - __",
          answer: ["930억", "950억"],
          type: "skip_counting",
        },
        {
          question: "10만씩 뛰어 세기: 1500000 - 2500000 - __ - __",
          answer: ["3500000", "4500000"],
          type: "skip_counting",
        },
      ],
    },
    {
      id: 7,
      title: "수의 크기를 비교하기",
      file: "page7.html",
      description: "두 수의 크기를 비교하세요.",
      problems: [
        { question: "214590 > 35710", answer: true, type: "comparison" },
        { question: "2790340 > 2770340", answer: true, type: "comparison" },
        { question: "1632만 ○ 971만", answer: ">", type: "comparison_symbol" },
        {
          question: "4670000000 ○ 4770000000",
          answer: "<",
          type: "comparison_symbol",
        },
      ],
    },
  ],

  // 현재 페이지 정보 가져오기
  getCurrentPage: function () {
    const currentFile =
      window.location.pathname.split("/").pop() || "index.html";
    if (currentFile === "index.html") return null;
    return this.pages.find((page) => page.file === currentFile);
  },

  // 이전/다음 페이지 정보
  getNavigation: function (currentPageId) {
    const currentIndex = this.pages.findIndex(
      (page) => page.id === currentPageId
    );
    return {
      prev: currentIndex > 0 ? this.pages[currentIndex - 1] : null,
      next:
        currentIndex < this.pages.length - 1
          ? this.pages[currentIndex + 1]
          : null,
      current: this.pages[currentIndex],
    };
  },
};
