const questions = [
    {
        id: 1,
        question: "Exam is in 5 days. What should you do first?",
        options: [
            "Start studying random subjects",
            "Make a clear study timetable",
            "Read only your favorite subject",
            "Watch study videos without planning"
        ],
        answer: "Make a clear study timetable"
    },
    {
        id: 2,
        question: "Best place to study?",
        options: [
            "Quiet place with minimal distractions",
            "Slightly noisy place with music",
            "Bed with comfort",
            "Anywhere with phone nearby"
        ],
        answer: "Quiet place with minimal distractions"
    },
    {
        id: 3,
        question: "Best way to remember lessons?",
        options: [
            "Read notes multiple times",
            "Highlight everything",
            "Active recall + practice questions",
            "Watch explanation videos only"
        ],
        answer: "Active recall + practice questions"
    },
    {
        id: 4,
        question: "Study session timing?",
        options: [
            "20 minutes then break",
            "25–50 minutes with short breaks",
            "2 hours nonstop",
            "Study only when you feel like"
        ],
        answer: "25–50 minutes with short breaks"
    },
    {
        id: 5,
        question: "Phone usage while studying?",
        options: [
            "Keep it silent near you",
            "Use only for study apps",
            "Keep it away or turn it off",
            "Check it during breaks only"
        ],
        answer: "Keep it away or turn it off"
    },
    {
        id: 6,
        question: "Before exam day?",
        options: [
            "Revise important notes",
            "Study everything again quickly",
            "Focus on weak areas only",
            "Learn new lessons"
        ],
        answer: "Revise important notes"
    },
    {
        id: 7,
        question: "Night before exam?",
        options: [
            "Revise lightly and sleep well",
            "Study till very late night",
            "Wake up early and study more",
            "Stay awake whole night"
        ],
        answer: "Revise lightly and sleep well"
    },
    {
        id: 8,
        question: "Don’t understand a lesson?",
        options: [
            "Re-read notes again",
            "Watch videos again",
            "Ask teacher/friends + practice",
            "Skip and come back later"
        ],
        answer: "Ask teacher/friends + practice"
    },
    {
        id: 9,
        question: "Time management method?",
        options: [
            "Make a flexible plan",
            "Make a clear study timetable",
            "Study based on mood",
            "Do easiest subjects first always"
        ],
        answer: "Make a clear study timetable"
    },
    {
        id: 10,
        question: "During exam?",
        options: [
            "Answer easy questions first",
            "Read carefully + manage time properly",
            "Spend more time on hard questions",
            "Rush to finish early"
        ],
        answer: "Read carefully + manage time properly"
    }
];

// Function to shuffle questions and options
function getShuffledQuestions() {
    let shuffled = [...questions].sort(() => Math.random() - 0.5);
    shuffled.forEach(q => {
        q.shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
    });
    return shuffled;
}
