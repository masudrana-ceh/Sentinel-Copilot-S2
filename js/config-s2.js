/**
 * config-s2.js
 * Subject metadata and pedagogy configurations for S2-Sentinel Copilot
 * Semester 2 - CS Engineering @ Howest University Belgium
 */

export const BRANDING = {
    appName: "S2-Sentinel Copilot",
    subtitle: "Hyper-Intelligent AI for CS Engineering Semester 2",
    version: "1.7.0",
    creator: {
        name: "Muhammad Izaz Haider",
        alias: "MIHx0",
        role: "Junior DevSecOps & AI Security Engineer",
        company: "Damno Solutions",
        education: "Cybersecurity Student @ Howest University 🇧🇪",
        founder: "The PenTrix",
        avatar: "https://avatars.githubusercontent.com/u/93000000?v=4", // Placeholder
        skills: ["Python", "JavaScript", "AI/ML", "Cybersecurity", "DevSecOps", "Web Development", "Pentesting", "Cloud Security"],
        params: {
            passion: "Building AI-powered security tools",
            focus: "Ethical Hacking & Secure Code Review",
            vision: "Democratizing cybersecurity education"
        }
    },
    project: {
        description: "A hyper-intelligent AI study platform designed specifically for Computer Science Engineering Semester 2 students at Howest University Belgium. Combines RAG technology, advanced AI models, and specialized security toolkits to provide personalized learning experiences.",
        mission: "Transform complex CS concepts into digestible knowledge through AI-powered teaching, while maintaining the highest standards of security and code quality.",
        whyBuilt: "As a cybersecurity student, I noticed the gap between theoretical coursework and practical application. This platform bridges that gap by providing context-aware AI assistance, security-first toolkits, and real-time analytics to help students master their subjects efficiently and securely."
    }
};

