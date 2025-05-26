// 페이지 설정
const pageConfig = {
  pages: [
    {
      id: 1,
      title: "곱셈 연습 1",
      file: "page1.html",
      problems: [
        { question: "375 × 5", answer: "1875" },
        { question: "375 × 50", answer: "18750" },
        { question: "461 × 3", answer: "1383", type: "vertical" },
        { question: "461 × 30", answer: "13830", type: "vertical" },
      ],
    },
    {
      id: 2,
      title: "곱셈 연습 2",
      file: "page2.html",
      problems: [
        { question: "284 × 6", answer: "1704" },
        { question: "284 × 60", answer: "17040" },
        { question: "352 × 4", answer: "1408", type: "vertical" },
        { question: "352 × 40", answer: "14080", type: "vertical" },
      ],
    },
    {
      id: 3,
      title: "곱셈 연습 3",
      file: "page3.html",
      problems: [
        { question: "196 × 7", answer: "1372" },
        { question: "196 × 70", answer: "13720" },
        { question: "273 × 5", answer: "1365", type: "vertical" },
        { question: "273 × 50", answer: "13650", type: "vertical" },
      ],
    },
    {
      id: 4,
      title: "곱셈 연습 4",
      file: "page4.html",
      problems: [
        { question: "428 × 3", answer: "1284" },
        { question: "428 × 30", answer: "12840" },
        { question: "567 × 2", answer: "1134", type: "vertical" },
        { question: "567 × 20", answer: "11340", type: "vertical" },
      ],
    },
    {
      id: 5,
      title: "곱셈 연습 5",
      file: "page5.html",
      problems: [
        { question: "315 × 8", answer: "2520" },
        { question: "315 × 80", answer: "25200" },
        { question: "492 × 6", answer: "2952", type: "vertical" },
        { question: "492 × 60", answer: "29520", type: "vertical" },
      ],
    },
    {
      id: 6,
      title: "곱셈 연습 6",
      file: "page6.html",
      problems: [
        { question: "638 × 4", answer: "2552" },
        { question: "638 × 40", answer: "25520" },
        { question: "729 × 3", answer: "2187", type: "vertical" },
        { question: "729 × 30", answer: "21870", type: "vertical" },
      ],
    },
    {
      id: 7,
      title: "곱셈 연습 7",
      file: "page7.html",
      problems: [
        { question: "856 × 5", answer: "4280" },
        { question: "856 × 50", answer: "42800" },
        { question: "943 × 7", answer: "6601", type: "vertical" },
        { question: "943 × 70", answer: "66010", type: "vertical" },
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
