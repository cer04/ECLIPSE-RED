/**
 * ECLIPSE-RED: Autonomous Swarm Telemetry & Simulator Engine
 * Author: Laith Hussam Naser (@cer04)
 */

document.addEventListener('DOMContentLoaded', () => {
    const terminalBody = document.getElementById('terminal-body');
    const btnSimulate = document.getElementById('btn-simulate');
    const btnClear = document.getElementById('btn-clear');
    const statusBeacon = document.getElementById('status-beacon-text');
    const scenarioButtons = document.querySelectorAll('.scenario-btn');

    let currentScenario = 'sqli';
    let isRunning = false;
    let timeoutIds = [];

    const scenarios = {
        sqli: {
            title: "Autonomous Web API SQLi & Credential Harvesting",
            target: "172.20.0.11:5000",
            logs: [
                { agent: 'orchestrator', msg: 'MISSION INITIALIZED: Objective = Identify and exploit high-value database targets in CIDR 172.20.0.0/24' },
                { agent: 'orchestrator', msg: 'Safety guardrails verified: Target 172.20.0.11 matches ECLIPSE_ALLOWED_CIDRS allowlist.' },
                { agent: 'reaper', msg: 'Reconnaissance dispatched. Running asynchronous syn-probe on 172.20.0.11...' },
                { agent: 'reaper', msg: 'Discovered open ports: [5000/TCP (REST API), 22/TCP (OpenSSH 8.9p1)].' },
                { agent: 'reaper', msg: 'Fuzzing API endpoints: Found /api/v1/users?id=1 [HTTP 200, Content-Type: application/json].' },
                { agent: 'orchestrator', msg: 'OODA Transition: ORIENT -> DECIDE. Target vector detected: SQL Injection candidate on parameter "id". Delegating to Infiltrator.' },
                { agent: 'infiltrator', msg: 'Synthesizing contextual bypass payloads for parameter "id"...' },
                { agent: 'infiltrator', msg: 'Sending probe payload: 1\' OR 1=1 -- - [Response latency: 28ms]' },
                { agent: 'infiltrator', msg: 'Time-delay verification: 1\' WAITFOR DELAY \'0:0:3\'-- [Confirmed Vulnerable, latency 3012ms]' },
                { agent: 'success', msg: 'VULNERABILITY VERIFIED: CWE-89 SQL Injection (Severity: CRITICAL, CVSS 9.8)' },
                { agent: 'infiltrator', msg: 'Extracting database schemas: Retrieved tables [users, credentials, session_tokens, audit_logs].' },
                { agent: 'infiltrator', msg: 'Extracted 14 records from table "users". Primary admin hash: $2b$12$e8q... (bcrypt)' },
                { agent: 'orchestrator', msg: 'Passing persistence handle to Ghost for post-exploitation...' },
                { agent: 'ghost', msg: 'Harvesting environment secrets from container filesystem: JWT_SECRET_KEY, DB_PASS, API_KEY_AWS found.' },
                { agent: 'ghost', msg: 'Zero-trace post-recon complete. Disconnecting socket. No logs leaked outside target-net.' },
                { agent: 'success', msg: 'SWARM MISSION COMPLETE: Target compromised. Objective achieved in 3.42s.' }
            ]
        },
        ssh: {
            title: "SSH Honeypot Reconnaissance & Credential Pivot",
            target: "172.20.0.12:22",
            logs: [
                { agent: 'orchestrator', msg: 'MISSION INITIALIZED: Pivot surface assessment on internal subnet 172.20.0.12' },
                { agent: 'reaper', msg: 'Scanning internal SSH daemon on port 22... Identified OpenSSH 8.2p1 Ubuntu-4ubuntu0.3' },
                { agent: 'reaper', msg: 'OSINT correlation: Default credential dictionary loaded based on target footprint.' },
                { agent: 'infiltrator', msg: 'Executing multi-threaded low-rate credential test against SSH port...' },
                { agent: 'infiltrator', msg: 'Attempting auth combo: root:toor -> REJECTED' },
                { agent: 'infiltrator', msg: 'Attempting auth combo: operator:Eclipse2026! -> AUTHENTICATED' },
                { agent: 'success', msg: 'SSH AUTHENTICATION SUCCESSFUL on 172.20.0.12:22 [Privilege: Unprivileged UID 1001]' },
                { agent: 'ghost', msg: 'Ghost agent spawned inside target container. Enumerating sudo privileges (sudo -l)...' },
                { agent: 'ghost', msg: 'Discovered sudo rule: (ALL) NOPASSWD: /usr/bin/python3 /opt/maintenance.py' },
                { agent: 'ghost', msg: 'Privilege Escalation Vector: GTFOBins python sudo spawn shell (/bin/sh).' },
                { agent: 'success', msg: 'ROOT SHELL OBTAINED: UID=0(root) GID=0(root) groups=0(root)' },
                { agent: 'ghost', msg: 'Mapping internal Docker network topology from compromised pivot...' },
                { agent: 'orchestrator', msg: 'SWARM MISSION COMPLETE: Lateral pivot established. Telemetry synchronized with C2 War Room.' }
            ]
        },
        idor: {
            title: "IDOR State Bypass & Horizontal Privilege Escalation",
            target: "172.20.0.10:80",
            logs: [
                { agent: 'orchestrator', msg: 'MISSION INITIALIZED: Business logic & state-machine integrity testing on DVWA target.' },
                { agent: 'reaper', msg: 'Mapping authenticated session cookies and session object IDs...' },
                { agent: 'infiltrator', msg: 'Simulating standard user session [User ID: 1042]. Intercepting API transaction /api/account/details.' },
                { agent: 'infiltrator', msg: 'Fuzzing numerical identifier sequence: Testing ID: 1041, 1040, 1001 (Admin).' },
                { agent: 'infiltrator', msg: 'Bypass validated: Server returned Account 1001 without authorization check!' },
                { agent: 'success', msg: 'VULNERABILITY VERIFIED: CWE-639 Insecure Direct Object Reference (Severity: HIGH, CVSS 8.5)' },
                { agent: 'infiltrator', msg: 'Chaining IDOR with Account Takeover: Modifying administrative recovery email via PUT /api/account/1001.' },
                { agent: 'ghost', msg: 'Account takeover confirmed. Admin session token acquired. Audit log sanitized.' },
                { agent: 'orchestrator', msg: 'SWARM MISSION COMPLETE: High-impact vulnerability chain confirmed without scanner blindspots.' }
            ]
        }
    };

    function clearTerminal() {
        timeoutIds.forEach(id => clearTimeout(id));
        timeoutIds = [];
        terminalBody.innerHTML = '';
        isRunning = false;
        if (btnSimulate) {
            btnSimulate.innerHTML = '<i class="fas fa-play"></i> RUN SWARM SIMULATION';
            btnSimulate.classList.remove('active');
        }
        if (statusBeacon) statusBeacon.textContent = 'STANDBY';
    }

    function addLogEntry(agent, message) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';

        const timestamp = new Date().toISOString().substring(11, 19);
        let badgeClass = 'badge-orchestrator';
        let badgeText = agent.toUpperCase();

        if (agent === 'reaper') badgeClass = 'badge-reaper';
        else if (agent === 'infiltrator') badgeClass = 'badge-infiltrator';
        else if (agent === 'ghost') badgeClass = 'badge-ghost';
        else if (agent === 'success') {
            badgeClass = 'badge-success';
            badgeText = 'SUCCESS';
        }

        entry.innerHTML = `
            <span style="color: var(--text-muted); margin-right: 8px;">[${timestamp}]</span>
            <span class="${badgeClass}">[${badgeText}]</span>
            <span style="color: ${agent === 'success' ? '#4ade80' : 'var(--text-primary)'}; margin-left: 8px;">${message}</span>
        `;

        terminalBody.appendChild(entry);
        terminalBody.scrollTop = terminalBody.scrollHeight;
    }

    function runSimulation(scenarioKey) {
        clearTerminal();
        isRunning = true;
        if (btnSimulate) {
            btnSimulate.innerHTML = '<i class="fas fa-spinner fa-spin"></i> EXECUTING SWARM...';
            btnSimulate.classList.add('active');
        }
        if (statusBeacon) statusBeacon.textContent = 'SWARM ENGAGED';

        const scenario = scenarios[scenarioKey] || scenarios.sqli;
        let delay = 200;

        scenario.logs.forEach((item, index) => {
            const timeoutId = setTimeout(() => {
                addLogEntry(item.agent, item.msg);
                if (index === scenario.logs.length - 1) {
                    isRunning = false;
                    if (btnSimulate) {
                        btnSimulate.innerHTML = '<i class="fas fa-redo"></i> RE-RUN SIMULATION';
                        btnSimulate.classList.remove('active');
                    }
                    if (statusBeacon) statusBeacon.textContent = 'COMPLETED';
                }
            }, delay);
            timeoutIds.push(timeoutId);
            delay += Math.floor(Math.random() * 400) + 450;
        });
    }

    if (btnSimulate) {
        btnSimulate.addEventListener('click', () => {
            runSimulation(currentScenario);
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', clearTerminal);
    }

    scenarioButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            scenarioButtons.forEach(b => b.classList.remove('active'));
            const targetBtn = e.currentTarget;
            targetBtn.classList.add('active');
            currentScenario = targetBtn.dataset.scenario;
            runSimulation(currentScenario);
        });
    });

    // Auto-run initial scenario after 1 second for instant WOW effect
    setTimeout(() => {
        runSimulation('sqli');
    }, 1000);
});
