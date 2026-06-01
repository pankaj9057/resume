tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                brand: {
                    50: '#f0f7ff',
                    100: '#e0effe',
                    500: '#3b82f6', /* Blue color signature matching uploaded PDF avatar theme */
                    600: '#2563eb',
                    700: '#1d4ed8',
                    900: '#1e3a8a',
                }
            }
        }
    }
};

let originalResumeData = null;

async function loadResumeData() {
    const response = await fetch('interactive_resume_workspace_v2.json', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to load resume data: ${response.status}`);
    }
    return response.json();
}

// Local state of dataset allowing real-time sandbox edits
let resumeState = {};
let activeProjectFilter = 'all';

// Initialization hook
window.addEventListener('DOMContentLoaded', async () => {
    let saved = localStorage.getItem('pankaj_resume_data');

    if (saved) {
        try {
            resumeState = JSON.parse(saved);
        } catch (e) {
            saved = null;
        }
    }

    if (!saved) {
        try {
            if (!originalResumeData) {
                originalResumeData = await loadResumeData();
            }
            resumeState = JSON.parse(JSON.stringify(originalResumeData));
        } catch (e) {
            console.error('Unable to load resume JSON data.', e);
            return;
        }
    }

    renderAllViews();
    initScrollSpy();

    // Close dropdowns on outer click
    window.addEventListener('click', function(e) {
        const printBtn = document.getElementById('printDropdownContainer');
        if (printBtn && !printBtn.contains(e.target)) {
            document.getElementById('printDropdown').classList.add('hidden');
        }
    });
});

// ScrollSpy logic to highlight active section on side navigation dots
function initScrollSpy() {
    const spySections = ['webViewHero', 'statsBoard', 'technicalExpertise', 'experienceTimeline', 'technicalProjects'];
    const dots = document.querySelectorAll('.scrollspy-dot');

    window.addEventListener('scroll', () => {
        let current = '';
        const scrollPos = window.pageYOffset || document.documentElement.scrollTop;

        spySections.forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
                const top = el.offsetTop - 120;
                if (scrollPos >= top) {
                    current = id;
                }
            }
        });

        dots.forEach((dot) => {
            dot.classList.remove('active');
            if (dot.getAttribute('href') === `#${current}`) {
                dot.classList.add('active');
            }
        });
    });
}

// Fast update logic handling sandbox keystrokes safely without losing input cursor state
function updateField(path, newValue) {
    const keys = path.split('.');
    let current = resumeState;
    for (let i = 0; i < keys.length - 1; i++) {
        if (keys[i].includes('[')) {
            const arrayKey = keys[i].split('[')[0];
            const index = parseInt(keys[i].split('[')[1].replace(']', ''), 10);
            current = current[arrayKey][index];
        } else {
            current = current[keys[i]];
        }
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey.includes('[')) {
        const arrayKey = lastKey.split('[')[0];
        const index = parseInt(lastKey.split('[')[1].replace(']', ''), 10);
        current[arrayKey][index] = newValue.trim();
    } else {
        current[lastKey] = newValue.trim();
    }

    // Sync state store
    localStorage.setItem('pankaj_resume_data', JSON.stringify(resumeState));

    // Fast visual updates to synchronize alternative layout
    syncViewsDataOnly();
}

// Lightweight selective element update
function syncViewsDataOnly() {
    const p = resumeState.personal;
    // Web view text updating
    document.getElementById('webName').innerText = p.name;
    document.getElementById('webTitle').innerText = p.title;
    document.getElementById('webSummary').innerText = p.summary;

    // PDF text updating
    document.getElementById('pdfP1Name').innerText = p.name;
    document.getElementById('pdfP1Title').innerText = p.title;
    document.getElementById('pdfP1Summary').innerText = p.summary;
    document.getElementById('pdfP1Email').innerText = p.email;
    document.getElementById('pdfP1Phone').innerText = p.phone;
    document.getElementById('pdfP1Loc').innerText = p.location;
    document.getElementById('pdfP1Linkedin').innerText = p.linkedin;
}

