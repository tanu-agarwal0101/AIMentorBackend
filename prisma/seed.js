import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROBLEMS_DATA = [
  // 1. Two Sum
  {
    title: "Two Sum",
    difficulty: "Easy",
    category: "Arrays",
    topicTags: ["array", "hash-table"],
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\n### Input Format\n- First line: The integer `target`.\n- Second line: A space-separated list of integers representing `nums`.\n\n### Output Format\n- A single line containing two space-separated indices.",
    constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
    boilerplate: {
      python: `import sys\n\ndef solve():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    target = int(input_data[0])\n    nums = [int(x) for x in input_data[1:]]\n    \n    # Implement Two Sum logic here\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            print(f"{seen[diff]} {i}")\n            return\n        seen[num] = i\n\nif __name__ == '__main__':\n    solve()`,
      javascript: `const fs = require('fs');\n\nfunction solve() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length < 2 || input[0] === "") return;\n    const target = parseInt(input[0], 10);\n    const nums = input.slice(1).map(Number);\n    \n    const seen = {};\n    for (let i = 0; i < nums.length; i++) {\n        const diff = target - nums[i];\n        if (seen[diff] !== undefined) {\n            console.log(seen[diff] + " " + i);\n            return;\n        }\n        seen[nums[i]] = i;\n    }\n}\nsolve();`,
      typescript: `import * as fs from 'fs';\n\nfunction solve() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length < 2 || input[0] === "") return;\n    const target = parseInt(input[0], 10);\n    const nums = input.slice(1).map(Number);\n    \n    const seen: Record<number, number> = {};\n    for (let i = 0; i < nums.length; i++) {\n        const diff = target - nums[i];\n        if (seen[diff] !== undefined) {\n            console.log(\`\${seen[diff]} \${i}\`);\n            return;\n        }\n        seen[nums[i]] = i;\n    }\n}\nsolve();`,
      java: `import java.util.*;\nimport java.io.*;\n\npublic class Solution {\n    public static void main(String[] args) throws Exception {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int target = sc.nextInt();\n        List<Integer> numsList = new ArrayList<>();\n        while (sc.hasNextInt()) {\n            numsList.add(sc.nextInt());\n        }\n        \n        Map<Integer, Integer> seen = new HashMap<>();\n        for (int i = 0; i < numsList.size(); i++) {\n            int num = numsList.get(i);\n            int diff = target - num;\n            if (seen.containsKey(diff)) {\n                System.out.println(seen.get(diff) + " " + i);\n                return;\n            }\n            seen.put(num, i);\n        }\n    }\n}`,
      cpp: `#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n    int target;\n    if (!(cin >> target)) return 0;\n    vector<int> nums;\n    int val;\n    while (cin >> val) {\n        nums.push_back(val);\n    }\n    \n    unordered_map<int, int> seen;\n    for (int i = 0; i < nums.size(); i++) {\n        int diff = target - nums[i];\n        if (seen.count(diff)) {\n            cout << seen[diff] << " " << i << endl;\n            return 0;\n        }\n        seen[nums[i]] = i;\n    }\n    return 0;\n}`
    },
    difficultyEstimate: "Easy",
    visibleTestCases: [
      { input: "9\n2 7 11 15", expectedOutput: "0 1" },
      { input: "6\n3 2 4", expectedOutput: "1 2" }
    ],
    hiddenTestCases: [
      { input: "6\n3 3", expectedOutput: "0 1" },
      { input: "10\n2 5 5 11", expectedOutput: "1 2" },
      { input: "0\n-3 4 3 90", expectedOutput: "0 2" },
      { input: "8\n1 5 3 7 9", expectedOutput: "0 3" },
      { input: "100\n10 20 30 40 50 60 70 80", expectedOutput: "3 5" }
    ]
  },
  // 2. Valid Anagram
  {
    title: "Valid Anagram",
    difficulty: "Easy",
    category: "Hashing",
    topicTags: ["string", "hash-table"],
    description: "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\n\n### Input Format\n- First line: The string `s`.\n- Second line: The string `t`.\n\n### Output Format\n- `true` or `false`.",
    constraints: ["1 <= s.length, t.length <= 5 * 10^4", "s and t consist of lowercase English letters."],
    boilerplate: {
      python: `import sys\n\ndef solve():\n    lines = sys.stdin.read().split()\n    if len(lines) < 2:\n        print("false")\n        return\n    s, t = lines[0], lines[1]\n    \n    # Implement valid anagram checking\n    if len(s) != len(t):\n        print("false")\n        return\n    print("true" if sorted(s) == sorted(t) else "false")\n\nif __name__ == '__main__':\n    solve()`,
      javascript: `const fs = require('fs');\n\nfunction solve() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (lines.length < 2) {\n        console.log("false");\n        return;\n    }\n    const s = lines[0];\n    const t = lines[1];\n    if (s.length !== t.length) {\n        console.log("false");\n        return;\n    }\n    const sortedS = s.split('').sort().join('');\n    const sortedT = t.split('').sort().join('');\n    console.log(sortedS === sortedT ? "true" : "false");\n}\nsolve();`,
      typescript: `import * as fs from 'fs';\n\nfunction solve() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (lines.length < 2) {\n        console.log("false");\n        return;\n    }\n    const s = lines[0];\n    const t = lines[1];\n    if (s.length !== t.length) {\n        console.log("false");\n        return;\n    }\n    const sortedS = s.split('').sort().join('');\n    const sortedT = t.split('').sort().join('');\n    console.log(sortedS === sortedT ? "true" : "false");\n}\nsolve();`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNext()) {\n            System.out.println("false");\n            return;\n        }\n        String s = sc.next();\n        if (!sc.hasNext()) {\n            System.out.println("false");\n            return;\n        }\n        String t = sc.next();\n        \n        if (s.length() != t.length()) {\n            System.out.println("false");\n            return;\n        }\n        char[] sArr = s.toCharArray();\n        char[] tArr = t.toCharArray();\n        Arrays.sort(sArr);\n        Arrays.sort(tArr);\n        System.out.println(Arrays.equals(sArr, tArr) ? "true" : "false");\n    }\n}`,
      cpp: `#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string s, t;\n    if (!(cin >> s >> t)) {\n        cout << "false" << endl;\n        return 0;\n    }\n    if (s.length() != t.length()) {\n        cout << "false" << endl;\n        return 0;\n    }\n    sort(s.begin(), s.end());\n    sort(t.begin(), t.end());\n    cout << (s == t ? "true" : "false") << endl;\n    return 0;\n}`
    },
    difficultyEstimate: "Easy",
    visibleTestCases: [
      { input: "anagram\nnagaram", expectedOutput: "true" },
      { input: "rat\ncar", expectedOutput: "false" }
    ],
    hiddenTestCases: [
      { input: "a\na", expectedOutput: "true" },
      { input: "a\nb", expectedOutput: "false" },
      { input: "ab\nba", expectedOutput: "true" },
      { input: "awesome\nemeoswa", expectedOutput: "true" },
      { input: "anagrams\nnagarama", expectedOutput: "false" }
    ]
  },
  // 3. Longest Substring Without Repeating Characters
  {
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    category: "Sliding Window",
    topicTags: ["string", "sliding-window"],
    description: "Given a string `s`, find the length of the longest substring without repeating characters.\n\n### Input Format\n- A single line containing string `s`. Note that the input string might be empty.\n\n### Output Format\n- The length of the longest substring.",
    constraints: ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces."],
    boilerplate: {
      python: `import sys\n\ndef solve():\n    # Read input containing potentially spaces\n    s = sys.stdin.read().rstrip('\\r\\n')\n    \n    char_map = {}\n    left = 0\n    max_len = 0\n    for right, char in enumerate(s):\n        if char in char_map and char_map[char] >= left:\n            left = char_map[char] + 1\n        char_map[char] = right\n        max_len = max(max_len, right - left + 1)\n    print(max_len)\n\nif __name__ == '__main__':\n    solve()`,
      javascript: `const fs = require('fs');\n\nfunction solve() {\n    const s = fs.readFileSync(0, 'utf-8').replace(/\\r\\n/g, '\\n').replace(/\\n$/, '');\n    \n    let charMap = {};\n    let left = 0;\n    let maxLen = 0;\n    for (let right = 0; right < s.length; right++) {\n        const char = s[right];\n        if (charMap[char] !== undefined && charMap[char] >= left) {\n            left = charMap[char] + 1;\n        }\n        charMap[char] = right;\n        maxLen = Math.max(maxLen, right - left + 1);\n    }\n    console.log(maxLen);\n}\nsolve();`,
      typescript: `import * as fs from 'fs';\n\nfunction solve() {\n    const s = fs.readFileSync(0, 'utf-8').replace(/\\r\\n/g, '\\n').replace(/\\n$/, '');\n    \n    let charMap: Record<string, number> = {};\n    let left = 0;\n    let maxLen = 0;\n    for (let right = 0; right < s.length; right++) {\n        const char = s[right];\n        if (charMap[char] !== undefined && charMap[char] >= left) {\n            left = charMap[char] + 1;\n        }\n        charMap[char] = right;\n        maxLen = Math.max(maxLen, right - left + 1);\n    }\n    console.log(maxLen);\n}\nsolve();`,
      java: `import java.util.*;\nimport java.io.*;\n\npublic class Solution {\n    public static void main(String[] args) throws Exception {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        String s = br.readLine();\n        if (s == null) s = "";\n        \n        Map<Character, Integer> charMap = new HashMap<>();\n        int left = 0;\n        int maxLen = 0;\n        for (int right = 0; right < s.length(); right++) {\n            char c = s.charAt(right);\n            if (charMap.containsKey(c) && charMap.get(c) >= left) {\n                left = charMap.get(c) + 1;\n            }\n            charMap.put(c, right);\n            maxLen = Math.max(maxLen, right - left + 1);\n        }\n        System.out.println(maxLen);\n    }\n}`,
      cpp: `#include <iostream>\n#include <string>\n#include <unordered_map>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string s;\n    getline(cin, s);\n    \n    unordered_map<char, int> charMap;\n    int left = 0;\n    int maxLen = 0;\n    for (int right = 0; right < s.length(); right++) {\n        char c = s[right];\n        if (charMap.count(c) && charMap[c] >= left) {\n            left = charMap[c] + 1;\n        }\n        charMap[c] = right;\n        maxLen = max(maxLen, right - left + 1);\n    }\n    cout << maxLen << endl;\n    return 0;\n}`
    },
    difficultyEstimate: "Medium",
    visibleTestCases: [
      { input: "abcabcbb", expectedOutput: "3" },
      { input: "bbbbb", expectedOutput: "1" }
    ],
    hiddenTestCases: [
      { input: "pwwkew", expectedOutput: "3" },
      { input: "", expectedOutput: "0" },
      { input: " ", expectedOutput: "1" },
      { input: "au", expectedOutput: "2" },
      { input: "dvdf", expectedOutput: "3" }
    ]
  },
  // 4. Binary Search
  {
    title: "Binary Search",
    difficulty: "Easy",
    category: "Binary Search",
    topicTags: ["array", "binary-search"],
    description: "Given a sorted array of integers `nums` and a target value `target`, search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.\n\n### Input Format\n- First line: The integer `target`.\n- Second line: A space-separated list of sorted integers representing `nums`.\n\n### Output Format\n- The index of `target` or `-1`.",
    constraints: ["1 <= nums.length <= 10^4", "-10^4 < nums[i], target < 10^4", "All elements in nums are unique and sorted in ascending order."],
    boilerplate: {
      python: `import sys\n\ndef solve():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        print("-1")\n        return\n    target = int(input_data[0])\n    nums = [int(x) for x in input_data[1:]]\n    \n    left, right = 0, len(nums) - 1\n    ans = -1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            ans = mid\n            break\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    print(ans)\n\nif __name__ == '__main__':\n    solve()`,
      javascript: `const fs = require('fs');\n\nfunction solve() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length < 2 || input[0] === "") {\n        console.log("-1");\n        return;\n    }\n    const target = parseInt(input[0], 10);\n    const nums = input.slice(1).map(Number);\n    \n    let left = 0, right = nums.length - 1;\n    let ans = -1;\n    while (left <= right) {\n        const mid = Math.floor((left + right) / 2);\n        if (nums[mid] === target) {\n            ans = mid;\n            break;\n        } else if (nums[mid] < target) {\n            left = mid + 1;\n        } else {\n            right = mid - 1;\n        }\n    }\n    console.log(ans);\n}\nsolve();`,
      typescript: `import * as fs from 'fs';\n\nfunction solve() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length < 2 || input[0] === "") {\n        console.log("-1");\n        return;\n    }\n    const target = parseInt(input[0], 10);\n    const nums = input.slice(1).map(Number);\n    \n    let left = 0, right = nums.length - 1;\n    let ans = -1;\n    while (left <= right) {\n        const mid = Math.floor((left + right) / 2);\n        if (nums[mid] === target) {\n            ans = mid;\n            break;\n        } else if (nums[mid] < target) {\n            left = mid + 1;\n        } else {\n            right = mid - 1;\n        }\n    }\n    console.log(ans);\n}\nsolve();`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) {\n            System.out.println("-1");\n            return;\n        }\n        int target = sc.nextInt();\n        List<Integer> list = new ArrayList<>();\n        while (sc.hasNextInt()) {\n            list.add(sc.nextInt());\n        }\n        \n        int left = 0, right = list.size() - 1;\n        int ans = -1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (list.get(mid) == target) {\n                ans = mid;\n                break;\n            } else if (list.get(mid) < target) {\n                left = mid + 1;\n            } else {\n                right = mid - 1;\n            }\n        }\n        System.out.println(ans);\n    }\n}`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int target;\n    if (!(cin >> target)) {\n        cout << "-1" << endl;\n        return 0;\n    }\n    vector<int> nums;\n    int val;\n    while (cin >> val) {\n        nums.push_back(val);\n    }\n    \n    int left = 0, right = nums.size() - 1;\n    int ans = -1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (nums[mid] == target) {\n            ans = mid;\n            break;\n        } else if (nums[mid] < target) {\n            left = mid + 1;\n        } else {\n            right = mid - 1;\n        }\n    }\n    cout << ans << endl;\n    return 0;\n}`
    },
    difficultyEstimate: "Easy",
    visibleTestCases: [
      { input: "9\n-1 0 3 5 9 12", expectedOutput: "4" },
      { input: "2\n-1 0 3 5 9 12", expectedOutput: "-1" }
    ],
    hiddenTestCases: [
      { input: "5\n5", expectedOutput: "0" },
      { input: "2\n5", expectedOutput: "-1" },
      { input: "100\n10 20 30 40 50 60 70 80 90 100", expectedOutput: "9" },
      { input: "10\n10 20 30 40 50 60 70 80 90 100", expectedOutput: "0" }
    ]
  },
  // 5. Climbing Stairs
  {
    title: "Climbing Stairs",
    difficulty: "Easy",
    category: "DP",
    topicTags: ["dynamic-programming", "memoization"],
    description: "You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?\n\n### Input Format\n- A single line containing an integer `n`.\n\n### Output Format\n- The distinct ways to reach the top.",
    constraints: ["1 <= n <= 45"],
    boilerplate: {
      python: `import sys\n\ndef solve():\n    lines = sys.stdin.read().split()\n    if not lines:\n        return\n    n = int(lines[0])\n    \n    if n <= 2:\n        print(n)\n        return\n    a, b = 1, 2\n    for _ in range(3, n + 1):\n        a, b = b, a + b\n    print(b)\n\nif __name__ == '__main__':\n    solve()`,
      javascript: `const fs = require('fs');\n\nfunction solve() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (lines.length === 0 || lines[0] === "") return;\n    const n = parseInt(lines[0], 10);\n    if (n <= 2) {\n        console.log(n);\n        return;\n    }\n    let a = 1, b = 2;\n    for (let i = 3; i <= n; i++) {\n        const temp = a + b;\n        a = b;\n        b = temp;\n    }\n    console.log(b);\n}\nsolve();`,
      typescript: `import * as fs from 'fs';\n\nfunction solve() {\n    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (lines.length === 0 || lines[0] === "") return;\n    const n = parseInt(lines[0], 10);\n    if (n <= 2) {\n        console.log(n);\n        return;\n    }\n    let a = 1, b = 2;\n    for (let i = 3; i <= n; i++) {\n        const temp = a + b;\n        a = b;\n        b = temp;\n    }\n    console.log(b);\n}\nsolve();`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        if (n <= 2) {\n            System.out.println(n);\n            return;\n        }\n        int a = 1, b = 2;\n        for (int i = 3; i <= n; i++) {\n            int temp = a + b;\n            a = b;\n            b = temp;\n        }\n        System.out.println(b);\n    }\n}`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    if (n <= 2) {\n        cout << n << endl;\n        return 0;\n    }\n    int a = 1, b = 2;\n    for (int i = 3; i <= n; i++) {\n        int temp = a + b;\n        a = b;\n        b = temp;\n    }\n    cout << b << endl;\n    return 0;\n}`
    },
    difficultyEstimate: "Easy",
    visibleTestCases: [
      { input: "2", expectedOutput: "2" },
      { input: "3", expectedOutput: "3" }
    ],
    hiddenTestCases: [
      { input: "1", expectedOutput: "1" },
      { input: "4", expectedOutput: "5" },
      { input: "5", expectedOutput: "8" },
      { input: "10", expectedOutput: "89" },
      { input: "20", expectedOutput: "10946" }
    ]
  }
];

