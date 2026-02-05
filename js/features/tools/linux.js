/**
 * tools/linux.js
 * Linux Tools
 */

export const linuxTools = {
    'permission-calculator': {
        id: 'permission-calculator',
        name: 'Permission Calculator',
        subject: 'linux',
        icon: 'fa-lock',
        description: 'Convert between symbolic (rwx) and octal (755) permissions',
        inputs: [
            { name: 'perm', label: 'Permission', placeholder: '755 or rwxr-xr-x', type: 'text' }
        ],
        execute: (perm) => {
            const input = perm.trim();
            
            // Octal to symbolic
            if (/^[0-7]{3,4}$/.test(input)) {
                const digits = input.length === 4 ? input.slice(1) : input;
                const special = input.length === 4 ? parseInt(input[0]) : 0;
                
                const map = { 0: '---', 1: '--x', 2: '-w-', 3: '-wx', 4: 'r--', 5: 'r-x', 6: 'rw-', 7: 'rwx' };
                const symbolic = digits.split('').map(d => map[d]).join('');
                
                return {
                    octal: input,
                    symbolic: symbolic,
                    owner: map[digits[0]],
                    group: map[digits[1]],
                    others: map[digits[2]],
                    description: `Owner: ${map[digits[0]]}, Group: ${map[digits[1]]}, Others: ${map[digits[2]]}`
                };
            }
            
            // Symbolic to octal
            if (/^[rwx-]{9}$/.test(input)) {
                const calc = (s) => (s[0] === 'r' ? 4 : 0) + (s[1] === 'w' ? 2 : 0) + (s[2] === 'x' ? 1 : 0);
                const octal = [
                    calc(input.slice(0, 3)),
                    calc(input.slice(3, 6)),
                    calc(input.slice(6, 9))
                ].join('');
                
                return {
                    symbolic: input,
                    octal: octal,
                    owner: input.slice(0, 3),
                    group: input.slice(3, 6),
                    others: input.slice(6, 9),
                    chmodCommand: `chmod ${octal} filename`
                };
            }
            
            return { error: 'Enter octal (755) or symbolic (rwxr-xr-x)' };
        }
    },

    'cron-generator': {
        id: 'cron-generator',
        name: 'Cron Generator',
        subject: 'linux',
        icon: 'fa-clock',
        description: 'Generate cron expressions from human-readable descriptions',
        inputs: [
            { name: 'schedule', label: 'Schedule', placeholder: 'every day at 3am', type: 'text' }
        ],
        execute: (schedule) => {
            const s = schedule.toLowerCase();
            let cron = '* * * * *';
            let description = '';

            if (s.includes('every minute')) {
                cron = '* * * * *';
                description = 'Every minute';
            } else if (s.includes('every hour')) {
                cron = '0 * * * *';
                description = 'Every hour at minute 0';
            } else if (s.includes('every day at') || s.includes('daily at')) {
                const match = s.match(/(\d+)\s*(am|pm)?/);
                if (match) {
                    let hour = parseInt(match[1]);
                    if (match[2] === 'pm' && hour < 12) hour += 12;
                    if (match[2] === 'am' && hour === 12) hour = 0;
                    cron = `0 ${hour} * * *`;
                    description = `Every day at ${hour}:00`;
                }
            } else if (s.includes('every monday')) {
                cron = '0 0 * * 1';
                description = 'Every Monday at midnight';
            } else if (s.includes('every sunday')) {
                cron = '0 0 * * 0';
                description = 'Every Sunday at midnight';
            } else if (s.includes('every week')) {
                cron = '0 0 * * 0';
                description = 'Every week on Sunday at midnight';
            } else if (s.includes('every month')) {
                cron = '0 0 1 * *';
                description = 'First day of every month at midnight';
            }

            return {
                cron,
                description,
                fields: {
                    minute: cron.split(' ')[0],
                    hour: cron.split(' ')[1],
                    dayOfMonth: cron.split(' ')[2],
                    month: cron.split(' ')[3],
                    dayOfWeek: cron.split(' ')[4]
                },
                addToCrontab: `crontab -e  # Then add: ${cron} /path/to/script.sh`
            };
        }
    },

    'command-builder': {
        id: 'command-builder',
        name: 'Linux Command Builder',
        subject: 'linux',
        icon: 'fa-terminal',
        description: 'Build Linux commands interactively with explanations',
        inputs: [
            { name: 'command', label: 'Base Command', placeholder: 'find', type: 'select', options: ['find', 'grep', 'tar', 'chmod', 'chown', 'ssh', 'curl', 'wget'] },
            { name: 'options', label: 'Options/Flags', placeholder: '-type f -name "*.txt"', type: 'text' }
        ],
        execute: (command, options) => {
            const explanations = {
                find: {
                    description: 'Search for files and directories',
                    examples: [
                        { cmd: 'find . -type f -name "*.log"', desc: 'Find all .log files' },
                        { cmd: 'find /var -mtime -7', desc: 'Modified in last 7 days' },
                        { cmd: 'find . -size +100M', desc: 'Files larger than 100MB' }
                    ]
                },
                grep: {
                    description: 'Search text patterns in files',
                    examples: [
                        { cmd: 'grep -r "error" /var/log', desc: 'Recursive search for "error"' },
                        { cmd: 'grep -i "password" file.txt', desc: 'Case-insensitive search' },
                        { cmd: 'grep -n "TODO" *.js', desc: 'Show line numbers' }
                    ]
                },
                tar: {
                    description: 'Archive and compress files',
                    examples: [
                        { cmd: 'tar -czf archive.tar.gz folder/', desc: 'Create gzip archive' },
                        { cmd: 'tar -xzf archive.tar.gz', desc: 'Extract gzip archive' },
                        { cmd: 'tar -tvf archive.tar', desc: 'List contents without extracting' }
                    ]
                },
                chmod: {
                    description: 'Change file permissions',
                    examples: [
                        { cmd: 'chmod 755 script.sh', desc: 'rwxr-xr-x (executable)' },
                        { cmd: 'chmod +x file', desc: 'Add execute permission' },
                        { cmd: 'chmod -R 644 *.txt', desc: 'Recursive read/write' }
                    ]
                },
                chown: {
                    description: 'Change file owner/group',
                    examples: [
                        { cmd: 'chown user:group file.txt', desc: 'Change owner and group' },
                        { cmd: 'chown -R www-data:www-data /var/www', desc: 'Recursive ownership' }
                    ]
                },
                ssh: {
                    description: 'Secure shell remote login',
                    examples: [
                        { cmd: 'ssh user@host', desc: 'Basic SSH login' },
                        { cmd: 'ssh -i key.pem user@host', desc: 'Login with private key' },
                        { cmd: 'ssh -L 8080:localhost:80 user@host', desc: 'Port forwarding' }
                    ]
                },
                curl: {
                    description: 'Transfer data from/to servers',
                    examples: [
                        { cmd: 'curl https://api.example.com', desc: 'GET request' },
                        { cmd: 'curl -X POST -d "data" url', desc: 'POST with data' },
                        { cmd: 'curl -I https://example.com', desc: 'Headers only' }
                    ]
                },
                wget: {
                    description: 'Download files from web',
                    examples: [
                        { cmd: 'wget https://example.com/file.zip', desc: 'Download file' },
                        { cmd: 'wget -r -np url', desc: 'Recursive download' },
                        { cmd: 'wget -c url', desc: 'Continue interrupted download' }
                    ]
                }
            };

            const info = explanations[command];
            return {
                command: `${command} ${options}`,
                description: info.description,
                examples: info.examples,
                manPage: `Run: man ${command}`
            };
        }
    },

    'linux-cheatsheet': {
        id: 'linux-cheatsheet',
        name: 'Linux Cheatsheet',
        subject: 'linux',
        icon: 'fa-book',
        description: 'Quick reference for common Linux commands',
        inputs: [
            { name: 'category', label: 'Category', placeholder: 'file', type: 'select', options: ['file', 'network', 'process', 'system', 'security', 'text'] }
        ],
        execute: (category) => {
            const cheatsheets = {
                file: `FILE OPERATIONS
───────────────────────────────────────────────────────
ls -lah              List all files (detailed, human-readable)
cd /path/to/dir      Change directory
pwd                  Print working directory
cp -r src/ dst/      Copy directory recursively
mv old new           Move/rename file
rm -rf folder/       Remove directory forcefully
mkdir -p a/b/c       Create nested directories
touch file.txt       Create empty file
cat file.txt         Display file contents
less file.txt        View file (scrollable)
head -n 20 file      First 20 lines
tail -f log          Follow log file (real-time)
find . -name "*.log" Search for files
du -sh *             Directory sizes (human-readable)
df -h                Disk space usage`,

                network: `NETWORK COMMANDS
───────────────────────────────────────────────────────
ip addr show         Show IP addresses
ip route             Show routing table
ping -c 4 8.8.8.8    Test connectivity (4 packets)
netstat -tuln        Active ports (TCP/UDP, listening)
ss -tulpn            Socket statistics (faster than netstat)
curl https://ip.me   Get public IP
wget url             Download file
traceroute google.com Path to destination
nslookup domain.com  DNS lookup
dig example.com MX   DNS query (detailed)
iptables -L          List firewall rules
nc -zv host 80       Port scan with netcat`,

                process: `PROCESS MANAGEMENT
───────────────────────────────────────────────────────
ps aux               All running processes
ps aux | grep name   Find process by name
top                  Interactive process viewer
htop                 Better top (if installed)
kill PID             Terminate process
kill -9 PID          Force kill
killall name         Kill all processes by name
pkill -f pattern     Kill by pattern
bg                   Send job to background
fg                   Bring job to foreground
jobs                 List background jobs
nohup cmd &          Run immune to hangup
systemctl status srv Check service status
systemctl start srv  Start service`,

                system: `SYSTEM INFO
───────────────────────────────────────────────────────
uname -a             System information
hostname             Show hostname
uptime               System uptime
whoami               Current user
who                  Logged in users
w                    Who's doing what
free -h              Memory usage (human-readable)
df -h                Disk usage
lsblk                List block devices
lscpu                CPU information
cat /etc/os-release  OS version
dmesg | tail         Kernel messages
journalctl -xe       System logs (systemd)`,

                security: `SECURITY COMMANDS
───────────────────────────────────────────────────────
chmod 755 file       Change permissions (rwxr-xr-x)
chown user:group f   Change ownership
sudo command         Run as superuser
su - username        Switch user
passwd               Change password
ssh-keygen -t rsa    Generate SSH key
ssh user@host        SSH login
scp file user@host:  Secure copy
gpg -c file          Encrypt file
gpg file.gpg         Decrypt file
openssl rand -base64 Generate random password
last                 Login history
fail2ban-client      Ban failed login attempts`,

                text: `TEXT PROCESSING
───────────────────────────────────────────────────────
grep pattern file    Search text
grep -r "error" .    Recursive search
sed 's/old/new/g'    Find and replace
awk '{print $1}'     Print first column
cut -d: -f1 file     Cut by delimiter
sort file            Sort lines
uniq                 Remove duplicates
wc -l file           Count lines
tr 'a-z' 'A-Z'       Transform characters
diff file1 file2     Compare files
comm file1 file2     Common/unique lines
column -t            Format as table`
            };

            return {
                category: category.toUpperCase(),
                cheatsheet: cheatsheets[category],
                tip: 'Pro tip: Use "man command" for detailed documentation'
            };
        }
    }
};