// Factory Restore Defaults
function resetData() {
    if (confirm("Are you sure you want to reset all modifications to the original PDF details?")) {
        resumeState = JSON.parse(JSON.stringify(originalResumeData));
        localStorage.setItem('pankaj_resume_data', JSON.stringify(resumeState));
        renderAllViews();
        showToast("State restored to default original document successfully.");
    }
}

// Complete View Construction (Source of Truth)
function renderAllViews() {
    renderWebView();
    renderPdfView();
}

// Fast clipboard copier with toast notifications
function copyText(val, description) {
    const dummy = document.createElement("textarea");
    document.body.appendChild(dummy);
    dummy.value = val;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
    showToast(`${description} copied to clipboard!`);
}

// Toast controller
function showToast(message) {
    const toast = document.getElementById('toastNotification');
    document.getElementById('toastMsg').innerText = message;
    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3000);
}

// Generate full DOM structure of Web view dynamically
function renderWebView() {
    const p = resumeState.personal;
    document.getElementById('webName').innerText = p.name;
    document.getElementById('webTitle').innerText = p.title;
    document.getElementById('webSummary').innerText = p.summary;

    // Quick Contacts block
    const webContacts = document.getElementById('webContacts');
    webContacts.innerHTML = `
        <a href="mailto:${p.email}" class="flex items-center gap-2 hover:text-blue-400 transition">
            <i class="fa-regular fa-envelope text-blue-400"></i> <span>${p.email}</span>
        </a>
        <a href="tel:${p.phone}" class="flex items-center gap-2 hover:text-blue-400 transition">
            <i class="fa-solid fa-phone text-blue-400"></i> <span>${p.phone}</span>
        </a>
        <div class="flex items-center gap-2 text-slate-300">
            <i class="fa-solid fa-location-dot text-blue-400"></i> <span>${p.location}</span>
        </div>
        <a href="https://${p.linkedin}" target="_blank" class="flex items-center gap-2 hover:text-blue-400 transition">
            <i class="fa-brands fa-linkedin text-blue-400"></i> <span>${p.linkedin}</span>
        </a>
    `;

    // Skills Section tag blocks
    const skillsList = document.getElementById('webSkillsList');
    skillsList.innerHTML = '';
    resumeState.skills.forEach(group => {
        group.list.forEach(skill => {
            const pill = document.createElement('span');
            pill.className = "px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-colors duration-200 cursor-default";
            pill.innerText = skill;
            skillsList.appendChild(pill);
        });
    });

    // Areas of Expertise
    const expertList = document.getElementById('webExpertiseList');
    expertList.innerHTML = '';

    const expertiseIcons = {
        "Proficient Troubleshooting": "fa-solid fa-screwdriver-wrench text-blue-500",
        "Team Leadership & Supervision": "fa-solid fa-users-gear text-indigo-500",
        "Application Upgrade": "fa-solid fa-circle-up text-emerald-500",
        "Software Development Lifecycle": "fa-solid fa-diagram-project text-purple-500",
        "Development Technical Process Improvement": "fa-solid fa-chart-line text-sky-500",
        "Scrum & Agile Methodologies": "fa-solid fa-arrows-spin text-amber-500",
        "RnD on New Technologies": "fa-solid fa-microscope text-rose-500",
        "TDD and BDD": "fa-solid fa-vial-circle-check text-teal-500",
        "Design Pattern": "fa-solid fa-cubes-stacked text-violet-500"
    };

    resumeState.expertise.forEach(item => {
        const card = document.createElement('div');
        card.className = "flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 hover:border-blue-500/30 dark:hover:border-blue-500/30 hover:shadow-sm transition-all duration-200 group";
        const iconClass = expertiseIcons[item] || "fa-solid fa-square-check text-blue-500";

        card.innerHTML = `
            <div class="w-8 h-8 rounded-lg bg-white dark:bg-slate-950 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
                <i class="${iconClass} text-xs"></i>
            </div>
            <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-snug">${item}</span>
        `;
        expertList.appendChild(card);
    });

    // Awards List
    const awardsList = document.getElementById('webAwardsList');
    awardsList.innerHTML = '';
    resumeState.awards.forEach(award => {
        const item = document.createElement('div');
        item.className = "p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800";
        item.innerHTML = `
            <div class="flex justify-between text-xs text-blue-500 font-bold">
                <span>${award.date}</span>
            </div>
            <h4 class="text-xs font-black text-slate-800 dark:text-slate-200 mt-1">${award.title}</h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">${award.institution}</p>
        `;
        awardsList.appendChild(item);
    });

    // Achievements List
    const achievementsList = document.getElementById('webAchievementsList');
    achievementsList.innerHTML = '';
    resumeState.achievements.forEach(ach => {
        const item = document.createElement('div');
        item.className = "flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed";
        item.innerHTML = `
            <i class="fa-solid fa-circle-check text-blue-500 mt-0.5 flex-shrink-0"></i>
            <span>${ach}</span>
        `;
        achievementsList.appendChild(item);
    });

    // Education Container
    const eduCont = document.getElementById('webEducationContainer');
    const edu = resumeState.education;
    eduCont.innerHTML = `
        <div class="relative">
            <p class="text-xs font-bold text-blue-500">${edu.dates}</p>
            <h4 class="text-sm font-black text-slate-900 dark:text-white mt-0.5">${edu.degree}</h4>
            <p class="text-xs text-slate-700 dark:text-slate-300">${edu.institution}</p>
            <p class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-location-dot text-[10px] mr-1"></i>${edu.location}</p>
        </div>
    `;

    // Professional Work History Timeline
    const historyContainer = document.getElementById('webWorkHistory');
    historyContainer.innerHTML = '';
    resumeState.experience.forEach((job, jobIdx) => {
        const block = document.createElement('div');
        block.className = "relative group web-job-card transition duration-200 p-4 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-100/30 dark:hover:border-slate-800 dark:hover:bg-slate-900/10";
        block.setAttribute('data-id', jobIdx);

        block.innerHTML = `
            <div class="absolute -left-[31px] top-5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-4 border-blue-500 group-hover:bg-blue-600 transition-colors duration-200"></div>
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-1 mb-2">
                <div>
                    <h4 class="text-base font-bold text-slate-900 dark:text-white">${job.role}</h4>
                    <p class="text-sm text-blue-600 dark:text-blue-400 font-semibold">${job.company}</p>
                </div>
                <div class="text-left sm:text-right">
                    <span class="inline-block px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">${job.dates}</span>
                    <p class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-location-dot mr-1"></i>${job.location}</p>
                </div>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 italic mb-3">${job.description}</p>

            <!-- Toggle trigger for activity bullet groups -->
            <div id="jobBulletsContainer-${jobIdx}" class="space-y-1.5 transition-all duration-300">
                ${job.bullets.map(b => `
                    <div class="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 job-bullet-line">
                        <span class="text-blue-500 mt-1">•</span>
                        <span class="bullet-text">${b}</span>
                    </div>
                `).join('')}
            </div>

            <div class="mt-3 flex justify-end">
                <button onclick="toggleSingleExperience(${jobIdx})" id="toggleBtn-${jobIdx}" class="text-[10px] font-bold uppercase tracking-wider text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1">
                    <span>Collapse Activity</span> <i class="fa-solid fa-chevron-up"></i>
                </button>
            </div>
        `;
        historyContainer.appendChild(block);
    });

    // Modern Web view Projects Cards
    renderWebProjects();
}

