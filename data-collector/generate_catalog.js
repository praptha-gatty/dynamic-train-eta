const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Master verified list for all stations in active routes
const VERIFIED_STATIONS = {
    // Madhya Pradesh (Indore - Bhopal - Bina)
    "DADN": { name: "Dr. Ambedkar Nagar", city: "Mhow", state: "Madhya Pradesh", lat: 22.5518, lon: 75.7607 },
    "HKH":  { name: "Haranya Kheri", city: "Indore", state: "Madhya Pradesh", lat: 22.5855, lon: 75.8012 },
    "RAU":  { name: "Rau", city: "Indore", state: "Madhya Pradesh", lat: 22.6317, lon: 75.8286 },
    "RJQ":  { name: "Rajendranagar", city: "Indore", state: "Madhya Pradesh", lat: 22.6689, lon: 75.8452 },
    "LKMN": { name: "Lokmanya Nagar", city: "Indore", state: "Madhya Pradesh", lat: 22.6953, lon: 75.8569 },
    "SFNR": { name: "Saifinagar Halt", city: "Indore", state: "Madhya Pradesh", lat: 22.7058, lon: 75.8614 },
    "INDB": { name: "Indore Jn", city: "Indore", state: "Madhya Pradesh", lat: 22.7176, lon: 75.8684 },
    "LMNR": { name: "Lakshmibai Ngr", city: "Indore", state: "Madhya Pradesh", lat: 22.7485, lon: 75.8596 },
    "MGG":  { name: "Mangliya Gaon", city: "Indore", state: "Madhya Pradesh", lat: 22.8092, lon: 75.9184 },
    "BLAX": { name: "Barlai", city: "Dewas", state: "Madhya Pradesh", lat: 22.8711, lon: 75.9723 },
    "BNJN": { name: "Binjana", city: "Dewas", state: "Madhya Pradesh", lat: 22.9312, lon: 75.9868 },
    "DWX":  { name: "Dewas Jn", city: "Dewas", state: "Madhya Pradesh", lat: 22.9642, lon: 76.0531 },
    "NRGR": { name: "Naranjipur", city: "Dewas", state: "Madhya Pradesh", lat: 23.0315, lon: 76.0124 },
    "UDM":  { name: "Undasa Madhopur", city: "Ujjain", state: "Madhya Pradesh", lat: 23.0821, lon: 75.9412 },
    "KDHA": { name: "Karchha", city: "Ujjain", state: "Madhya Pradesh", lat: 23.1154, lon: 75.8821 },
    "VRG":  { name: "Vikramnagar", city: "Ujjain", state: "Madhya Pradesh", lat: 23.1568, lon: 75.8145 },
    "UJN":  { name: "Ujjain Jn", city: "Ujjain", state: "Madhya Pradesh", lat: 23.1782, lon: 75.7814 },
    "PLW":  { name: "Pingleshwar", city: "Ujjain", state: "Madhya Pradesh", lat: 23.1954, lon: 75.8621 },
    "TJP":  { name: "Tajpur", city: "Ujjain", state: "Madhya Pradesh", lat: 23.2184, lon: 75.9452 },
    "SVT":  { name: "Shivpura", city: "Shajapur", state: "Madhya Pradesh", lat: 23.2389, lon: 76.0312 },
    "TAN":  { name: "Tarana Road", city: "Tarana", state: "Madhya Pradesh", lat: 23.2452, lon: 76.0945 },
    "MKC":  { name: "Maksi Jn", city: "Maksi", state: "Madhya Pradesh", lat: 23.2657, lon: 76.1517 },
    "PUO":  { name: "Pir Umrod", city: "Shajapur", state: "Madhya Pradesh", lat: 23.2721, lon: 76.2345 },
    "BCH":  { name: "Berchha", city: "Berchha", state: "Madhya Pradesh", lat: 23.2825, lon: 76.3342 },
    "KONY": { name: "Kisoni", city: "Shajapur", state: "Madhya Pradesh", lat: 23.3124, lon: 76.4012 },
    "KSH":  { name: "Kali Sindh", city: "Shajapur", state: "Madhya Pradesh", lat: 23.3345, lon: 76.4521 },
    "BLX":  { name: "Bolai", city: "Shajapur", state: "Madhya Pradesh", lat: 23.3614, lon: 76.4864 },
    "AKD":  { name: "Akodia", city: "Akodia", state: "Madhya Pradesh", lat: 23.3783, lon: 76.5992 },
    "MQE":  { name: "Mohammadkhera", city: "Shajapur", state: "Madhya Pradesh", lat: 23.4124, lon: 76.6542 },
    "SJP":  { name: "Shujalpur", city: "Shujalpur", state: "Madhya Pradesh", lat: 23.4021, lon: 76.7184 },
    "CKOD": { name: "Chakrod", city: "Shajapur", state: "Madhya Pradesh", lat: 23.3852, lon: 76.7954 },
    "KPP":  { name: "Kalapipal", city: "Kalapipal", state: "Madhya Pradesh", lat: 23.3421, lon: 76.8452 },
    "JBX":  { name: "Jabri", city: "Sehore", state: "Madhya Pradesh", lat: 23.3054, lon: 76.9124 },
    "PRB":  { name: "Parbati", city: "Sehore", state: "Madhya Pradesh", lat: 23.2812, lon: 76.9654 },
    "BKTL": { name: "Baktal", city: "Sehore", state: "Madhya Pradesh", lat: 23.2341, lon: 77.0385 },
    "SEH":  { name: "Sehore", city: "Sehore", state: "Madhya Pradesh", lat: 23.1984, lon: 77.0854 },
    "PNWN": { name: "Pachwan", city: "Sehore", state: "Madhya Pradesh", lat: 23.2124, lon: 77.1654 },
    "PUD":  { name: "Phanda", city: "Bhopal", state: "Madhya Pradesh", lat: 23.2312, lon: 77.2345 },
    "BQE":  { name: "Bakanian Bhaunr", city: "Bhopal", state: "Madhya Pradesh", lat: 23.2541, lon: 77.2954 },
    "SHRN": { name: "Sant Hirdaram Nagar", city: "Bhopal", state: "Madhya Pradesh", lat: 23.2842, lon: 77.3401 },
    "BPL":  { name: "Bhopal Jn", city: "Bhopal", state: "Madhya Pradesh", lat: 23.2669, lon: 77.4131 },
    "NSZ":  { name: "Nishatpura", city: "Bhopal", state: "Madhya Pradesh", lat: 23.2854, lon: 77.4215 },
    "SUW":  { name: "Sukhisewaniyan", city: "Bhopal", state: "Madhya Pradesh", lat: 23.3541, lon: 77.4852 },
    "BVB":  { name: "Bhadbhada Ghat", city: "Bhopal", state: "Madhya Pradesh", lat: 23.4012, lon: 77.5342 },
    "DWG":  { name: "Dewanganj", city: "Raisen", state: "Madhya Pradesh", lat: 23.4452, lon: 77.5854 },
    "SMT":  { name: "Salamatpur", city: "Raisen", state: "Madhya Pradesh", lat: 23.4854, lon: 77.6521 },
    "SCI":  { name: "Sanchi", city: "Sanchi", state: "Madhya Pradesh", lat: 23.4889, lon: 77.7384 },
    "BHS":  { name: "Vidisha", city: "Vidisha", state: "Madhya Pradesh", lat: 23.5223, lon: 77.8148 },
    "SORI": { name: "Sorai", city: "Vidisha", state: "Madhya Pradesh", lat: 23.5954, lon: 77.8654 },
    "SUMR": { name: "Sumer", city: "Vidisha", state: "Madhya Pradesh", lat: 23.6854, lon: 77.9054 },
    "GLG":  { name: "GulabGanj", city: "Vidisha", state: "Madhya Pradesh", lat: 23.7541, lon: 77.9254 },
    "PAI":  { name: "Pabai", city: "Vidisha", state: "Madhya Pradesh", lat: 23.8012, lon: 77.9384 },
    "BAQ":  { name: "Ganj Basoda", city: "Ganj Basoda", state: "Madhya Pradesh", lat: 23.8453, lon: 77.9448 },
    "BET":  { name: "Bareth", city: "Vidisha", state: "Madhya Pradesh", lat: 23.9149, lon: 77.9997 },
    "CLHT": { name: "Chulheta", city: "Vidisha", state: "Madhya Pradesh", lat: 23.9754, lon: 78.0452 },
    "KAH":  { name: "Kalhar", city: "Vidisha", state: "Madhya Pradesh", lat: 24.0354, lon: 78.0954 },
    "MABA": { name: "Mandi Bamora", city: "Sagar", state: "Madhya Pradesh", lat: 24.0854, lon: 78.1452 },
    "KIKA": { name: "Kurwai Kethora", city: "Vidisha", state: "Madhya Pradesh", lat: 24.1254, lon: 78.1654 },
    "BINA": { name: "Bina Jn", city: "Bina", state: "Madhya Pradesh", lat: 24.1710, lon: 78.1832 },
    "AGD":  { name: "Agasod", city: "Sagar", state: "Madhya Pradesh", lat: 24.2340, lon: 78.2169 },

    // MP / UP Border (Bina - Jhansi - Gwalior)
    "KOA":  { name: "Karonda", city: "Lalitpur", state: "Uttar Pradesh", lat: 24.3214, lon: 78.2654 },
    "MXS":  { name: "Mohasa", city: "Lalitpur", state: "Uttar Pradesh", lat: 24.4012, lon: 78.3124 },
    "DUA":  { name: "Dhaura", city: "Lalitpur", state: "Uttar Pradesh", lat: 24.4754, lon: 78.3654 },
    "JLN":  { name: "Jakhalaun", city: "Lalitpur", state: "Uttar Pradesh", lat: 24.5541, lon: 78.3954 },
    "JRO":  { name: "Jiron", city: "Lalitpur", state: "Uttar Pradesh", lat: 24.6254, lon: 78.4124 },
    "LAR":  { name: "Lalitpur Jn", city: "Lalitpur", state: "Uttar Pradesh", lat: 24.6912, lon: 78.4184 },
    "DWA":  { name: "Dailwara", city: "Lalitpur", state: "Uttar Pradesh", lat: 24.7854, lon: 78.4254 },
    "JHA":  { name: "Jakhaura", city: "Lalitpur", state: "Uttar Pradesh", lat: 24.8754, lon: 78.4214 },
    "BJA":  { name: "Bijrotha", city: "Lalitpur", state: "Uttar Pradesh", lat: 24.9469, lon: 78.4216 },
    "TBT":  { name: "Talbahat", city: "Talbahat", state: "Uttar Pradesh", lat: 25.0452, lon: 78.4284 },
    "MZX":  { name: "Matatila", city: "Lalitpur", state: "Uttar Pradesh", lat: 25.1054, lon: 78.4354 },
    "BZY":  { name: "Basai", city: "Datia", state: "Madhya Pradesh", lat: 25.1654, lon: 78.4412 },
    "BPW":  { name: "Burhpura", city: "Jhansi", state: "Uttar Pradesh", lat: 25.2012, lon: 78.4452 },
    "BAB":  { name: "Babina", city: "Babina", state: "Uttar Pradesh", lat: 25.2378, lon: 78.4517 },
    "KHJ":  { name: "Khajraha", city: "Jhansi", state: "Uttar Pradesh", lat: 25.3124, lon: 78.4854 },
    "BJI":  { name: "Bijauli", city: "Jhansi", state: "Uttar Pradesh", lat: 25.3765, lon: 78.5177 },
    "VGLJ": { name: "Veerangana Lakshmibai Jhansi Jn", city: "Jhansi", state: "Uttar Pradesh", lat: 25.4484, lon: 78.5562 },
    "KRQ":  { name: "Karari", city: "Jhansi", state: "Uttar Pradesh", lat: 25.5341, lon: 78.5124 },
    "CIRL": { name: "Chirula", city: "Datia", state: "Madhya Pradesh", lat: 25.5901, lon: 78.4735 },
    "DAA":  { name: "Datia", city: "Datia", state: "Madhya Pradesh", lat: 25.6684, lon: 78.4554 },
    "SOR":  { name: "Sonagir", city: "Datia", state: "Madhya Pradesh", lat: 25.7554, lon: 78.4124 },
    "KTRA": { name: "Kotra", city: "Datia", state: "Madhya Pradesh", lat: 25.8254, lon: 78.3654 },
    "DBA":  { name: "Dabra", city: "Dabra", state: "Madhya Pradesh", lat: 25.8945, lon: 78.3312 },
    "SMTL": { name: "Simial Tal", city: "Gwalior", state: "Madhya Pradesh", lat: 25.9254, lon: 78.3012 },
    "AEH":  { name: "Anant Paith", city: "Gwalior", state: "Madhya Pradesh", lat: 25.9554, lon: 78.2761 },
    "ARI":  { name: "Antri", city: "Gwalior", state: "Madhya Pradesh", lat: 26.0352, lon: 78.2267 },
    "SLV":  { name: "Sandalpur", city: "Gwalior", state: "Madhya Pradesh", lat: 26.1124, lon: 78.2012 },
    "STLI": { name: "Sithouli", city: "Gwalior", state: "Madhya Pradesh", lat: 26.1554, lon: 78.1912 },
    "GWL":  { name: "Gwalior Jn", city: "Gwalior", state: "Madhya Pradesh", lat: 26.2165, lon: 78.1823 },
    "BLNR": { name: "Birlanagar", city: "Gwalior", state: "Madhya Pradesh", lat: 26.2376, lon: 78.1953 },
    "RRU":  { name: "Rayaru", city: "Gwalior", state: "Madhya Pradesh", lat: 26.2954, lon: 78.1654 },
    "BAO":  { name: "Banmor", city: "Morena", state: "Madhya Pradesh", lat: 26.3556, lon: 78.0989 },
    "NUB":  { name: "Nurabad", city: "Morena", state: "Madhya Pradesh", lat: 26.4124, lon: 78.0512 },
    "SANK": { name: "Sank", city: "Morena", state: "Madhya Pradesh", lat: 26.4554, lon: 78.0124 },
    "MRA":  { name: "Morena", city: "Morena", state: "Madhya Pradesh", lat: 26.4965, lon: 77.9954 },
    "SIKD": { name: "Sikroda Kwanri", city: "Morena", state: "Madhya Pradesh", lat: 26.5654, lon: 77.9654 },
    "HET":  { name: "Hetampur", city: "Morena", state: "Madhya Pradesh", lat: 26.6354, lon: 77.9254 },
    "DHO":  { name: "Dholpur Jn", city: "Dholpur", state: "Rajasthan", lat: 26.7012, lon: 77.8954 },
    "MIA":  { name: "Mania", city: "Dholpur", state: "Rajasthan", lat: 26.8124, lon: 77.9254 },
    "JJ":   { name: "Jajau", city: "Agra", state: "Uttar Pradesh", lat: 26.9254, lon: 77.9554 },
    "BHA":  { name: "Bhandai Jn", city: "Agra", state: "Uttar Pradesh", lat: 27.0691, lon: 77.9668 },
    "AGC":  { name: "Agra Cantt Jn", city: "Agra", state: "Uttar Pradesh", lat: 27.1580, lon: 77.9902 },
    "RKM":  { name: "Raja Ki Mandi", city: "Agra", state: "Uttar Pradesh", lat: 27.1984, lon: 77.9954 },
    "BFP":  { name: "Bilochpura", city: "Agra", state: "Uttar Pradesh", lat: 27.2026, lon: 77.9872 },
    "RNKA": { name: "Runkuta", city: "Agra", state: "Uttar Pradesh", lat: 27.2354, lon: 77.8954 },
    "KXM":  { name: "Kitham", city: "Agra", state: "Uttar Pradesh", lat: 27.2754, lon: 77.8124 },
    "DDDM": { name: "Deen Dayal Dham", city: "Mathura", state: "Uttar Pradesh", lat: 27.3242, lon: 77.7608 },
    "FAR":  { name: "Farah", city: "Mathura", state: "Uttar Pradesh", lat: 27.3354, lon: 77.7452 },
    "BAD":  { name: "Bad", city: "Mathura", state: "Uttar Pradesh", lat: 27.3959, lon: 77.6897 },
    "MTJ":  { name: "Mathura Jn", city: "Mathura", state: "Uttar Pradesh", lat: 27.4801, lon: 77.6731 },
    "BTSR": { name: "Bhuteshwar", city: "Mathura", state: "Uttar Pradesh", lat: 27.5124, lon: 77.6654 },
    "VRBD": { name: "Vrindaban Road", city: "Mathura", state: "Uttar Pradesh", lat: 27.5854, lon: 77.6354 },
    "AJH":  { name: "Ajhai", city: "Mathura", state: "Uttar Pradesh", lat: 27.6362, lon: 77.5584 },
    "CHJ":  { name: "Chata", city: "Mathura", state: "Uttar Pradesh", lat: 27.7124, lon: 77.4954 },
    "KSV":  { name: "Kosi Kalan", city: "Mathura", state: "Uttar Pradesh", lat: 27.7954, lon: 77.4254 },
    "HDL":  { name: "Hodal", city: "Palwal", state: "Haryana", lat: 27.8954, lon: 77.3754 },
    "BNCR": { name: "Banchari", city: "Palwal", state: "Haryana", lat: 27.9531, lon: 77.3626 },
    "SHLK": { name: "Sholaka", city: "Palwal", state: "Haryana", lat: 28.0214, lon: 77.3452 },
    "RDE":  { name: "Rundhi", city: "Palwal", state: "Haryana", lat: 28.0854, lon: 77.3354 },
    "PWL":  { name: "Palwal", city: "Palwal", state: "Haryana", lat: 28.1452, lon: 77.3254 },
    "AST":  { name: "Asaoti", city: "Faridabad", state: "Haryana", lat: 28.2509, lon: 77.3236 },
    "BVH":  { name: "Ballabhgarh", city: "Faridabad", state: "Haryana", lat: 28.3354, lon: 77.3184 },
    "FDN":  { name: "Faridabad New Town", city: "Faridabad", state: "Haryana", lat: 28.3754, lon: 77.3124 },
    "FDB":  { name: "Faridabad", city: "Faridabad", state: "Haryana", lat: 28.4124, lon: 77.3084 },
    "TKDC": { name: "Tuglakabad Cabin", city: "South Delhi", state: "Delhi", lat: 28.4954, lon: 77.2954 },
    "TKD":  { name: "Tuglakabad", city: "South Delhi", state: "Delhi", lat: 28.5124, lon: 77.2854 },
    "OKA":  { name: "Okhla", city: "South Delhi", state: "Delhi", lat: 28.5554, lon: 77.2654 },
    "NZM":  { name: "Hazrat Nizamuddin", city: "New Delhi", state: "Delhi", lat: 28.5889, lon: 77.2534 },
    "TKJ":  { name: "Tilak Bridge", city: "New Delhi", state: "Delhi", lat: 28.6254, lon: 77.2412 },
    "CSB":  { name: "Shivaji Bridge", city: "New Delhi", state: "Delhi", lat: 28.6312, lon: 77.2314 },
    "NDLS": { name: "New Delhi", city: "New Delhi", state: "Delhi", lat: 28.6423, lon: 77.2200 },
    "DSB":  { name: "Sadar Bazar", city: "North Delhi", state: "Delhi", lat: 28.6554, lon: 77.2124 },
    "SZM":  { name: "Sabzi Mandi", city: "North Delhi", state: "Delhi", lat: 28.6684, lon: 77.2012 },
    "DAZ":  { name: "Delhi Azadpur", city: "North Delhi", state: "Delhi", lat: 28.6954, lon: 77.1854 },
    "ANDI": { name: "Adarsh Nagar Delhi", city: "North Delhi", state: "Delhi", lat: 28.7142, lon: 77.1667 },
    "BHD":  { name: "Badli", city: "North West Delhi", state: "Delhi", lat: 28.7468, lon: 77.1377 },
    "KHKN": { name: "Khera Kalan", city: "North West Delhi", state: "Delhi", lat: 28.7854, lon: 77.1214 },
    "HUK":  { name: "Holambi Kalan", city: "North West Delhi", state: "Delhi", lat: 28.8254, lon: 77.1054 },
    "NUR":  { name: "Narela", city: "North West Delhi", state: "Delhi", lat: 28.8541, lon: 77.0912 },
    "RDDE": { name: "Rathdhana", city: "Sonipat", state: "Haryana", lat: 28.9124, lon: 77.0654 },
    "HNN":  { name: "Harsana Kalan", city: "Sonipat", state: "Haryana", lat: 28.9554, lon: 77.0452 },
    "SNP":  { name: "Sonipat Jn", city: "Sonipat", state: "Haryana", lat: 28.9954, lon: 77.0214 },
    "SLKN": { name: "Sandhal Kalan", city: "Sonipat", state: "Haryana", lat: 29.0554, lon: 77.0124 },
    "RUG":  { name: "Rajlu Garhi", city: "Sonipat", state: "Haryana", lat: 29.1012, lon: 77.0094 },
    "GNU":  { name: "Ganaur", city: "Sonipat", state: "Haryana", lat: 29.1354, lon: 77.0084 },
    "BDMJ": { name: "Bhodwal Majri", city: "Panipat", state: "Haryana", lat: 29.1852, lon: 77.0082 },
    "SMK":  { name: "Samalkha", city: "Panipat", state: "Haryana", lat: 29.2354, lon: 76.9984 },
    "DWNA": { name: "Diwana", city: "Panipat", state: "Haryana", lat: 29.3124, lon: 76.9854 },
    "PNP":  { name: "Panipat Jn", city: "Panipat", state: "Haryana", lat: 29.3909, lon: 76.9635 },
    "BBDE": { name: "Babarpur", city: "Panipat", state: "Haryana", lat: 29.4497, lon: 76.9662 },
    "KFU":  { name: "Kohand", city: "Karnal", state: "Haryana", lat: 29.5124, lon: 76.9684 },
    "GRA":  { name: "Gharaunda", city: "Karnal", state: "Haryana", lat: 29.5412, lon: 76.9712 },
    "BZJT": { name: "Bazida Jatan", city: "Karnal", state: "Haryana", lat: 29.6124, lon: 76.9754 },
    "KUN":  { name: "Karnal", city: "Karnal", state: "Haryana", lat: 29.6854, lon: 76.9854 },
    "BZK":  { name: "Bhaini Khurd", city: "Karnal", state: "Haryana", lat: 29.7452, lon: 76.9654 },
    "TRR":  { name: "Taraori", city: "Karnal", state: "Haryana", lat: 29.8054, lon: 76.9354 },
    "NLKR": { name: "Nilokheri", city: "Karnal", state: "Haryana", lat: 29.8554, lon: 76.9124 },
    "AMIN": { name: "Amin", city: "Kurukshetra", state: "Haryana", lat: 29.9050, lon: 76.9000 },
    "KKDE": { name: "Kurukshetra Jn", city: "Kurukshetra", state: "Haryana", lat: 29.9695, lon: 76.8286 },
    "DHKR": { name: "Dhoda Kheri", city: "Kurukshetra", state: "Haryana", lat: 30.0124, lon: 76.8452 },
    "DPP":  { name: "Dhirpur", city: "Kurukshetra", state: "Haryana", lat: 30.0654, lon: 76.8512 },
    "DHMZ": { name: "Dhola Mazra", city: "Kurukshetra", state: "Haryana", lat: 30.1124, lon: 76.8564 },
    "SHDM": { name: "Shahbad Markanda", city: "Kurukshetra", state: "Haryana", lat: 30.1654, lon: 76.8624 },
    "MOY":  { name: "Mohri", city: "Ambala", state: "Haryana", lat: 30.2452, lon: 76.8512 },
    "UMB":  { name: "Ambala Cantt Jn", city: "Ambala", state: "Haryana", lat: 30.3389, lon: 76.8270 },
    "UBC":  { name: "Ambala City", city: "Ambala", state: "Haryana", lat: 30.3782, lon: 76.7725 },
    "SMU":  { name: "Sambhu", city: "Patiala", state: "Punjab", lat: 30.4354, lon: 76.6954 },
    "RPJ":  { name: "Rajpura Jn", city: "Rajpura", state: "Punjab", lat: 30.4854, lon: 76.5954 },
    "SBJ":  { name: "Sarai Banjara", city: "Patiala", state: "Punjab", lat: 30.5412, lon: 76.5124 },
    "SDY":  { name: "Sadhoogarh", city: "Fatehgarh Sahib", state: "Punjab", lat: 30.5954, lon: 76.4452 },
    "SIR":  { name: "Sirhind Jn", city: "Sirhind", state: "Punjab", lat: 30.6354, lon: 76.3854 },
    "GVG":  { name: "Mandi Gobindgarh", city: "Gobindgarh", state: "Punjab", lat: 30.6654, lon: 76.3054 },
    "KNN":  { name: "Khanna", city: "Khanna", state: "Punjab", lat: 30.7054, lon: 76.2184 },
    "CHA":  { name: "Chawa Pail", city: "Ludhiana", state: "Punjab", lat: 30.7554, lon: 76.1254 },
    "DOA":  { name: "Doraha", city: "Doraha", state: "Punjab", lat: 30.8054, lon: 76.0354 },
    "SNL":  { name: "Sanehwal", city: "Ludhiana", state: "Punjab", lat: 30.8554, lon: 75.9654 },
    "DDL":  { name: "Dhandari Kalan", city: "Ludhiana", state: "Punjab", lat: 30.8854, lon: 75.9124 },
    "BHOI": { name: "Dhandarikalan Block Hut (Bhoi)", city: "Ludhiana", state: "Punjab", lat: 30.8947, lon: 75.8719 },
    "LDH":  { name: "Ludhiana Jn", city: "Ludhiana", state: "Punjab", lat: 30.9108, lon: 75.8573 },
    "LDW":  { name: "Ladhowal", city: "Ludhiana", state: "Punjab", lat: 30.9854, lon: 75.8012 },
    "PHR":  { name: "Phillaur Jn", city: "Phillaur", state: "Punjab", lat: 31.0254, lon: 75.7854 },
    "BTTN": { name: "Bhattian", city: "Jalandhar", state: "Punjab", lat: 31.0854, lon: 75.7654 },
    "GRY":  { name: "Goraya", city: "Goraya", state: "Punjab", lat: 31.1354, lon: 75.7512 },
    "MAUL": { name: "Mauli Halt", city: "Kapurthala", state: "Punjab", lat: 31.1854, lon: 75.7354 },
    "PGW":  { name: "Phagwara Jn", city: "Phagwara", state: "Punjab", lat: 31.2214, lon: 75.7712 },
    "CEU":  { name: "Chiheru", city: "Kapurthala", state: "Punjab", lat: 31.2654, lon: 75.6954 },
    "JRC":  { name: "Jalandhar Cantt Jn", city: "Jalandhar", state: "Punjab", lat: 31.3060, lon: 75.6025 },
    "SCPD": { name: "Suchi Pind", city: "Jalandhar", state: "Punjab", lat: 31.3554, lon: 75.6214 },
    "AWL":  { name: "Alawalpur", city: "Jalandhar", state: "Punjab", lat: 31.4252, lon: 75.6422 },
    "KKL":  { name: "Kala Bakra", city: "Jalandhar", state: "Punjab", lat: 31.4854, lon: 75.6654 },
    "BPRS": { name: "Bhogpur Sirwal", city: "Jalandhar", state: "Punjab", lat: 31.5452, lon: 75.6854 },
    "CGH":  { name: "Cholang", city: "Hoshiarpur", state: "Punjab", lat: 31.6124, lon: 75.6754 },
    "TDO":  { name: "Tanda Urmar", city: "Tanda", state: "Punjab", lat: 31.6684, lon: 75.6452 },
    "KZX":  { name: "Khudda Kurala", city: "Hoshiarpur", state: "Punjab", lat: 31.7354, lon: 75.6214 },
    "GSB":  { name: "Garna Sahib", city: "Hoshiarpur", state: "Punjab", lat: 31.7854, lon: 75.6054 },
    "DZA":  { name: "Dasuya", city: "Dasuya", state: "Punjab", lat: 31.8154, lon: 75.6554 },
    "UCB":  { name: "Unchi Bassi", city: "Hoshiarpur", state: "Punjab", lat: 31.8854, lon: 75.6354 },
    "MEX":  { name: "Mukerian", city: "Mukerian", state: "Punjab", lat: 31.9554, lon: 75.6184 },
    "BNGL": { name: "Bhangala", city: "Hoshiarpur", state: "Punjab", lat: 32.0354, lon: 75.6012 },
    "MRTL": { name: "Mirthal", city: "Gurdaspur", state: "Punjab", lat: 32.1124, lon: 75.6124 },
    "GILA": { name: "Ghiala", city: "Gurdaspur", state: "Punjab", lat: 32.1654, lon: 75.6254 },
    "KNDI": { name: "Kandrori", city: "Kangra", state: "Himachal Pradesh", lat: 32.2124, lon: 75.6412 },
    "PTKC": { name: "Pathankot Cantt", city: "Pathankot", state: "Punjab", lat: 32.2618, lon: 75.6603 },
    "BHRL": { name: "Bharoli Jn", city: "Pathankot", state: "Punjab", lat: 32.2854, lon: 75.6712 },
    "SJNP": { name: "Sujanpur", city: "Pathankot", state: "Punjab", lat: 32.3154, lon: 75.6254 },
    "MDPB": { name: "Madhopur Punjab", city: "Pathankot", state: "Punjab", lat: 32.3554, lon: 75.5954 },
    "MSKT": { name: "Martyr Cptn Sunil Kumar Choudhary Kathua", city: "Kathua", state: "Jammu and Kashmir", lat: 32.3714, lon: 75.5204 },
    "BDHY": { name: "Budhi", city: "Kathua", state: "Jammu and Kashmir", lat: 32.4354, lon: 75.4412 },
    "CHNR": { name: "Chhan Arorian", city: "Kathua", state: "Jammu and Kashmir", lat: 32.4954, lon: 75.3654 },
    "CKDL": { name: "Chak Dayala", city: "Kathua", state: "Jammu and Kashmir", lat: 32.5341, lon: 75.3124 },
    "HRNR": { name: "Hira Nagar", city: "Hiranagar", state: "Jammu and Kashmir", lat: 32.5654, lon: 75.2654 },
    "GHGL": { name: "Ghagwal", city: "Samba", state: "Jammu and Kashmir", lat: 32.5954, lon: 75.1954 },
    "SMBX": { name: "Samba", city: "Samba", state: "Jammu and Kashmir", lat: 32.5612, lon: 75.1154 },
    "VJPJ": { name: "Vijaypur Jammu", city: "Samba", state: "Jammu and Kashmir", lat: 32.5854, lon: 75.0214 },
    "BBMN": { name: "Bari Brahman", city: "Samba", state: "Jammu and Kashmir", lat: 32.6452, lon: 74.9354 },
    "JAT":  { name: "Jammu Tawi", city: "Jammu", state: "Jammu and Kashmir", lat: 32.7070, lon: 74.8801 },
    "BLA":  { name: "Bajalta", city: "Jammu", state: "Jammu and Kashmir", lat: 32.7654, lon: 74.9654 },
    "SGRR": { name: "Sangar", city: "Udhampur", state: "Jammu and Kashmir", lat: 32.8124, lon: 75.0124 },
    "MNWL": { name: "Manwal", city: "Udhampur", state: "Jammu and Kashmir", lat: 32.8654, lon: 75.0654 },
    "RMJK": { name: "Ram Nagar J.K.", city: "Udhampur", state: "Jammu and Kashmir", lat: 32.8954, lon: 75.1054 },
    "MCTM": { name: "MCTM Udhampur", city: "Udhampur", state: "Jammu and Kashmir", lat: 32.9268, lon: 75.1417 },
    "CRWL": { name: "Chak Rakhwal", city: "Udhampur", state: "Jammu and Kashmir", lat: 32.9553, lon: 74.9814 },
    "SVDK": { name: "Shri Mata Vaishno Devi Katra", city: "Katra", state: "Jammu and Kashmir", lat: 32.9828, lon: 74.9357 }
};

