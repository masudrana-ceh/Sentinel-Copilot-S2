/**
 * tools/networks.js
 * Computer Networks Tools — Subnet calculator, port lookup, CIDR, protocol diagrams, bandwidth, DNS
 */

export const networkTools = {

    'subnet-calculator': {
        id: 'subnet-calculator',
        name: 'Subnet Calculator',
        subject: 'networks',
        icon: 'fa-calculator',
        description: 'Calculate network address, broadcast, and usable hosts from CIDR notation',
        inputs: [
            { name: 'cidr', label: 'IP/CIDR', placeholder: '192.168.1.0/24', type: 'text' }
        ],
        execute: (cidr) => {
            const parts = cidr.split('/');
            if (parts.length !== 2) return { error: 'Invalid format. Use: IP/CIDR (e.g., 192.168.1.0/24)' };

            const ip = parts[0];
            const prefix = parseInt(parts[1]);

            if (prefix < 0 || prefix > 32) return { error: 'CIDR must be between 0 and 32' };

            const ipParts = ip.split('.').map(Number);
            if (ipParts.length !== 4 || ipParts.some(p => p < 0 || p > 255)) {
                return { error: 'Invalid IP address' };
            }

            const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
            const mask = prefix === 0 ? 0 : ~((1 << (32 - prefix)) - 1);
            const network = ipNum & mask;
            const broadcast = network | ~mask;
            const usableHosts = prefix >= 31 ? (prefix === 32 ? 1 : 2) : (1 << (32 - prefix)) - 2;

            const numToIp = (n) => [
                (n >>> 24) & 255,
                (n >>> 16) & 255,
                (n >>> 8) & 255,
                n & 255
            ].join('.');

            return {
                networkAddress: numToIp(network >>> 0),
                broadcastAddress: numToIp(broadcast >>> 0),
                subnetMask: numToIp(mask >>> 0),
                wildcardMask: numToIp((~mask) >>> 0),
                usableHosts: usableHosts,
                firstHost: prefix < 31 ? numToIp((network + 1) >>> 0) : numToIp(network >>> 0),
                lastHost: prefix < 31 ? numToIp((broadcast - 1) >>> 0) : numToIp(broadcast >>> 0),
                cidrNotation: `/${prefix}`,
                ipClass: ipParts[0] < 128 ? 'A' : ipParts[0] < 192 ? 'B' : ipParts[0] < 224 ? 'C' : 'D/E'
            };
        }
    },

    'port-lookup': {
        id: 'port-lookup',
        name: 'Port Lookup',
        subject: 'networks',
        icon: 'fa-door-open',
        description: 'Look up common port numbers and their services',
        inputs: [
            { name: 'port', label: 'Port Number', placeholder: '443', type: 'number' }
        ],
        execute: (port) => {
            const ports = {
                20: { service: 'FTP Data', protocol: 'TCP', category: 'File Transfer' },
                21: { service: 'FTP Control', protocol: 'TCP', category: 'File Transfer' },
                22: { service: 'SSH', protocol: 'TCP', category: 'Remote Access' },
                23: { service: 'Telnet', protocol: 'TCP', category: 'Remote Access (Insecure)' },
                25: { service: 'SMTP', protocol: 'TCP', category: 'Email' },
                53: { service: 'DNS', protocol: 'TCP/UDP', category: 'Name Resolution' },
                67: { service: 'DHCP Server', protocol: 'UDP', category: 'Network Config' },
                68: { service: 'DHCP Client', protocol: 'UDP', category: 'Network Config' },
                80: { service: 'HTTP', protocol: 'TCP', category: 'Web' },
                110: { service: 'POP3', protocol: 'TCP', category: 'Email' },
                123: { service: 'NTP', protocol: 'UDP', category: 'Time Sync' },
                143: { service: 'IMAP', protocol: 'TCP', category: 'Email' },
                161: { service: 'SNMP', protocol: 'UDP', category: 'Network Management' },
                443: { service: 'HTTPS', protocol: 'TCP', category: 'Web (Secure)' },
                445: { service: 'SMB/CIFS', protocol: 'TCP', category: 'File Sharing' },
                465: { service: 'SMTPS', protocol: 'TCP', category: 'Email (Secure)' },
                587: { service: 'SMTP Submission', protocol: 'TCP', category: 'Email' },
                993: { service: 'IMAPS', protocol: 'TCP', category: 'Email (Secure)' },
                995: { service: 'POP3S', protocol: 'TCP', category: 'Email (Secure)' },
                1433: { service: 'MS SQL Server', protocol: 'TCP', category: 'Database' },
                3306: { service: 'MySQL', protocol: 'TCP', category: 'Database' },
                3389: { service: 'RDP', protocol: 'TCP', category: 'Remote Desktop' },
                5432: { service: 'PostgreSQL', protocol: 'TCP', category: 'Database' },
                5900: { service: 'VNC', protocol: 'TCP', category: 'Remote Desktop' },
                6379: { service: 'Redis', protocol: 'TCP', category: 'Database/Cache' },
                8080: { service: 'HTTP Proxy/Alt', protocol: 'TCP', category: 'Web' },
                8443: { service: 'HTTPS Alt', protocol: 'TCP', category: 'Web (Secure)' },
                27017: { service: 'MongoDB', protocol: 'TCP', category: 'Database' }
            };

            const p = parseInt(port);
            if (ports[p]) {
                return { port: p, ...ports[p] };
            }
            return { 
                port: p, 
                service: 'Unknown', 
                note: p < 1024 ? 'Well-known port range' : p < 49152 ? 'Registered port range' : 'Dynamic/Private port range'
            };
        }
    },

    'cidr-converter': {
        id: 'cidr-converter',
        name: 'CIDR Converter',
        subject: 'networks',
        icon: 'fa-exchange-alt',
        description: 'Convert between CIDR, subnet mask, and wildcard mask',
        inputs: [
            { name: 'input', label: 'CIDR or Subnet Mask', placeholder: '/24 or 255.255.255.0', type: 'text' }
        ],
        execute: (input) => {
            let cidr, mask;

            if (input.startsWith('/')) {
                cidr = parseInt(input.slice(1));
            } else if (input.includes('.')) {
                const parts = input.split('.').map(Number);
                const binary = parts.map(p => p.toString(2).padStart(8, '0')).join('');
                cidr = binary.indexOf('0') === -1 ? 32 : binary.indexOf('0');
            } else {
                cidr = parseInt(input);
            }

            if (cidr < 0 || cidr > 32) return { error: 'Invalid CIDR (0-32)' };

            mask = cidr === 0 ? 0 : ~((1 << (32 - cidr)) - 1);
            const numToIp = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

            return {
                cidr: `/${cidr}`,
                subnetMask: numToIp(mask >>> 0),
                wildcardMask: numToIp((~mask) >>> 0),
                binaryMask: '1'.repeat(cidr) + '0'.repeat(32 - cidr),
                totalAddresses: Math.pow(2, 32 - cidr),
                usableHosts: cidr >= 31 ? (cidr === 32 ? 1 : 2) : Math.pow(2, 32 - cidr) - 2
            };
        }
    },

    'protocol-diagram': {
        id: 'protocol-diagram',
        name: 'Protocol Diagram',
        subject: 'networks',
        icon: 'fa-diagram-project',
        description: 'Visualize TCP/IP/UDP/ICMP packet headers with ASCII diagrams',
        inputs: [
            { name: 'protocol', label: 'Protocol', placeholder: 'tcp', type: 'select', options: ['tcp', 'udp', 'ip', 'icmp', 'ethernet'] }
        ],
        execute: (protocol) => {
            const diagrams = {
                tcp: `TCP Header (20-60 bytes)
┌─────────────────────────────────────────────────────────────────────┐
│ 0                   1                   2                   3       │
│ 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1     │
├─────────────────────────────────────────────────────────────────────┤
│          Source Port (16 bits)        │   Destination Port (16)   │
├─────────────────────────────────────────────────────────────────────┤
│                    Sequence Number (32 bits)                        │
├─────────────────────────────────────────────────────────────────────┤
│                 Acknowledgment Number (32 bits)                     │
├─────────────────┬───────┬───────────────┬───────────────────────────┤
│ Data Offset (4) │Resv(3)│  Flags (9)    │    Window Size (16)       │
├─────────────────┴───────┴───────────────┼───────────────────────────┤
│           Checksum (16 bits)            │  Urgent Pointer (16)      │
├─────────────────────────────────────────┴───────────────────────────┤
│                Options (if Data Offset > 5)                         │
└─────────────────────────────────────────────────────────────────────┘

Flags: URG, ACK, PSH, RST, SYN, FIN`,

                udp: `UDP Header (8 bytes)
┌─────────────────────────────────────────────────────────────────────┐
│ 0                   1                   2                   3       │
│ 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1     │
├─────────────────────────────────────────────────────────────────────┤
│          Source Port (16 bits)        │   Destination Port (16)   │
├─────────────────────────────────────────┴───────────────────────────┤
│            Length (16 bits)             │      Checksum (16)        │
└─────────────────────────────────────────┴───────────────────────────┘

Simpler than TCP - connectionless, no handshake`,

                ip: `IPv4 Header (20-60 bytes)
┌─────────────────────────────────────────────────────────────────────┐
│Version│  IHL  │Type of Service│         Total Length (16)           │
├───────┴───────┴───────────────┼─────────────────┬───────────────────┤
│       Identification (16)               │Flags│Fragment Offset (13) │
├─────────────────┬───────────────────────┼─────┴───────────────────────┤
│TTL (8)│Protocol│   Header Checksum (16)                          │
├───────┴────────┴───────────────────────────────────────────────────┤
│                    Source IP Address (32 bits)                      │
├─────────────────────────────────────────────────────────────────────┤
│                 Destination IP Address (32 bits)                    │
├─────────────────────────────────────────────────────────────────────┤
│                   Options (if IHL > 5)                              │
└─────────────────────────────────────────────────────────────────────┘

Protocol: 6=TCP, 17=UDP, 1=ICMP`,

                icmp: `ICMP Header (8+ bytes)
┌─────────────────────────────────────────────────────────────────────┐
│     Type (8)      │     Code (8)      │      Checksum (16)          │
├───────────────────┴───────────────────┴─────────────────────────────┤
│                      Rest of Header (32 bits)                       │
│                    (varies by Type/Code)                            │
└─────────────────────────────────────────────────────────────────────┘

Common Types:
  0: Echo Reply (ping response)
  3: Destination Unreachable
  8: Echo Request (ping)
  11: Time Exceeded (traceroute)`,

                ethernet: `Ethernet Frame
┌─────────────────────────────────────────────────────────────────────┐
│              Destination MAC Address (48 bits)                      │
├─────────────────────────────────────────────────────────────────────┤
│                 Source MAC Address (48 bits)                        │
├─────────────────────────────────────────────────────────────────────┤
│    EtherType (16)     │                                             │
├───────────────────────┤          Payload (46-1500 bytes)            │
│                       │                                             │
├───────────────────────┴─────────────────────────────────────────────┤
│                    Frame Check Sequence (32 bits)                   │
└─────────────────────────────────────────────────────────────────────┘

EtherType: 0x0800=IPv4, 0x0806=ARP, 0x86DD=IPv6`
            };

            return {
                protocol: protocol.toUpperCase(),
                diagram: diagrams[protocol.toLowerCase()] || 'Unknown protocol',
                note: `Layer: ${protocol === 'ethernet' ? 'L2 (Data Link)' : protocol === 'ip' ? 'L3 (Network)' : 'L4 (Transport)'}`
            };
        }
    },

    'bandwidth-calculator': {
        id: 'bandwidth-calculator',
        name: 'Bandwidth Calculator',
        subject: 'networks',
        icon: 'fa-gauge-high',
        description: 'Calculate bandwidth, throughput, and transfer time',
        inputs: [
            { name: 'fileSize', label: 'File Size (MB)', placeholder: '100', type: 'number' },
            { name: 'bandwidth', label: 'Bandwidth (Mbps)', placeholder: '100', type: 'number' }
        ],
        execute: (fileSize, bandwidth) => {
            const fileSizeMB = parseFloat(fileSize) || 0;
            const bandwidthMbps = parseFloat(bandwidth) || 0;

            if (fileSizeMB <= 0 || bandwidthMbps <= 0) {
                return { error: 'Please enter positive values for both file size and bandwidth' };
            }

            const fileSizeBits = fileSizeMB * 8 * 1024 * 1024;
            const bandwidthBps = bandwidthMbps * 1000 * 1000;
            const transferTimeSec = fileSizeBits / bandwidthBps;
            
            const formatTime = (sec) => {
                if (sec < 60) return `${sec.toFixed(2)} seconds`;
                if (sec < 3600) return `${(sec / 60).toFixed(2)} minutes`;
                return `${(sec / 3600).toFixed(2)} hours`;
            };

            return {
                fileSize: `${fileSizeMB} MB (${(fileSizeMB * 1024).toFixed(2)} KB)`,
                bandwidth: `${bandwidthMbps} Mbps (${(bandwidthMbps / 8).toFixed(2)} MBps)`,
                theoreticalTime: formatTime(transferTimeSec),
                actual80percent: formatTime(transferTimeSec / 0.8),
                actual60percent: formatTime(transferTimeSec / 0.6),
                note: 'Actual times account for TCP/IP overhead (20-40%)'
            };
        }
    },

    'dns-lookup-simulator': {
        id: 'dns-lookup-simulator',
        name: 'DNS Lookup Simulator',
        subject: 'networks',
        icon: 'fa-magnifying-glass',
        description: 'Simulate DNS record lookups (educational examples)',
        inputs: [
            { name: 'domain', label: 'Domain', placeholder: 'example.com', type: 'text' },
            { name: 'recordType', label: 'Record Type', placeholder: 'A', type: 'select', options: ['A', 'AAAA', 'MX', 'CNAME', 'TXT', 'NS', 'SOA'] }
        ],
        execute: (domain, recordType) => {
            const examples = {
                A: { value: '93.184.216.34', ttl: 3600, description: 'IPv4 address' },
                AAAA: { value: '2606:2800:220:1:248:1893:25c8:1946', ttl: 3600, description: 'IPv6 address' },
                MX: { value: '10 mail.example.com', ttl: 300, description: 'Mail exchanger (priority 10)' },
                CNAME: { value: 'cdn.example.com', ttl: 300, description: 'Canonical name (alias)' },
                TXT: { value: 'v=spf1 include:_spf.example.com ~all', ttl: 3600, description: 'SPF record for email' },
                NS: { value: 'ns1.example.com, ns2.example.com', ttl: 86400, description: 'Nameservers' },
                SOA: { value: 'ns1.example.com admin.example.com 2024020501 7200 3600 604800 86400', ttl: 3600, description: 'Start of Authority' }
            };

            const record = examples[recordType];
            return {
                query: `${domain} ${recordType}`,
                answer: record.value,
                ttl: `${record.ttl} seconds`,
                description: record.description,
                digCommand: `dig ${domain} ${recordType}`,
                nslookupCommand: `nslookup -type=${recordType} ${domain}`,
                note: 'This is a simulated example for learning purposes'
            };
        }
    }
};