// Render Web view Projects
function renderWebProjects() {
    const projCont = document.getElementById('webProjectsContainer');
    projCont.innerHTML = '';

    const searchQuery = document.getElementById('projectSearch')?.value?.toLowerCase() || '';

    resumeState.projects.forEach((proj, idx) => {
        // Filter matches
        const matchesCategory = activeProjectFilter === 'all' || proj.categories.includes(activeProjectFilter);
        const matchesSearch = proj.title.toLowerCase().includes(searchQuery) ||
                              proj.description.toLowerCase().includes(searchQuery) ||
                              proj.tech.toLowerCase().includes(searchQuery);

        if (matchesCategory && matchesSearch) {
            const card = document.createElement('div');
            card.className = "web-project-card p-5 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-50/80 dark:hover:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all duration-300 transform scale-100 opacity-100";
            card.setAttribute('data-id', idx);

            card.innerHTML = `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <h4 class="text-base font-bold text-slate-900 dark:text-white hover:text-blue-500 transition-colors">${proj.title}</h4>
                    <span class="text-xs font-bold text-blue-500 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 px-2.5 py-1 rounded-lg self-start sm:self-center">${proj.dates}</span>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">${proj.description}</p>
                <div class="flex items-center gap-2 border-t border-slate-200/50 dark:border-slate-800/50 pt-3">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tech Stack:</span>
                    <code class="text-xs text-blue-600 dark:text-blue-300 font-semibold font-mono project-tech-string">${proj.tech}</code>
                </div>
            `;
            projCont.appendChild(card);
        }
    });
}