async function generateMasterCatalog() {
    console.log("Fetching datameet stations.json...");
    const res = await axios.get("https://raw.githubusercontent.com/datameet/railways/master/stations.json");
    const features = res.data?.features || [];

    const catalog = {};

    // 1. Process 8990 datameet stations
    features.forEach(f => {
        const code = f.properties?.code?.toUpperCase()?.trim();
        if (!code) return;
        const coords = f.geometry?.coordinates || [];
        const lon = coords[0] !== undefined ? Number(coords[0]) : null;
        const lat = coords[1] !== undefined ? Number(coords[1]) : null;

        const isValidLat = typeof lat === "number" && !isNaN(lat) && lat >= -90 && lat <= 90;
        const isValidLon = typeof lon === "number" && !isNaN(lon) && lon >= -180 && lon <= 180;

        let city = null;
        if (f.properties?.address) {
            const parts = f.properties.address.split(",").map(p => p.trim()).filter(Boolean);
            city = parts[0] || null;
        }
        if (!city && f.properties?.name) {
            city = f.properties.name.replace(/\s+(Jn|Junction|Cantt|Cant|Halt|Hl|Block|Cabin|Yard|Nagar|City|Road|Rd).*$/i, "").trim();
        }

        catalog[code] = {
            station_code: code,
            station_name: f.properties?.name || code,
            city: city,
            state: f.properties?.state || null,
            latitude: isValidLat ? Number(lat.toFixed(6)) : null,
            longitude: isValidLon ? Number(lon.toFixed(6)) : null
        };
    });

    // 2. Overlay verified database stations
    for (const [code, info] of Object.entries(VERIFIED_STATIONS)) {
        catalog[code] = {
            station_code: code,
            station_name: info.name,
            city: info.city,
            state: info.state,
            latitude: Number(info.lat.toFixed(6)),
            longitude: Number(info.lon.toFixed(6))
        };
    }

    const outputPath = path.join(__dirname, "stationCatalog.json");
    fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2), "utf8");
    console.log(`Successfully generated stationCatalog.json with ${Object.keys(catalog).length} stations.`);
}

generateMasterCatalog().catch(console.error);