export const SUBJECTS = {
    networks: {
        id: 'networks',
        name: 'Computer Networks',
        code: 'CS-NET-S2',
        credits: 6,
        color: '#3b82f6',
        gradient: 'from-blue-500 to-blue-700',
        icon: 'fa-network-wired',
        teachers: ['Brouckxon Henk', 'Clauwaert Thomas', 'Pareit Daan', 'VandenDriessche Jill'],
        topics: [
            'OSI & TCP/IP Models',
            'IP Addressing & Subnetting',
            'Routing Protocols (RIP, OSPF, BGP)',
            'Transport Layer (TCP/UDP)',
            'Application Protocols (HTTP, DNS, DHCP)',
            'Network Security Basics',
            'Wireshark Analysis',
            'VLANs & Switching',
            'NAT & PAT',
            'Packet Analysis'
        ],
        pedagogy: 'packet-first',
        toolkit: ['subnet-calculator', 'port-lookup', 'cidr-converter', 'protocol-diagram', 'bandwidth-calculator', 'dns-lookup-simulator'],
        promptStyle: 'Always explain concepts starting from the packet header structure (bits/bytes layout) before discussing high-level theory. Reference RFC documents. Use Wireshark filter examples where applicable.',
        examType: 'practical + theory',
        description: 'Deep dive into networking protocols, packet analysis, and infrastructure design.'
    },

    pentesting: {
        id: 'pentesting',
        name: 'Web Pentesting Fundamentals',
        code: 'CS-PENTEST-S2',
        credits: 3,
        color: '#ef4444',
        gradient: 'from-red-500 to-red-700',
        icon: 'fa-bug',
        teachers: ['Audenaert Ann', 'Casier Dimitri', 'Koreman Koen'],
        topics: [
            'OWASP Top 10 (2021)',
            'SQL Injection (Union, Blind, Error-based)',
            'XSS (Reflected, Stored, DOM-based)',
            'CSRF Attacks',
            'Authentication Bypass',
            'IDOR Vulnerabilities',
            'Burp Suite Professional Usage',
            'HTTP Headers Security',
            'SSRF (Server-Side Request Forgery)',
            'File Inclusion (LFI/RFI)'
        ],
        pedagogy: 'attack-chain',
        toolkit: ['encoding-decoder', 'header-analyzer', 'payload-generator'],
        promptStyle: 'Explain vulnerabilities using the attack chain: Reconnaissance → Exploitation → Post-Exploitation. Provide PoC examples safe for lab environments. Include mitigation strategies.',
        examType: 'practical CTF',
        description: 'Offensive security techniques for web application testing and vulnerability discovery.'
    },

    backend: {
        id: 'backend',
        name: 'Web Backend',
        code: 'CS-BACKEND-S2',
        credits: 3,
        color: '#22c55e',
        gradient: 'from-green-500 to-green-700',
        icon: 'fa-server',
        teachers: ['Audenaert Ann', 'De Groef Machteld', 'Tack Joost', 'Vlummens Frédéric'],
        topics: [
            'RESTful API Design',
            'Express.js & Node.js',
            'Database Integration (SQL/NoSQL)',
            'Authentication (JWT, Sessions, OAuth)',
            'Input Validation & Sanitization',
            'Error Handling & Logging',
            'ORM/ODM (Sequelize, Mongoose)',
            'API Testing (Postman)',
            'MVC Architecture',
            'Middleware & Routing'
        ],
        pedagogy: 'code-first',
        toolkit: ['jwt-decoder', 'sql-formatter', 'php-validator', 'node-package-analyzer'],
        promptStyle: 'Start with working code examples using Express.js syntax. Then explain the underlying concepts. Include package.json dependencies and terminal commands.',
        examType: 'project + oral',
        description: 'Server-side development with Node.js, REST APIs, and database integration.'
    },

    linux: {
        id: 'linux',
        name: 'Linux for Ethical Hackers',
        code: 'CS-LINUX-S2',
        credits: 6,
        color: '#f59e0b',
        gradient: 'from-amber-500 to-amber-700',
        icon: 'fa-terminal',
        teachers: ['Roets Chris', 'Van Eeckhout Guy'],
        topics: [
            'Bash Scripting',
            'File Permissions (chmod, chown)',
            'Process Management',
            'Networking Commands (netstat, ss, ip)',
            'User Administration',
            'Systemd & Services',
            'Log Analysis (/var/log)',
            'Cron Jobs & Automation',
            'Package Management (apt, yum)',
            'Privilege Escalation Techniques'
        ],
        pedagogy: 'cli-first',
        toolkit: ['permission-calculator', 'cron-generator', 'command-builder', 'linux-cheatsheet'],
        promptStyle: 'Provide the exact Bash command to demonstrate the concept IMMEDIATELY. Then explain each flag and option. Assume Kali Linux or Debian-based distro context.',
        examType: 'practical terminal',
        description: 'Command-line mastery and Linux administration for offensive security.'
    },

    ctf: {
        id: 'ctf',
        name: 'Capture the Flag',
        code: 'CS-CTF-S2',
        credits: 3,
        color: '#8b5cf6',
        gradient: 'from-purple-500 to-purple-700',
        icon: 'fa-flag',
        teachers: ['Clauwaert Thomas', 'Dewulf Mattias', 'Roets Chris', 'Singier Laurens'],
        topics: [
            'Cryptography Challenges',
            'Reverse Engineering Basics',
            'Steganography',
            'Forensics Analysis',
            'Web Exploitation',
            'Binary Exploitation Intro',
            'OSINT Techniques',
            'Privilege Escalation',
            'Miscellaneous Puzzles',
            'Writeup Documentation'
        ],
        pedagogy: 'hint-ladder',
        toolkit: ['base-converter', 'hash-identifier', 'cipher-decoder'],
        promptStyle: 'Use a hint-ladder approach: Start with the smallest nudge. Only reveal more if explicitly asked. Teach methodology and thinking patterns, not just solutions. Reference CTF platforms like HackTheBox, TryHackMe.',
        examType: 'CTF competition',
        description: 'Competition-style hacking challenges covering crypto, forensics, and exploitation.'
    },

    scripting: {
        id: 'scripting',
        name: 'Scripting & Code Analysis',
        code: 'CS-SCRIPT-S2',
        credits: 6,
        color: '#06b6d4',
        gradient: 'from-cyan-500 to-cyan-700',
        icon: 'fa-code',
        teachers: ['Baert Brian', 'Debou Arne', 'Rizvi Syed Shan', 'Tack Joost'],
        topics: [
            'Python Scripting',
            'PowerShell Scripting',
            'Bash Automation',
            'Static Code Analysis',
            'Regex Patterns',
            'API Scripting (requests, urllib)',
            'File I/O Operations',
            'Error Handling & Debugging',
            'Security Script Development',
            'Code Review Practices'
        ],
        pedagogy: 'annotated-code',
        toolkit: ['regex-tester', 'code-analyzer'],
        promptStyle: 'Provide annotated code with inline comments explaining every significant line. Compare Python, Bash, and PowerShell approaches when relevant. Include shebang lines and execution instructions.',
        examType: 'practical + code review',
        description: 'Automation scripting and static analysis across Python, Bash, and PowerShell.'
    },

    privacy: {
        id: 'privacy',
        name: 'Data Privacy & IT Law',
        code: 'CS-LAW-S2',
        credits: 3,
        color: '#ec4899',
        gradient: 'from-pink-500 to-pink-700',
        icon: 'fa-gavel',
        teachers: ['Witters Stephanie'],
        topics: [
            'GDPR Principles (Art. 5)',
            'Data Subject Rights (Art. 12-22)',
            'Lawful Processing Bases (Art. 6)',
            'Data Breach Procedures (Art. 33-34)',
            'DPO Responsibilities (Art. 37-39)',
            'International Transfers (Chapter V)',
            'Cookie Laws (ePrivacy)',
            'NIS2 Directive',
            'Case Law Examples',
            'Privacy by Design (Art. 25)'
        ],
        pedagogy: 'case-based',
        toolkit: ['gdpr-article-lookup', 'privacy-checklist'],
        promptStyle: 'Reference specific GDPR articles (e.g., Art. 6, Art. 17) and real European court cases (CJEU decisions). Use scenario-based explanations for practical understanding.',
        examType: 'written exam',
        description: 'European data protection law, GDPR compliance, and IT legal frameworks.'
    },

    aisec: {
        id: 'aisec',
        name: 'AI x Cybersecurity',
        code: 'CS-AISEC-S2',
        credits: 6,
        color: '#a855f7',
        gradient: 'from-purple-600 to-fuchsia-600',
        icon: 'fa-brain',
        teachers: ['MIHx0 (Advanced Track)'],
        topics: [
            'AI Security Fundamentals',
            'Adversarial Machine Learning',
            'Prompt Injection Attacks',
            'AI-Powered Penetration Testing',
            'LLM Security (OWASP Top 10 for LLMs)',
            'Model Poisoning & Backdoors',
            'AI Red Teaming',
            'Deepfake Detection',
            'AI-Assisted Malware Analysis',
            'Neural Network Exploitation',
            'AI Ethics & Safety',
            'Automated Vulnerability Scanning',
            'ML Model Extraction Attacks',
            'AI in Threat Intelligence',
            'Defensive AI Systems'
        ],
        pedagogy: 'research-driven',
        toolkit: ['ai-red-team', 'prompt-fuzzer', 'model-extractor', 'adversarial-gen'],
        promptStyle: 'Blend cutting-edge research papers with practical exploitation techniques. Reference OWASP AI Security, MITRE ATLAS framework, and recent CVEs. Provide Python code for attacks and defenses. Emphasize responsible disclosure.',
        examType: 'research project + practical demo',
        description: 'Cutting-edge intersection of AI and cybersecurity: offensive AI, defensive AI, and adversarial ML.'
    }
};

