const line = document.createElement('div');
line.style.position = 'fixed';
line.style.top = '50%';
line.style.left = '0';
line.style.width = '100%';
line.style.height = '2px';
line.style.backgroundColor = 'red';
line.style.zIndex = '9999';
document.body.appendChild(line);
const h = window.innerHeight;
export const obj = {
    "slide01": [
        { isCode: false, file: "001.js", scroll: 0, highlight: [] },
        { isCode: false, file: "002.js", scroll: 0, highlight: [] },
        { isCode: true, file: "003.js", scroll: h * .75, highlight: [] },
        { isCode: false, file: "004.js", scroll: 0, highlight: [] },
        { isCode: false, file: "005.js", scroll: 0, highlight: [] },
        { isCode: false, file: "006.js", scroll: 0, highlight: [] },
        { isCode: false, file: "007.js", scroll: 0, highlight: [] },
    ],
    "slide02": [
        { isCode: true, file: "001.js", scroll: h * .52, highlight: [] },
        { isCode: true, file: "002.js", scroll: h * .54, highlight: [[0, 100]] },
        { isCode: true, file: "003.js", scroll: h * .6, highlight: [[14, 29]] },
        { isCode: true, file: "004.js", scroll: h * .67, highlight: [[33, 51]] },
        { isCode: true, file: "005.js", scroll: h * .69, highlight: [[33, 34], [54, 100]] },
        { isCode: true, file: "006.js", scroll: h * .65, highlight: [[0, 4], [21, 21]] },
        { isCode: true, file: "007.js", scroll: h * .72, highlight: [[74, 74]] },
        { isCode: true, file: "008.js", scroll: h * .70, highlight: [] },
        { isCode: true, file: "009.js", scroll: h * .71, highlight: [[73, 100]] },
        { isCode: false, file: "010.js", scroll: 0, highlight: [] },
        { isCode: false, file: "011.js", scroll: 0, highlight: [] },
    ],
    "slide03": [
        { isCode: true, file: "001.js", scroll: h * .7, highlight: [] },
        { isCode: true, file: "002.js", scroll: h * .81, highlight: [[40, 46], [48, 54]] },
        { isCode: true, file: "003.js", scroll: h * .8, highlight: [[44, 72]] },
        { isCode: true, file: "004.js", scroll: h * .82, highlight: [[57, 69]] },
        { isCode: true, file: "005.js", scroll: h * .985, highlight: [[93, 100]] },
        { isCode: true, file: "006.js", scroll: h * 1.115, highlight: [[109, 109]] },
        { isCode: true, file: "007.js", scroll: h * 1.17, highlight: [[128, 146]] },
        { isCode: true, file: "008.js", scroll: h * .76, highlight: [[39, 45]] },
        { isCode: true, file: "009.js", scroll: h * .78, highlight: [[44, 84]] },
        { isCode: true, file: "010.js", scroll: h * 0.93, highlight: [[116, 120]] },
        { isCode: true, file: "011.js", scroll: h * 1.23, highlight: [[166, 168]] },
    ],
    "slide04": [
        { isCode: true, file: "001.js", scroll: h * 1.23, highlight: [[174, 179]] },
        { isCode: true, file: "002.js", scroll: h * .97, highlight: [[122, 151]] },
        { isCode: true, file: "003.js", scroll: h * .58, highlight: [[6, 10]] },
        { isCode: true, file: "004.js", scroll: h * .59, highlight: [[12, 18]] },
        { isCode: true, file: "005.js", scroll: h * .64, highlight: [[16, 36]] },
        { isCode: true, file: "006.js", scroll: h * .70, highlight: [[32, 63]] },
        { isCode: true, file: "007.js", scroll: h * .78, highlight: [[66, 88]] },
        { isCode: true, file: "008.js", scroll: h * .84, highlight: [[87, 96]] },
        { isCode: true, file: "009.js", scroll: h * 1.41, highlight: [[257, 271]] },
        { isCode: true, file: "010.js", scroll: h, highlight: [[132, 135]] },
    ],
    "slide05": [
        { isCode: true, file: "001.js", scroll: h * 1.17, highlight: [[170, 209]] },
        { isCode: true, file: "002.js", scroll: h * 1.8, highlight: [[346, 356], [387, 390]] },
    ],
    "slide06": [
        { isCode: false, file: "001.js", scroll: 0, highlight: [] },
        { isCode: true, file: "002.js", scroll: h * 1.85, highlight: [] },
        { isCode: true, file: "003.js", scroll: h * 1.85, highlight: [[357, 363], [403, 405], [413, 415]] },
        { isCode: true, file: "004.js", scroll: h, highlight: [[115, 140]] },
        { isCode: true, file: "005.js", scroll: h * 2.05, highlight: [[440, 441]] },
    ],
    "slide07": [
        { isCode: true, file: "001.js", scroll: 300, highlight: [] },
        { isCode: true, file: "002.js", scroll: 1300, highlight: [] },
        { isCode: false, file: "003.js", scroll: 1300, highlight: [] },
        { isCode: false, file: "004.js", scroll: 1300, highlight: [] },
        { isCode: false, file: "005.js", scroll: 1300, highlight: [] },
        { isCode: false, file: "006.js", scroll: 1300, highlight: [] },
        { isCode: false, file: "007.js", scroll: 1300, highlight: [] },
        { isCode: false, file: "008.js", scroll: 1300, highlight: [] },
        { isCode: false, file: "009.js", scroll: 1300, highlight: [] },
        { isCode: false, file: "010.js", scroll: 1300, highlight: [] },
        { isCode: false, file: "011.js", scroll: 1300, highlight: [] },
    ],
    "slide08": [
        { isCode: true, file: "001.js", scroll: 0, highlight: [] },
        { isCode: true, file: "002.js", scroll: 1300, highlight: [] },
        { isCode: true, file: "003.js", scroll: 1500, highlight: [] },
        { isCode: true, file: "004.js", scroll: 1500, highlight: [] },
        { isCode: true, file: "005.js", scroll: 1500, highlight: [] },
        { isCode: true, file: "006.js", scroll: 1500, highlight: [] },
        { isCode: true, file: "007.js", scroll: 1500, highlight: [] },
        { isCode: true, file: "008.js", scroll: 1500, highlight: [] },
        { isCode: true, file: "009.js", scroll: 1500, highlight: [] },
        { isCode: true, file: "010.js", scroll: 1500, highlight: [] },
        { isCode: true, file: "011.js", scroll: 1500, highlight: [] },
        { isCode: true, file: "012.js", scroll: 1500, highlight: [] },
        { isCode: true, file: "013.js", scroll: 1500, highlight: [] },
        { isCode: true, file: "014.js", scroll: 1500, highlight: [] },
    ],
    "slide09": [
        { isCode: true, file: "001.js", scroll: 1800, highlight: [] },
        { isCode: true, file: "002.js", scroll: 1800, highlight: [] },
        { isCode: true, file: "003.js", scroll: 1500, highlight: [] },
    ],
    "slide10": [
        { isCode: true, file: "001.js", scroll: 0, highlight: [[10, 25]] },
        { isCode: true, file: "002.js", scroll: 1400, highlight: [[369, 379]] },
        { isCode: true, file: "003.js", scroll: 1500, highlight: [[379, 395]] },
        { isCode: true, file: "final.js", scroll: 1500, highlight: [[379, 395]] },
    ]
};