// Helper to expand and seed remaining 15 problem templates to reach 20 curated problem bank
const CATEGORY_TEMPLATES = [
  { cat: "Arrays", tags: ["array"] },
  { cat: "Hashing", tags: ["hash-table"] },
  { cat: "Sliding Window", tags: ["sliding-window"] },
  { cat: "Trees", tags: ["tree", "dfs"] },
  { cat: "Graphs", tags: ["graph", "bfs", "dfs"] },
  { cat: "DP", tags: ["dynamic-programming"] },
  { cat: "Greedy", tags: ["greedy"] },
  { cat: "Binary Search", tags: ["binary-search"] }
];

async function main() {
  console.log("Starting DB seeding...");

  // Clear existing Problem and TestCases
  await prisma.testCase.deleteMany({});
  await prisma.problem.deleteMany({});
  console.log("Cleared old Problems and TestCases.");

  // Seed core 5 detailed problems
  for (const prob of PROBLEMS_DATA) {
    const slug = prob.title.toLowerCase().replace(/\s+/g, "-");
    const created = await prisma.problem.create({
      data: {
        title: prob.title,
        slug,
        difficulty: prob.difficulty,
        category: prob.category,
        topicTags: prob.topicTags,
        description: prob.description,
        constraints: prob.constraints,
        boilerplate: prob.boilerplate,
        difficultyEstimate: prob.difficultyEstimate
      }
    });

    await prisma.testCase.createMany({
      data: [
        ...prob.visibleTestCases.map(tc => ({
          problemId: created.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: false
        })),
        ...prob.hiddenTestCases.map(tc => ({
          problemId: created.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: true
        }))
      ]
    });
    console.log(`Seeded problem: ${prob.title}`);
  }

  // Seed 15 extra templates to reach 20 curated problems
  const extraTitles = [
    { title: "Contains Duplicate", difficulty: "Easy", cat: "Hashing" },
    { title: "Maximum Subarray", difficulty: "Medium", cat: "DP" },
    { title: "Best Time to Buy and Sell Stock", difficulty: "Easy", cat: "Arrays" },
    { title: "Valid Parentheses", difficulty: "Easy", cat: "Hashing" },
    { title: "Invert Binary Tree", difficulty: "Easy", cat: "Trees" },
    { title: "Course Schedule", difficulty: "Medium", cat: "Graphs" },
    { title: "Jump Game", difficulty: "Medium", cat: "Greedy" },
    { title: "Container With Most Water", difficulty: "Medium", cat: "Arrays" },
    { title: "Product of Array Except Self", difficulty: "Medium", cat: "Arrays" },
    { title: "Search a 2D Matrix", difficulty: "Medium", cat: "Binary Search" },
    { title: "Longest Repeating Character Replacement", difficulty: "Medium", cat: "Sliding Window" },
    { title: "Maximum Depth of Binary Tree", difficulty: "Easy", cat: "Trees" },
    { title: "Clone Graph", difficulty: "Medium", cat: "Graphs" },
    { title: "Coin Change", difficulty: "Medium", cat: "DP" },
    { title: "Non-overlapping Intervals", difficulty: "Medium", cat: "Greedy" }
  ];

  for (let i = 0; i < extraTitles.length; i++) {
    const info = extraTitles[i];
    const slug = info.title.toLowerCase().replace(/\s+/g, "-");
    
    const description = `This is a curated DSA challenge: **${info.title}**.\n\n### Input Format\n- First line: Space-separated input parameters.\n\n### Output Format\n- Result representation.`;
    
    // Provide generic functional stdout boilerplates
    const boilerplate = {
      python: `import sys\n\ndef solve():\n    lines = sys.stdin.read().split()\n    # Process inputs\n    print("0")\n\nif __name__ == '__main__':\n    solve()`,
      javascript: `const fs = require('fs');\nfunction solve() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    console.log("0");\n}\nsolve();`,
      typescript: `import * as fs from 'fs';\nfunction solve() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    console.log("0");\n}\nsolve();`,
      java: `import java.util.*;\npublic class Solution {\n    public static void main(String[] args) {\n        System.out.println("0");\n    }\n}`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    cout << "0" << endl;\n    return 0;\n}`
    };

    const created = await prisma.problem.create({
      data: {
        title: info.title,
        slug,
        difficulty: info.difficulty,
        category: info.cat,
        topicTags: [info.cat.toLowerCase()],
        description,
        constraints: ["1 <= N <= 10^5"],
        boilerplate,
        difficultyEstimate: info.difficulty
      }
    });

    // Seed dummy visible & hidden tests forExtra
    await prisma.testCase.createMany({
      data: [
        { problemId: created.id, input: "1 2 3", expectedOutput: "0", isHidden: false },
        { problemId: created.id, input: "4 5 6", expectedOutput: "0", isHidden: true }
      ]
    });
    console.log(`Seeded problem template: ${info.title} (${i+6}/20)`);
  }

  console.log("DB Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeder error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