export const PEDAGOGY_STYLES = {
    'packet-first': 'Always explain concepts starting from the packet header structure (bits/bytes) before discussing high-level theory. Include diagrams of packet layouts.',
    'attack-chain': 'Explain using the Recon → Exploit → Post-Exploit attack chain. Provide safe lab examples and always mention ethical/legal considerations.',
    'code-first': 'Start with working, runnable code examples. Then explain underlying concepts. Include installation commands and dependencies.',
    'cli-first': 'Provide the exact terminal command IMMEDIATELY. Then break down each flag and option. Assume Linux/Bash environment.',
    'hint-ladder': 'Give the smallest helpful nudge first. Only reveal more when explicitly asked. Focus on teaching methodology over direct answers.',
    'annotated-code': 'Provide heavily commented code where every significant line has an inline explanation. Compare different language approaches.',
    'case-based': 'Reference specific legal articles and real court cases. Use scenario-based explanations for practical understanding.',
    'research-driven': 'Cite recent research papers (arXiv, academic conferences) and CVE disclosures. Provide reproducible Python code for both attack and defense. Link theory to practice with real-world examples.'
};

export const CONSTANTS = {
    DB_NAME: 's2-sentinel-db',
    DB_VERSION: 4,
    DEFAULT_MODEL_CEREBRAS: 'llama-3.3-70b',
    DEFAULT_MODEL_GEMINI: 'gemini-1.5-flash',
    STORAGE_KEYS: {
        CEREBRAS_KEY: 's2-cerebras-api-key',
        GEMINI_KEY: 's2-gemini-api-key',
        THEME: 's2-theme',
        ACTIVE_SUBJECT: 's2-active-subject',
        SETTINGS: 's2-settings'
    },
    CHUNK_SIZE: 500,
    CHUNK_OVERLAP: 50,
    MAX_CONTEXT_CHUNKS: 5,
    THEMES: ['glass', 'sentinel-dark', 'hacker', 'midnight', 'cyber', 'ocean', 'forest', 'nebula', 'aurora', 'sunset', 'lavender', 'light']
};

export const SYSTEM_PROMPTS = {
    IDENTITY: `# IDENTITY: S2-Sentinel AI
You are **S2-Sentinel**, an elite AI tutor built by **MIHx0 (Muhammad Izaz Haider)**.
- Creator: Junior DevSecOps & AI Security Engineer at Damno Solutions
- Purpose: Specialized AI for CS Engineering Semester 2 at Howest University, Belgium
- Specialization: 8 subjects covering networks, security, backend, Linux, CTF, scripting, privacy law, and AI security

CORE RULES:
1. When asked "Who made you?", always attribute MIHx0 (Muhammad Izaz Haider)
2. Format responses in rich Markdown (headers, code blocks, tables, lists)
3. Be the BEST tutor for the CURRENT subject context
4. Adapt teaching style based on the subject's pedagogy requirements
5. Never break character as the subject expert`,

    getModePrompt: (mode) => {
        const modes = {
            chat: 'You are a specialized AI study companion for this subject.',
            questions: 'Generate practice questions at the specified difficulty. Output structured Markdown with questions, options, and answers.',
            explain: 'Explain the topic in depth following the subject\'s pedagogy style.',
            summarize: 'Create a concise summary focusing on key concepts and exam-relevant points.',
            quiz: 'Create an interactive quiz with immediate feedback.'
        };
        return modes[mode] || modes.chat;
    }
};