// Project Search & category filters
function filterProjects() {
    renderWebProjects();
}

function setProjectFilter(cat) {
    activeProjectFilter = cat;

    // Toggle active style on buttons
    document.querySelectorAll('.project-filter-btn').forEach(btn => {
        btn.className = "project-filter-btn px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition";
    });

    const activeBtn = event?.currentTarget;
    if (activeBtn) {
        activeBtn.className = "project-filter-btn px-3 py-1 rounded-lg text-xs font-medium bg-blue-600 text-white shadow-sm transition";
    }

    renderWebProjects();
}

// Skill Highlights Linking Interaction
function highlightMatchingSkills(techKeyword) {
    const cleanKeyword = techKeyword.toLowerCase().replace('.net', 'net').trim();

    // Highlights matching project cards
    document.querySelectorAll('.web-project-card').forEach(card => {
        const techText = card.querySelector('.project-tech-string')?.innerText?.toLowerCase() || '';
        if (techText.includes(cleanKeyword) || techText.includes(techKeyword.toLowerCase())) {
            card.classList.add('skill-glow-active');
        }
    });

    // Highlights timeline jobs containing references
    document.querySelectorAll('.web-job-card').forEach(jobCard => {
        let jobMatch = false;
        jobCard.querySelectorAll('.bullet-text').forEach(bSpan => {
            if (bSpan.innerText.toLowerCase().includes(cleanKeyword) || bSpan.innerText.toLowerCase().includes(techKeyword.toLowerCase())) {
                bSpan.classList.add('text-blue-600', 'dark:text-blue-400', 'font-semibold');
                jobMatch = true;
            }
        });

        if (jobMatch) {
            jobCard.classList.add('skill-glow-active');
        }
    });
}

function clearHighlightedSkills() {
    document.querySelectorAll('.web-project-card').forEach(card => {
        card.classList.remove('skill-glow-active');
    });
    document.querySelectorAll('.web-job-card').forEach(jobCard => {
        jobCard.classList.remove('skill-glow-active');
        jobCard.querySelectorAll('.bullet-text').forEach(bSpan => {
            bSpan.className = "bullet-text"; // Restore default
        });
    });
}

// Experience accordions collapse togglers
function toggleSingleExperience(idx) {
    const container = document.getElementById(`jobBulletsContainer-${idx}`);
    const btn = document.getElementById(`toggleBtn-${idx}`);
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        btn.innerHTML = `<span>Collapse Activity</span> <i class="fa-solid fa-chevron-up"></i>`;
    } else {
        container.classList.add('hidden');
        btn.innerHTML = `<span>Expand Activity</span> <i class="fa-solid fa-chevron-down"></i>`;
    }
}

function toggleAllExperiences() {
    const hasHidden = Array.from(document.querySelectorAll('[id^="jobBulletsContainer-"]')).some(el => el.classList.contains('hidden'));
    resumeState.experience.forEach((job, idx) => {
        const container = document.getElementById(`jobBulletsContainer-${idx}`);
        const btn = document.getElementById(`toggleBtn-${idx}`);
        if (hasHidden) {
            container.classList.remove('hidden');
            btn.innerHTML = `<span>Collapse Activity</span> <i class="fa-solid fa-chevron-up"></i>`;
        } else {
            container.classList.add('hidden');
            btn.innerHTML = `<span>Expand Activity</span> <i class="fa-solid fa-chevron-down"></i>`;
        }
    });
}

