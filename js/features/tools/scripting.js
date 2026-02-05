/**
 * tools/scripting.js
 * Scripting Tools
 */

export const scriptingTools = {
    'regex-tester': {
        id: 'regex-tester',
        name: 'Regex Tester',
        subject: 'scripting',
        icon: 'fa-asterisk',
        description: 'Test regular expressions against sample text',
        inputs: [
            { name: 'pattern', label: 'Regex Pattern', placeholder: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', type: 'text' },
            { name: 'text', label: 'Test Text', placeholder: 'Text to test against', type: 'textarea' },
            { name: 'flags', label: 'Flags', placeholder: 'gi', type: 'text' }
        ],
        execute: (pattern, text, flags = 'g') => {
            try {
                const regex = new RegExp(pattern, flags);
                const matches = [...text.matchAll(new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'))];
                
                return {
                    valid: true,
                    pattern,
                    flags,
                    matchCount: matches.length,
                    matches: matches.slice(0, 10).map(m => ({
                        match: m[0],
                        index: m.index,
                        groups: m.groups || {}
                    })),
                    pythonSyntax: `import re\nre.findall(r'${pattern}', text)`,
                    bashSyntax: `grep -${flags.includes('i') ? 'i' : ''}oP '${pattern}' file.txt`
                };
            } catch (e) {
                return { valid: false, error: e.message };
            }
        }
    },

    'code-analyzer': {
        id: 'code-analyzer',
        name: 'Code Analyzer',
        subject: 'scripting',
        icon: 'fa-magnifying-glass-chart',
        description: 'Static analysis for Python/Bash/JavaScript syntax and best practices',
        inputs: [
            { name: 'code', label: 'Code', placeholder: 'def hello():\n    print("Hello")', type: 'textarea' },
            { name: 'language', label: 'Language', placeholder: 'python', type: 'select', options: ['python', 'bash', 'javascript'] }
        ],
        execute: (code, language) => {
            const issues = [];
            const warnings = [];
            const stats = {
                lines: code.split('\n').length,
                characters: code.length
            };

            if (language === 'python') {
                // Python-specific checks
                const lines = code.split('\n');
                lines.forEach((line, i) => {
                    if (line.trim().startsWith('import ') && i > 0 && !lines[i-1].trim().startsWith('import')) {
                        warnings.push(`Line ${i+1}: Imports should be at top of file`);
                    }
                    if (line.includes('\t')) {
                        issues.push(`Line ${i+1}: Use spaces, not tabs (PEP 8)`);
                    }
                    if (line.trim().endsWith('\\')) {
                        warnings.push(`Line ${i+1}: Avoid line continuation, use implicit continuation`);
                    }
                });

                if (code.match(/\bexec\s*\(/)) {
                    issues.push('Security: exec() is dangerous');
                }
                if (code.match(/\beval\s*\(/)) {
                    issues.push('Security: eval() is dangerous');
                }
                if (code.match(/except:/)) {
                    warnings.push('Bare except: catches all exceptions - be specific');
                }
                stats.functions = (code.match(/\bdef\s+\w+/g) || []).length;
                stats.classes = (code.match(/\bclass\s+\w+/g) || []).length;

            } else if (language === 'bash') {
                // Bash-specific checks
                if (!code.startsWith('#!')) {
                    warnings.push('Add shebang: #!/bin/bash');
                }
                if (code.includes('rm -rf $')) {
                    issues.push('⚠️ DANGER: rm -rf with variable - quote it! Use: rm -rf "${var}"');
                }
                if (code.match(/\$\w+/) && !code.includes('"$')) {
                    warnings.push('Quote variables to prevent word splitting: "$var"');
                }
                if (!code.includes('set -e') && !code.includes('set -o')) {
                    warnings.push('Consider: set -euo pipefail for safer scripts');
                }
                stats.functions = (code.match(/function\s+\w+|^\w+\s*\(\)/gm) || []).length;

            } else if (language === 'javascript') {
                // JavaScript-specific checks
                if (code.includes('var ')) {
                    warnings.push('Use let/const instead of var (ES6+)');
                }
                if (code.includes('== ') || code.includes('!= ')) {
                    warnings.push('Use === and !== for strict equality');
                }
                if (code.match(/\beval\s*\(/)) {
                    issues.push('Security: eval() is dangerous');
                }
                if (code.match(/console\.log/) && code.includes('production')) {
                    warnings.push('Remove console.log in production');
                }
                stats.functions = (code.match(/function\s+\w+|const\s+\w+\s*=\s*\(.*\)\s*=>/g) || []).length;
            }

            return {
                language: language.toUpperCase(),
                status: issues.length === 0 ? '✅ No critical issues' : '❌ Issues found',
                stats,
                issues: issues.length > 0 ? issues.join('\n') : 'None',
                warnings: warnings.length > 0 ? warnings.join('\n') : 'Looks good!',
                linter: language === 'python' ? 'Use: pylint, flake8, black' :
                       language === 'bash' ? 'Use: shellcheck' :
                       'Use: eslint, prettier'
            };
        }
    }
};
