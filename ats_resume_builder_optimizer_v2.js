// Default Workspace Dataset directly matching interactive_resume_workspace_v2.json
async function loadResumeData() {
    const response = await fetch('interactive_resume_workspace_v2.json', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to load resume data: ${response.status}`);
        }
    return response.json();
}

// Initialize loaded workspace state
let WORKSPACE = {};

// Helper functions for reading/writing nested paths dynamically (e.g., 'experience.0.bullets.1')
function getDeep(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function setDeep(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined) {
            current[part] = isNaN(parts[i+1]) ? {} : [];
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}
window.addEventListener('DOMContentLoaded', async () => {
// Initialize state from localstorage or fall back to default JSON workspace
async function initWorkspace() {
    const saved = localStorage.getItem('pk_resume_workspace_v2');
    if (saved) {
        try {
            WORKSPACE = JSON.parse(saved);
        } catch(e) {
            WORKSPACE = await loadResumeData(); //JSON.parse(JSON.stringify(DEFAULT_WORKSPACE));
        }
    } else {
        WORKSPACE = await loadResumeData(); //JSON.parse(JSON.stringify(DEFAULT_WORKSPACE));
    }
    renderResumeUI();
}
initWorkspace();
});

function saveWorkspaceToLocalStorage() {
    localStorage.setItem('pk_resume_workspace_v2', JSON.stringify(WORKSPACE));
    runKeywordAnalysis();
}

function resetWorkspace() {
    if (confirm("Are you sure you want to reset your resume to the default original JSON dataset? This will clear any manual edits.")) {
        localStorage.removeItem('pk_resume_workspace_v2');
        WORKSPACE = JSON.parse(JSON.stringify(DEFAULT_WORKSPACE));
        renderResumeUI();
        showNotice("Workspace reset successfully!");
    }
}

// --- EXPORT & IMPORT JSON WORKSPACES ---
function exportWorkspaceJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(WORKSPACE, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${WORKSPACE.personal.name.replace(/\s+/g, '_')}_resume_workspace.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotice("Workspace exported successfully!");
}

function importWorkspaceJson(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed.personal && parsed.experience) {
                WORKSPACE = parsed;
                saveWorkspaceToLocalStorage();
                renderResumeUI();
                showNotice("Workspace imported successfully!");
            } else {
                alert("Invalid resume JSON format. Must contain 'personal' and 'experience' parameters.");
            }
        } catch (err) {
            alert("Error parsing JSON file. Please ensure it's a valid JSON format.");
        }
    };
    reader.readAsText(file);
}

// --- COMPILER AND RENDERING ENGINE ---
function renderResumeUI() {
    // Render Header and Summary info
    document.getElementById('personal-name').innerText = WORKSPACE.personal.name;
    document.getElementById('personal-title').innerText = WORKSPACE.personal.title;
    document.getElementById('personal-email').innerText = WORKSPACE.personal.email;
    document.getElementById('personal-phone').innerText = WORKSPACE.personal.phone;
    document.getElementById('personal-location').innerText = WORKSPACE.personal.location;
    document.getElementById('personal-linkedin').innerText = WORKSPACE.personal.linkedin;
    document.getElementById('personal-summary').innerText = WORKSPACE.personal.summary;

    // Render Skills Container
    const skillsContainer = document.getElementById('skills-container');
    skillsContainer.innerHTML = '';
    WORKSPACE.skills.forEach((group, groupIdx) => {
        const groupEl = document.createElement('div');
        groupEl.className = "flex flex-col gap-1 workspace-group-hover relative group";
        groupEl.innerHTML = `
            <div class="flex items-center justify-between">
                <strong contenteditable="true" onblur="updateField(this, 'skills.${groupIdx}.category')">${group.category}:</strong>
                <button onclick="deleteSkillCategory(${groupIdx})" class="no-print workspace-btn-group text-rose-500 hover:text-rose-600 p-0.5" title="Delete Group">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
            <span contenteditable="true" onblur="updateListField(this, 'skills.${groupIdx}.list')" class="text-slate-600 text-xs">${group.list.join(', ')}</span>
        `;
        skillsContainer.appendChild(groupEl);
    });

    // Render Expertise Areas
    const expertiseContainer = document.getElementById('expertise-container');
    expertiseContainer.innerHTML = '';
    WORKSPACE.expertise.forEach((item, idx) => {
        const itemEl = document.createElement('div');
        itemEl.className = "workspace-group-hover relative flex items-center gap-1.5 font-medium pr-1.5 py-0.5 rounded";
        itemEl.innerHTML = `
            <span class="text-slate-400">•</span>
            <span contenteditable="true" onblur="updateField(this, 'expertise.${idx}')">${item}</span>
            <button onclick="deleteExpertise(${idx})" class="no-print workspace-btn-group text-rose-500 hover:text-rose-600 p-0.5" title="Delete Area">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        `;
        expertiseContainer.appendChild(itemEl);
    });

    // Render Professional Experience
    const experienceContainer = document.getElementById('experience-container');
    experienceContainer.innerHTML = '';
    WORKSPACE.experience.forEach((job, jobIdx) => {
        const jobEl = document.createElement('div');
        jobEl.className = "mb-5 page-break-avoid workspace-group-hover relative group";
        
        // Construct bullet list nodes
        let bulletsHtml = '';
        job.bullets.forEach((bullet, bulletIdx) => {
            bulletsHtml += `
                <li class="relative pl-1 pr-6 hover:bg-slate-50 rounded group/bullet">
                    <span contenteditable="true" onblur="updateField(this, 'experience.${jobIdx}.bullets.${bulletIdx}')" class="block outline-none">${bullet}</span>
                    <button onclick="deleteBullet(${jobIdx}, ${bulletIdx})" class="no-print absolute right-0 top-1/2 -translate-y-1/2 hidden group-hover/bullet:inline-block text-rose-500 hover:text-rose-600 p-0.5" title="Delete Bullet">
                        <i data-lucide="trash" class="w-3 h-3"></i>
                    </button>
                </li>
            `;
        });

        jobEl.innerHTML = `
            <div class="flex justify-between items-baseline font-semibold text-slate-900 text-xs sm:text-sm">
                <div class="flex flex-wrap items-center gap-1">
                    <span contenteditable="true" onblur="updateField(this, 'experience.${jobIdx}.role')" class="font-bold">${job.role}</span>
                    <span class="text-slate-400 font-normal">|</span>
                    <span contenteditable="true" onblur="updateField(this, 'experience.${jobIdx}.company')" class="text-slate-700">${job.company}</span>
                </div>
                <div contenteditable="true" onblur="updateField(this, 'experience.${jobIdx}.dates')" class="text-xs text-slate-500 whitespace-nowrap">${job.dates}</div>
            </div>
            <div class="flex justify-between items-center text-xs text-slate-400 italic mb-1.5">
                <span contenteditable="true" onblur="updateField(this, 'experience.${jobIdx}.location')">${job.location}</span>
                <button onclick="addBullet(${jobIdx})" class="no-print text-indigo-600 hover:text-indigo-500 text-[10px] font-semibold flex items-center gap-1">
                    <i data-lucide="plus" class="w-3 h-3"></i> Add Bullet
                </button>
            </div>
            <ul class="list-disc pl-5 text-xs text-slate-600 space-y-1.5">
                ${bulletsHtml}
            </ul>
            <div class="no-print workspace-btn-group absolute top-0 -right-8 flex flex-col gap-1 bg-slate-100 p-1 rounded border border-slate-200 shadow-sm">
                <button onclick="deleteExperience(${jobIdx})" class="text-rose-500 hover:text-rose-600 p-1" title="Delete Position">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        `;
        experienceContainer.appendChild(jobEl);
    });

    // Render Projects
    const projectsContainer = document.getElementById('projects-container');
    projectsContainer.innerHTML = '';
    WORKSPACE.projects.forEach((proj, projIdx) => {
        const projEl = document.createElement('div');
        projEl.className = "workspace-group-hover relative group mb-3";
        projEl.innerHTML = `
            <div class="flex items-center justify-between font-bold text-slate-900 mb-0.5">
                <span contenteditable="true" onblur="updateField(this, 'projects.${projIdx}.title')">${proj.title}</span>
                <div class="flex items-center gap-3">
                    <span contenteditable="true" onblur="updateField(this, 'projects.${projIdx}.dates')" class="text-xs text-slate-400 font-normal">${proj.dates}</span>
                    <button onclick="deleteProject(${projIdx})" class="no-print workspace-btn-group text-rose-500 hover:text-rose-600 p-0.5" title="Delete Project">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </div>
            <p contenteditable="true" onblur="updateField(this, 'projects.${projIdx}.description')" class="mb-1 leading-relaxed text-slate-600">${proj.description}</p>
            <div class="text-[11px] text-slate-500">
                <strong>Tech Stack:</strong> <span contenteditable="true" onblur="updateField(this, 'projects.${projIdx}.tech')">${proj.tech}</span>
            </div>
        `;
        projectsContainer.appendChild(projEl);
    });

    // Render Education
    const educationContainer = document.getElementById('education-container');
    educationContainer.innerHTML = `
        <div class="font-bold text-slate-900" contenteditable="true" onblur="updateField(this, 'education.degree')">${WORKSPACE.education.degree}</div>
        <div contenteditable="true" onblur="updateField(this, 'education.institution')">${WORKSPACE.education.institution}</div>
        <div contenteditable="true" onblur="updateField(this, 'education.location')" class="text-slate-500 text-[11px]">${WORKSPACE.education.location}</div>
        <div contenteditable="true" onblur="updateField(this, 'education.dates')" class="text-slate-400 italic">${WORKSPACE.education.dates}</div>
    `;

    // Render Achievements & Awards List
    const achievementsContainer = document.getElementById('achievements-container');
    achievementsContainer.innerHTML = '';
    
    // Loop through string-based achievements
    WORKSPACE.achievements.forEach((ach, achIdx) => {
        const achEl = document.createElement('li');
        achEl.className = "relative pr-6 workspace-group-hover hover:bg-slate-50 rounded";
        achEl.innerHTML = `
            <span contenteditable="true" onblur="updateField(this, 'achievements.${achIdx}')">${ach}</span>
            <button onclick="deleteAchievement(${achIdx})" class="no-print workspace-btn-group text-rose-500 hover:text-rose-600 absolute right-0 top-1/2 -translate-y-1/2 p-0.5" title="Delete Achievement">
                <i data-lucide="trash" class="w-3 h-3"></i>
            </button>
        `;
        achievementsContainer.appendChild(achEl);
    });

    // Loop through structured awards
    WORKSPACE.awards.forEach((aw, awIdx) => {
        const awEl = document.createElement('li');
        awEl.className = "relative pr-6 workspace-group-hover hover:bg-slate-50 rounded mt-1.5";
        awEl.innerHTML = `
            <div>
                <strong contenteditable="true" onblur="updateField(this, 'awards.${awIdx}.title')">${aw.title}</strong> - 
                <span contenteditable="true" onblur="updateField(this, 'awards.${awIdx}.institution')">${aw.institution}</span> 
                (<span contenteditable="true" onblur="updateField(this, 'awards.${awIdx}.date')">${aw.date}</span>)
            </div>
            <button onclick="deleteAward(${awIdx})" class="no-print workspace-btn-group text-rose-500 hover:text-rose-600 absolute right-0 top-1/2 -translate-y-1/2 p-0.5" title="Delete Award">
                <i data-lucide="trash" class="w-3 h-3"></i>
            </button>
        `;
        achievementsContainer.appendChild(awEl);
    });

    lucide.createIcons();
    runKeywordAnalysis();
}

// --- LIVE DATA UPDATING & BACKING SYNC ---
function updateField(element, path) {
    setDeep(WORKSPACE, path, element.innerText.trim());
    saveWorkspaceToLocalStorage();
}

function updateListField(element, path) {
    const raw = element.innerText.trim();
    const list = raw.split(',').map(item => item.trim()).filter(item => item.length > 0);
    setDeep(WORKSPACE, path, list);
    saveWorkspaceToLocalStorage();
}

// Set up global listeners for non-list simple inputs
document.querySelectorAll('[data-path]').forEach(el => {
    el.addEventListener('blur', (e) => {
        const path = e.target.getAttribute('data-path');
        setDeep(WORKSPACE, path, e.target.innerText.trim());
        saveWorkspaceToLocalStorage();
    });
});

// --- DYNAMIC WORKSPACE MODIFICATIONS ---
function addSkillCategory() {
    WORKSPACE.skills.push({
        category: "New Skill Group",
        list: ["Skill 1", "Skill 2"]
    });
    saveWorkspaceToLocalStorage();
    renderResumeUI();
}

function deleteSkillCategory(idx) {
    WORKSPACE.skills.splice(idx, 1);
    saveWorkspaceToLocalStorage();
    renderResumeUI();
}

function addExpertise() {
    WORKSPACE.expertise.push("New Expertise Area");
    saveWorkspaceToLocalStorage();
    renderResumeUI();
}

function deleteExpertise(idx) {
    WORKSPACE.expertise.splice(idx, 1);
    saveWorkspaceToLocalStorage();
    renderResumeUI();
}

function addExperience() {
    WORKSPACE.experience.unshift({
        role: "Senior Developer",
        company: "Company Name",
        dates: "01/2026-Present",
        location: "Location",
        description: "Activities Managed",
        bullets: [
            "Collaborated within cross-functional teams to engineer high-throughput systems.",
            "Improved operational scalability and runtime optimizations."
        ]
    });
    saveWorkspaceToLocalStorage();
    renderResumeUI();
}

function deleteExperience(idx) {
    WORKSPACE.experience.splice(idx, 1);
    saveWorkspaceToLocalStorage();
    renderResumeUI();
}

function addBullet(jobIdx) {
    WORKSPACE.experience[jobIdx].bullets.push("New bullet point contribution description.");
    saveWorkspaceToLocalStorage();
    renderResumeUI();
}

function deleteBullet(jobIdx, bulletIdx) {
    WORKSPACE.experience[jobIdx].bullets.splice(bulletIdx, 1);
    saveWorkspaceToLocalStorage();
    renderResumeUI();
}

function addProject() {
    WORKSPACE.projects.push({
        title: "New Architectural Project",
        dates: "2026",
        description: "Description of structural development scope and metrics.",
        tech: "C#, .Net Core, Azure.",
        categories: []
    });
    saveWorkspaceToLocalStorage();
    renderResumeUI();
}

function deleteProject(idx) {
    WORKSPACE.projects.splice(idx, 1);
    saveWorkspaceToLocalStorage();
    renderResumeUI();
}

function addAchievement() {
    WORKSPACE.achievements.push("Reduced processing errors, improving system output efficiency.");
    saveWorkspaceToLocalStorage();
    renderResumeUI();
}

function deleteAchievement(idx) {
    WORKSPACE.achievements.splice(idx, 1);
    saveWorkspaceToLocalStorage();
    renderResumeUI();
}

function deleteAward(idx) {
    WORKSPACE.awards.splice(idx, 1);
    saveWorkspaceToLocalStorage();
    renderResumeUI();
}

// Skill Injector for ATS suggestions
function injectSkill(skillName) {
    let injected = false;
    if (skillName === 'Docker' || skillName === 'Azure DevOps' || skillName === 'HAProxy') {
        // Find or target 'Cloud & Serverless' or fallback to index 0 list
        let group = WORKSPACE.skills.find(g => g.category.toLowerCase().includes('cloud') || g.category.toLowerCase().includes('serverless') || g.category.toLowerCase().includes('container'));
        if (!group && WORKSPACE.skills.length > 0) group = WORKSPACE.skills[0];
        if (group && !group.list.includes(skillName)) {
            group.list.push(skillName);
            injected = true;
        }
    } else if (skillName === 'Cassandra') {
        let group = WORKSPACE.skills.find(g => g.category.toLowerCase().includes('database') || g.category.toLowerCase().includes('storage'));
        if (!group && WORKSPACE.skills.length > 0) group = WORKSPACE.skills[0];
        if (group && !group.list.includes(skillName)) {
            group.list.push(skillName);
            injected = true;
        }
    } else {
        // Generic injection
        if (WORKSPACE.skills.length > 0) {
            if (!WORKSPACE.skills[0].list.includes(skillName)) {
                WORKSPACE.skills[0].list.push(skillName);
                injected = true;
            }
        }
    }

    if (injected) {
        saveWorkspaceToLocalStorage();
        renderResumeUI();
        showNotice(`Injected ${skillName} into your Skills Matrix!`);
    }
}

function showNotice(msg) {
    const toast = document.createElement('div');
    toast.className = "fixed bottom-4 right-4 bg-slate-900 text-white text-xs py-2 px-4 rounded-lg shadow-lg border border-slate-700 flex items-center gap-2 z-50 no-print animate-bounce";
    toast.innerHTML = `<i data-lucide="info" class="w-4 h-4 text-emerald-400"></i> ${msg}`;
    document.body.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Live Keyword Match Analysis Engine
function runKeywordAnalysis() {
    const jd = document.getElementById('jd-input').value.toLowerCase();
    const badge = document.getElementById('score-badge');
    
    if (!jd.trim()) {
        badge.innerText = "Scanning Ready";
        badge.className = "bg-amber-500/20 text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-500/30";
        return;
    }

    const targets = [
        { keyword: 'c#', alias: ['c#', '.net/c#'], display: 'C#' },
        { keyword: '.net', alias: ['.net', '.net 8', '.net 6'], display: '.NET' },
        { keyword: 'docker', alias: ['docker', 'container'], display: 'Docker' },
        { keyword: 'azure', alias: ['azure', 'azure functions'], display: 'Azure' },
        { keyword: 'devops', alias: ['devops', 'azure devops'], display: 'DevOps' },
        { keyword: 'tdd', alias: ['tdd', 'test-driven', 'test driven'], display: 'TDD' },
        { keyword: 'cassandra', alias: ['cassandra'], display: 'Cassandra' },
        { keyword: 'sql', alias: ['sql', 'nosql', 'cosmos', 'postgres'], display: 'SQL/NoSQL' },
        { keyword: 'haproxy', alias: ['haproxy', 'load balancer', 'proxy'], display: 'HAProxy' },
        { keyword: 'agile', alias: ['agile', 'scrum'], display: 'Agile' },
        { keyword: 'mentor', alias: ['mentor', 'mentoring', 'lead', 'supervise'], display: 'Mentorship' }
    ];

    // Build search payload from serialized dynamic WORKSPACE object
    const resumeContent = JSON.stringify(WORKSPACE).toLowerCase();

    let matched = [];
    let missing = [];

    targets.forEach(item => {
        const jdHasIt = item.alias.some(al => jd.includes(al));
        if (jdHasIt) {
            const resumeHasIt = item.alias.some(al => resumeContent.includes(al));
            if (resumeHasIt) {
                matched.push(item);
            } else {
                missing.push(item);
            }
        }
    });

    const matchingDiv = document.getElementById('matching-keywords');
    const missingDiv = document.getElementById('missing-keywords');

    matchingDiv.innerHTML = matched.length > 0 
        ? matched.map(m => `<span class="bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded border border-emerald-900/30 flex items-center gap-1"><i data-lucide="check" class="w-2.5 h-2.5"></i> ${m.display}</span>`).join('')
        : `<span class="text-slate-500 italic">No direct matches identified yet.</span>`;

    missingDiv.innerHTML = missing.length > 0
        ? missing.map(m => `<span class="bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 px-2 py-0.5 rounded border border-rose-900/30 cursor-pointer flex items-center gap-1" onclick="injectSkill('${m.display}')"><i data-lucide="plus" class="w-2.5 h-2.5 text-rose-400"></i> ${m.display}</span>`).join('')
        : `<span class="text-emerald-400 text-[11px] font-semibold flex items-center gap-1"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i> All JD Keywords Met!</span>`;

    const totalTargetedInJD = matched.length + missing.length;
    if (totalTargetedInJD > 0) {
        const ratio = Math.round((matched.length / totalTargetedInJD) * 100);
        badge.innerText = `${ratio}% ATS Match`;
        if (ratio >= 80) {
            badge.className = "bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30";
        } else if (ratio >= 50) {
            badge.className = "bg-amber-500/20 text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-500/30";
        } else {
            badge.className = "bg-rose-500/20 text-rose-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-rose-500/30";
        }
    } else {
        badge.innerText = "No keywords mapped";
        badge.className = "bg-slate-800 text-slate-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-slate-700";
    }
    
    lucide.createIcons();
}

// Kick off initialization
window.addEventListener('DOMContentLoaded', initWorkspace);