// Hire drawer slide toggle
function toggleInquiryDrawer() {
    const drawer = document.getElementById('inquiryDrawer');
    if (drawer.classList.contains('translate-x-full')) {
        drawer.classList.remove('translate-x-full');
    } else {
        drawer.classList.add('translate-x-full');
    }
}

function handleInquirySubmit(event) {
    event.preventDefault();
    const name = document.getElementById('inqName').value;

    // Clear inquiry form
    document.getElementById('inquiryForm').reset();
    toggleInquiryDrawer();
    showToast(`Simulated inquiry sent for ${name}!`);
}

// Generate exact structured elements of original multi-page PDF dynamically
function renderPdfView() {
    const p = resumeState.personal;

    // Header information matching
    document.getElementById('pdfP1Name').innerText = p.name;
    document.getElementById('pdfP1Title').innerText = p.title;
    document.getElementById('pdfP1Summary').innerText = p.summary;
    document.getElementById('pdfP1Email').innerText = p.email;
    document.getElementById('pdfP1Phone').innerText = p.phone;
    document.getElementById('pdfP1Loc').innerText = p.location;
    document.getElementById('pdfP1Linkedin').innerText = p.linkedin;

    // Areas of Expertise matching Page 1
    const p1Exp = document.getElementById('pdfP1ExpertiseList');
    p1Exp.innerHTML = '';
    resumeState.expertise.forEach((item, index) => {
        const li = document.createElement('div');
        li.className = "flex items-start gap-2 text-[12.5px] text-slate-700 leading-snug py-0.5";
        li.innerHTML = `
            <span class="text-blue-500 font-extrabold select-none text-xs mt-0.5">•</span>
            <span class="editable-field font-medium flex-1" contenteditable="true" onblur="updateField('expertise[${index}]', this.innerText)">${item}</span>
        `;
        p1Exp.appendChild(li);
    });

    // WORK EXPERIENCE (Page 1 split: TfL, Aviva, Accenture)
    const p1Work = document.getElementById('pdfP1WorkList');
    p1Work.innerHTML = '';

    // Render first 3 jobs into Page 1
    resumeState.experience.slice(0, 3).forEach((job, index) => {
        const block = document.createElement('div');
        block.className = "space-y-1 text-sm text-slate-700";
        block.innerHTML = `
            <div class="flex justify-between font-bold text-slate-900">
                <div>
                    <span class="editable-field text-sm" contenteditable="true" onblur="updateField('experience[${index}].role', this.innerText)">${job.role}</span>
                    <span class="text-slate-400 font-normal mx-1">|</span>
                    <span class="text-blue-600 editable-field text-sm" contenteditable="true" onblur="updateField('experience[${index}].company', this.innerText)">${job.company}</span>
                </div>
                <span class="editable-field text-slate-700 font-bold text-sm" contenteditable="true" onblur="updateField('experience[${index}].dates', this.innerText)">${job.dates}</span>
            </div>
            <div class="flex justify-between items-center text-xs text-slate-500">
                <span class="italic editable-field" contenteditable="true" onblur="updateField('experience[${index}].description', this.innerText)">${job.description}</span>
                <span class="font-semibold editable-field" contenteditable="true" onblur="updateField('experience[${index}].location', this.innerText)">${job.location}</span>
            </div>
            <ul class="list-disc pl-4 space-y-0.5 text-[12.5px]">
                ${job.bullets.map((b, bulletIdx) => `
                    <li>
                        <span class="editable-field" contenteditable="true" onblur="updateField('experience[${index}].bullets[${bulletIdx}]', this.innerText)">${b}</span>
                    </li>
                `).join('')}
            </ul>
        `;
        p1Work.appendChild(block);
    });

    // WORK EXPERIENCE CONTINUATION (Page 2 split: Orgamation, AKAL)
    const p2Work = document.getElementById('pdfP2WorkList');
    p2Work.innerHTML = '';

    resumeState.experience.slice(3).forEach((job, index) => {
        const actualIndex = index + 3; // Offset adjustment to state
        const block = document.createElement('div');
        block.className = "space-y-1 text-sm text-slate-700";
        block.innerHTML = `
            <div class="flex justify-between font-bold text-slate-900">
                <div>
                    <span class="editable-field text-sm" contenteditable="true" onblur="updateField('experience[${actualIndex}].role', this.innerText)">${job.role}</span>
                    <span class="text-slate-400 font-normal mx-1">|</span>
                    <span class="text-blue-600 editable-field text-sm" contenteditable="true" onblur="updateField('experience[${actualIndex}].company', this.innerText)">${job.company}</span>
                </div>
                <span class="editable-field text-slate-700 font-bold text-sm" contenteditable="true" onblur="updateField('experience[${actualIndex}].dates', this.innerText)">${job.dates}</span>
            </div>
            <div class="flex justify-between items-center text-xs text-slate-500">
                <span class="italic editable-field" contenteditable="true" onblur="updateField('experience[${actualIndex}].description', this.innerText)">${job.description}</span>
                <span class="font-semibold editable-field" contenteditable="true" onblur="updateField('experience[${actualIndex}].location', this.innerText)">${job.location}</span>
            </div>
            <ul class="list-disc pl-4 space-y-0.5 text-[12.5px]">
                ${job.bullets.map((b, bulletIdx) => `
                    <li>
                        <span class="editable-field" contenteditable="true" onblur="updateField('experience[${actualIndex}].bullets[${bulletIdx}]', this.innerText)">${b}</span>
                    </li>
                `).join('')}
            </ul>
        `;
        p2Work.appendChild(block);
    });

    // TECHNICAL SKILLS SECTION (Page 2)
    const p2Skills = document.getElementById('pdfP2SkillsList');
    p2Skills.innerHTML = '';
    resumeState.skills.forEach((skillGroup, idx) => {
        const block = document.createElement('div');
        block.className = "flex items-start gap-2 text-[12.5px]";
        block.innerHTML = `
            <span class="font-bold text-slate-900 w-44 flex-shrink-0 border-r border-slate-200 pr-2 uppercase text-[11px] tracking-wide">${skillGroup.category}</span>
            <span class="editable-field text-slate-700 flex-1" contenteditable="true" onblur="updateField('skills[${idx}].list', this.innerText)">${skillGroup.list.join(', ')}</span>
        `;
        p2Skills.appendChild(block);
    });

    // PROJECTS Split to optimize space (Page 2 and Page 3)
    // Re-allocated projects to prevent visual overlap shown in image_0a4c6b.png
    const p2Proj = document.getElementById('pdfP2ProjectsList');
    const p3Proj = document.getElementById('pdfP3ProjectsList');
    p2Proj.innerHTML = '';
    p3Proj.innerHTML = '';

    resumeState.projects.forEach((p, idx) => {
        const block = document.createElement('div');
        block.className = "text-sm text-slate-700 space-y-0.5";
        block.innerHTML = `
            <div class="flex justify-between font-bold text-slate-900">
                <span class="editable-field text-sm" contenteditable="true" onblur="updateField('projects[${idx}].title', this.innerText)">${p.title}</span>
                <span class="editable-field text-slate-500 font-semibold text-sm" contenteditable="true" onblur="updateField('projects[${idx}].dates', this.innerText)">${p.dates}</span>
            </div>
            <p class="text-[12.5px] text-slate-600 leading-relaxed editable-field" contenteditable="true" onblur="updateField('projects[${idx}].description', this.innerText)">${p.description}</p>
            <div class="text-[12px] text-slate-500 font-mono">
                <span class="font-bold">Tech:</span> <span class="editable-field" contenteditable="true" onblur="updateField('projects[${idx}].tech', this.innerText)">${p.tech}</span>
            </div>
        `;

        // Split threshold lowered to "idx < 2" so Nationwide MDC fits perfectly at the top of Page 3
        if (idx < 2) {
            p2Proj.appendChild(block);
        } else {
            p3Proj.appendChild(block);
        }
    });

    // ACHIEVEMENTS (Page 3)
    const p3Ach = document.getElementById('pdfP3AchievementsList');
    p3Ach.innerHTML = '';
    resumeState.achievements.forEach((ach, index) => {
        const item = document.createElement('div');
        item.className = "flex items-start gap-2 text-[12.5px] leading-relaxed text-slate-700";
        item.innerHTML = `
            <span class="text-blue-500 font-bold">•</span>
            <span class="editable-field flex-grow" contenteditable="true" onblur="updateField('achievements[${index}]', this.innerText)">${ach}</span>
        `;
        p3Ach.appendChild(item);
    });

    // AWARDS LIST (Page 3)
    const p3Awards = document.getElementById('pdfP3AwardsList');
    p3Awards.innerHTML = '';
    resumeState.awards.forEach((aw, index) => {
        const item = document.createElement('div');
        item.className = "flex justify-between text-[13px] text-slate-700";
        item.innerHTML = `
            <div>
                <span class="font-bold text-slate-900 editable-field" contenteditable="true" onblur="updateField('awards[${index}].title', this.innerText)">${aw.title}</span>
                <span class="text-slate-400 mx-1">|</span>
                <span class="editable-field" contenteditable="true" onblur="updateField('awards[${index}].institution', this.innerText)">${aw.institution}</span>
            </div>
            <span class="editable-field font-semibold text-slate-500" contenteditable="true" onblur="updateField('awards[${index}].date', this.innerText)">${aw.date}</span>
        `;
        p3Awards.appendChild(item);
    });

    // EDUCATION (Page 3)
    const p3Edu = document.getElementById('pdfP3Education');
    const edu = resumeState.education;
    p3Edu.innerHTML = `
        <div class="flex justify-between text-sm text-slate-700">
            <div>
                <span class="font-bold text-slate-900 editable-field text-sm" contenteditable="true" onblur="updateField('education.degree', this.innerText)">${edu.degree}</span>
                <span class="text-slate-400 mx-1">|</span>
                <span class="editable-field text-sm" contenteditable="true" onblur="updateField('education.institution', this.innerText)">${edu.institution}</span>
            </div>
            <span class="editable-field font-bold text-slate-500 text-sm" contenteditable="true" onblur="updateField('education.dates', this.innerText)">${edu.dates}</span>
        </div>
        <div class="text-[12px] text-slate-400 italic editable-field" contenteditable="true" onblur="updateField('education.location', this.innerText)">${edu.location}</div>
    `;
}

