/**
 * tools/privacy.js
 * Privacy Tools
 */

export const privacyTools = {
    'gdpr-article-lookup': {
        id: 'gdpr-article-lookup',
        name: 'GDPR Article Lookup',
        subject: 'privacy',
        icon: 'fa-book',
        description: 'Quick reference to key GDPR articles',
        inputs: [
            { name: 'article', label: 'Article Number', placeholder: '17', type: 'number' }
        ],
        execute: (article) => {
            const articles = {
                5: { title: 'Principles relating to processing', summary: 'Lawfulness, fairness, transparency, purpose limitation, data minimisation, accuracy, storage limitation, integrity and confidentiality, accountability' },
                6: { title: 'Lawfulness of processing', summary: 'Six lawful bases: consent, contract, legal obligation, vital interests, public task, legitimate interests' },
                7: { title: 'Conditions for consent', summary: 'Consent must be freely given, specific, informed, unambiguous. Easily withdrawable.' },
                12: { title: 'Transparent information', summary: 'Information must be provided in concise, transparent, intelligible form' },
                13: { title: 'Information at collection', summary: 'Identity of controller, purposes, legal basis, recipients, retention, rights must be provided' },
                15: { title: 'Right of access', summary: 'Data subject can obtain confirmation and access to their personal data' },
                16: { title: 'Right to rectification', summary: 'Right to correct inaccurate personal data' },
                17: { title: 'Right to erasure', summary: 'Right to be forgotten - deletion of personal data in certain circumstances' },
                18: { title: 'Right to restriction', summary: 'Right to restrict processing in certain situations' },
                20: { title: 'Right to data portability', summary: 'Right to receive data in structured, machine-readable format' },
                21: { title: 'Right to object', summary: 'Right to object to processing based on legitimate interests' },
                22: { title: 'Automated decision-making', summary: 'Right not to be subject to solely automated decisions with legal effects' },
                25: { title: 'Data protection by design', summary: 'Privacy must be built into systems from the start' },
                32: { title: 'Security of processing', summary: 'Appropriate technical and organizational security measures required' },
                33: { title: 'Breach notification (authority)', summary: '72-hour notification to supervisory authority after breach discovery' },
                34: { title: 'Breach notification (subjects)', summary: 'Notification to data subjects when high risk to rights/freedoms' },
                35: { title: 'Data protection impact assessment', summary: 'DPIA required for high-risk processing activities' },
                37: { title: 'Designation of DPO', summary: 'When a Data Protection Officer must be appointed' },
                44: { title: 'Transfer principles', summary: 'Rules for transferring personal data outside EU/EEA' },
                83: { title: 'Administrative fines', summary: 'Up to €20M or 4% global turnover for serious violations' }
            };

            const a = parseInt(article);
            if (articles[a]) {
                return {
                    article: `Article ${a}`,
                    ...articles[a],
                    fullReference: `GDPR Art. ${a}`
                };
            }
            return { error: `Article ${a} not in quick reference. Try: 5, 6, 7, 12-22, 25, 32-35, 37, 44, 83` };
        }
    },

    'privacy-checklist': {
        id: 'privacy-checklist',
        name: 'Privacy Compliance Checklist',
        subject: 'privacy',
        icon: 'fa-clipboard-check',
        description: 'Generate GDPR/CCPA/Privacy compliance checklist',
        inputs: [
            { name: 'regulation', label: 'Regulation', placeholder: 'gdpr', type: 'select', options: ['gdpr', 'ccpa', 'hipaa', 'general'] }
        ],
        execute: (regulation) => {
            const checklists = {
                gdpr: {
                    title: 'GDPR Compliance Checklist',
                    items: [
                        '✓ Lawful basis for processing (Art. 6)',
                        '✓ Consent is freely given, specific, informed (Art. 7)',
                        '✓ Privacy policy is clear and accessible',
                        '✓ Data subject rights implemented (access, rectification, erasure)',
                        '✓ Right to data portability (Art. 20)',
                        '✓ Right to object to processing (Art. 21)',
                        '✓ Data breach notification process (<72 hours)',
                        '✓ Data Protection Impact Assessment (DPIA) when required',
                        '✓ Data Protection Officer (DPO) appointed if needed',
                        '✓ Privacy by design and default',
                        '✓ Data retention policies defined',
                        '✓ Third-party data processors have DPAs',
                        '✓ International data transfers comply with Ch. V',
                        '✓ Cookie consent mechanism (ePrivacy)',
                        '✓ Staff training on GDPR compliance'
                    ],
                    articles: ['Art. 6 (Lawful basis)', 'Art. 7 (Consent)', 'Art. 15-22 (Rights)', 'Art. 33-34 (Breach)', 'Art. 35 (DPIA)']
                },
                ccpa: {
                    title: 'CCPA Compliance Checklist',
                    items: [
                        '✓ Privacy policy updated with CCPA requirements',
                        '✓ "Do Not Sell My Personal Information" link on homepage',
                        '✓ Disclosure of categories of personal information collected',
                        '✓ Disclosure of business/commercial purposes',
                        '✓ Right to know request process (2x/year)',
                        '✓ Right to delete request process',
                        '✓ Right to opt-out of sale process',
                        '✓ Non-discrimination for exercising rights',
                        '✓ Verifiable consumer request procedures',
                        '✓ Service provider agreements updated',
                        '✓ Data inventory and mapping completed',
                        '✓ Employee training on CCPA',
                        '✓ Toll-free number for requests (if applicable)',
                        '✓ Response to requests within 45 days',
                        '✓ Age verification for minors (under 16)'
                    ],
                    articles: ['§1798.100 (Right to Know)', '§1798.105 (Right to Delete)', '§1798.120 (Right to Opt-Out)', '§1798.125 (Non-Discrimination)']
                },
                hipaa: {
                    title: 'HIPAA Compliance Checklist',
                    items: [
                        '✓ Privacy Rule policies and procedures',
                        '✓ Security Rule safeguards (physical, technical, administrative)',
                        '✓ Breach Notification Rule procedures',
                        '✓ Business Associate Agreements (BAAs) in place',
                        '✓ Employee training and awareness',
                        '✓ Designated Privacy Officer',
                        '✓ Patient rights procedures (access, amendment)',
                        '✓ Minimum necessary standard applied',
                        '✓ Notice of Privacy Practices provided',
                        '✓ Encryption of ePHI in transit and at rest',
                        '✓ Access controls and audit logs',
                        '✓ Risk assessment conducted',
                        '✓ Incident response plan',
                        '✓ Sanctions policy for violations',
                        '✓ Documentation and record retention (6 years)'
                    ],
                    rules: ['Privacy Rule (45 CFR 164.502)', 'Security Rule (45 CFR 164.306)', 'Breach Notification (45 CFR 164.400)']
                },
                general: {
                    title: 'General Privacy Best Practices',
                    items: [
                        '✓ Privacy policy published and accessible',
                        '✓ Data minimization - collect only what\'s needed',
                        '✓ Purpose limitation - use data only as stated',
                        '✓ Transparent data collection practices',
                        '✓ Secure data storage (encryption)',
                        '✓ Regular security audits',
                        '✓ Incident response plan',
                        '✓ Third-party vendor assessments',
                        '✓ Employee background checks',
                        '✓ User authentication and access controls',
                        '✓ Data retention and deletion policies',
                        '✓ Privacy by design principles',
                        '✓ Regular staff training',
                        '✓ Vulnerability scanning and patching',
                        '✓ Backup and disaster recovery'
                    ]
                }
            };

            const checklist = checklists[regulation];
            return {
                regulation: regulation.toUpperCase(),
                title: checklist.title,
                totalItems: checklist.items.length,
                checklist: checklist.items.join('\n'),
                references: checklist.articles || checklist.rules || ['ISO 27001', 'NIST Privacy Framework'],
                note: 'This is a general checklist. Consult legal counsel for specific compliance.'
            };
        }
    }
};
