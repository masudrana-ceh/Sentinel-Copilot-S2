/**
 * tools/backend.js
 * Backend Tools
 */

export const backendTools = {
    'jwt-decoder': {
        id: 'jwt-decoder',
        name: 'JWT Decoder',
        subject: 'backend',
        icon: 'fa-key',
        description: 'Decode JWT tokens to view header and payload',
        inputs: [
            { name: 'token', label: 'JWT Token', placeholder: 'eyJhbGciOiJIUzI1NiIs...', type: 'textarea' }
        ],
        execute: (token) => {
            const parts = token.trim().split('.');
            if (parts.length !== 3) {
                return { error: 'Invalid JWT format. Must have 3 parts separated by dots.' };
            }

            try {
                const decodeBase64Url = (str) => {
                    str = str.replace(/-/g, '+').replace(/_/g, '/');
                    return JSON.parse(atob(str));
                };

                const header = decodeBase64Url(parts[0]);
                const payload = decodeBase64Url(parts[1]);

                // Check expiration
                let expired = null;
                if (payload.exp) {
                    const expDate = new Date(payload.exp * 1000);
                    expired = expDate < new Date();
                }

                return {
                    header,
                    payload,
                    signature: parts[2].slice(0, 20) + '...',
                    algorithm: header.alg,
                    expired: expired === null ? 'No exp claim' : expired ? '❌ Expired' : '✅ Valid',
                    expiration: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A',
                    issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'N/A'
                };
            } catch (e) {
                return { error: `Failed to decode: ${e.message}` };
            }
        }
    },

    'sql-formatter': {
        id: 'sql-formatter',
        name: 'SQL Formatter',
        subject: 'backend',
        icon: 'fa-database',
        description: 'Format and prettify SQL queries',
        inputs: [
            { name: 'sql', label: 'SQL Query', placeholder: 'SELECT * FROM users WHERE id=1', type: 'textarea' }
        ],
        execute: (sql) => {
            // Simple SQL formatter
            let formatted = sql
                .replace(/\s+/g, ' ')
                .trim()
                .replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|ON|AND|OR|ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET|INSERT INTO|VALUES|UPDATE|SET|DELETE|CREATE TABLE|ALTER TABLE|DROP TABLE)\b/gi, '\n$1')
                .replace(/,/g, ',\n  ')
                .replace(/\n+/g, '\n')
                .split('\n')
                .map(line => {
                    line = line.trim();
                    if (line.match(/^(FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|ON|AND|OR|ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET|VALUES|SET)/i)) {
                        return '  ' + line;
                    }
                    return line;
                })
                .join('\n');

            // Add syntax highlighting hints
            const keywords = formatted.match(/\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE)\b/gi) || [];

            return {
                original: sql,
                formatted: formatted,
                keywords: [...new Set(keywords.map(k => k.toUpperCase()))],
                lines: formatted.split('\n').length,
                tip: 'Use prepared statements to prevent SQL injection'
            };
        }
    },

    'php-validator': {
        id: 'php-validator',
        name: 'PHP Validator',
        subject: 'backend',
        icon: 'fa-code',
        description: 'Check PHP syntax and common security issues',
        inputs: [
            { name: 'code', label: 'PHP Code', placeholder: '<?php echo "Hello"; ?>', type: 'textarea' }
        ],
        execute: (code) => {
            const issues = [];
            const warnings = [];
            const tips = [];

            // Basic syntax checks
            if (!code.includes('<?php') && !code.includes('<?=')) {
                issues.push('Missing PHP opening tag (<?php)');
            }

            // Security checks
            if (code.match(/\beval\s*\(/)) {
                issues.push('⚠️ Security: eval() is dangerous - allows arbitrary code execution');
            }
            if (code.match(/\b(exec|system|shell_exec|passthru)\s*\(/)) {
                warnings.push('⚠️ Security: Command execution functions detected - validate input!');
            }
            if (code.match(/\$_(GET|POST|REQUEST)\[/)) {
                warnings.push('💡 Use filter_input() or validate user input to prevent injection');
            }
            if (code.match(/mysql_query/)) {
                issues.push('❌ Deprecated: Use mysqli or PDO instead of mysql_* functions');
            }
            if (code.match(/include|require/) && !code.match(/include_once|require_once/)) {
                tips.push('💡 Consider using include_once/require_once to prevent redefinition');
            }
            if (code.match(/echo\s+\$_(GET|POST|REQUEST)/)) {
                issues.push('⚠️ XSS Vulnerability: Unsanitized output - use htmlspecialchars()');
            }

            // Check for balanced braces
            const openBraces = (code.match(/{/g) || []).length;
            const closeBraces = (code.match(/}/g) || []).length;
            if (openBraces !== closeBraces) {
                issues.push('Syntax: Unbalanced curly braces');
            }

            // Check for balanced parentheses
            const openParens = (code.match(/\(/g) || []).length;
            const closeParens = (code.match(/\)/g) || []).length;
            if (openParens !== closeParens) {
                issues.push('Syntax: Unbalanced parentheses');
            }

            // Best practices
            if (!code.match(/declare\s*\(\s*strict_types\s*=\s*1\s*\)/)) {
                tips.push('💡 Add declare(strict_types=1); for type safety');
            }

            return {
                status: issues.length === 0 ? '✅ No critical issues' : '❌ Issues found',
                criticalIssues: issues.length,
                issues: issues.length > 0 ? issues.join('\n') : 'None',
                warnings: warnings.length > 0 ? warnings.join('\n') : 'None',
                tips: tips.length > 0 ? tips.join('\n') : 'Code looks good!',
                note: 'This is a basic validator. Use php -l for official syntax check.'
            };
        }
    },

    'node-package-analyzer': {
        id: 'node-package-analyzer',
        name: 'Node Package Analyzer',
        subject: 'backend',
        icon: 'fa-boxes-stacked',
        description: 'Analyze package.json dependencies and check for issues',
        inputs: [
            { name: 'packageJson', label: 'package.json content', placeholder: '{"dependencies": {...}}', type: 'textarea' }
        ],
        execute: (packageJson) => {
            try {
                const pkg = JSON.parse(packageJson);
                const deps = pkg.dependencies || {};
                const devDeps = pkg.devDependencies || {};
                
                const allDeps = {...deps, ...devDeps};
                const depCount = Object.keys(deps).length;
                const devDepCount = Object.keys(devDeps).length;

                // Check for version issues
                const issues = [];
                const warnings = [];

                for (const [name, version] of Object.entries(allDeps)) {
                    if (version === '*' || version === 'latest') {
                        issues.push(`${name}: Use specific version instead of "${version}"`);
                    }
                    if (version.startsWith('^') || version.startsWith('~')) {
                        warnings.push(`${name}: ${version} - May auto-update (intentional?)`);
                    }
                }

                // Check for known risky packages (examples)
                const riskyPackages = ['event-stream', 'flatmap-stream'];
                for (const risky of riskyPackages) {
                    if (allDeps[risky]) {
                        issues.push(`⚠️ ${risky}: Known security issues in past - verify version`);
                    }
                }

                // Check for common misconfigurations
                if (!pkg.engines) {
                    warnings.push('No "engines" field - specify Node.js version for compatibility');
                }

                return {
                    packageName: pkg.name || 'unnamed',
                    version: pkg.version || 'N/A',
                    dependencies: depCount,
                    devDependencies: devDepCount,
                    totalPackages: depCount + devDepCount,
                    issues: issues.length > 0 ? issues.join('\n') : 'None',
                    warnings: warnings.length > 0 ? warnings.join('\n') : 'None',
                    scripts: Object.keys(pkg.scripts || {}).join(', ') || 'None',
                    recommendation: 'Run "npm audit" to check for vulnerabilities',
                    nodeVersion: pkg.engines?.node || 'Not specified'
                };
            } catch (e) {
                return { error: `Invalid JSON: ${e.message}` };
            }
        }
    }
};