// View Toggling logic
function switchView(viewType) {
    const btnWeb = document.getElementById('btnWebView');
    const btnPdf = document.getElementById('btnPdfView');
    const sectionWeb = document.getElementById('webViewSection');
    const sectionPdf = document.getElementById('pdfViewSection');
    const editAlert = document.getElementById('editAlert');

    if (viewType === 'web') {
        btnWeb.className = "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-700 shadow-sm";
        btnPdf.className = "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white";
        sectionWeb.classList.remove('hidden');
        sectionPdf.classList.add('hidden');
        editAlert.classList.add('hidden');
    } else {
        btnPdf.className = "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-700 shadow-sm";
        btnWeb.className = "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white";
        sectionPdf.classList.remove('hidden');
        sectionWeb.classList.add('hidden');
        editAlert.classList.remove('hidden');
    }
}

// Theme management
function toggleTheme() {
    const html = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        themeIcon.className = "fa-solid fa-moon";
    } else {
        html.classList.add('dark');
        themeIcon.className = "fa-solid fa-sun";
    }
}

// Dropdown actions
function togglePrintDropdown() {
    const menu = document.getElementById('printDropdown');
    menu.classList.toggle('hidden');
}

// Native Print triggering standard layouts
function printView(layoutType) {
    switchView(layoutType);
    setTimeout(() => {
        window.print();
    }, 350);
}

