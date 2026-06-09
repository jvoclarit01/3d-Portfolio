# Portfolio Copy Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite all copywriting, headings, descriptions, and projects info in the portfolio to make them completely original, elegant, and professional.

**Architecture:** Update HTML content directly within `index.html` and align the `README.md` project description with the new editorial tone, ensuring no layout breaks or broken markup.

**Tech Stack:** HTML5, CSS3, Markdown

---

### Task 1: Rewrite Hero Section in index.html

**Files:**
- Modify: `index.html:70-111`

- [ ] **Step 1: Replace Hero Eyebrow, Rotating Roles, and Blurb**

  Replace the hero section lines:
  ```html
  <p class="hero2__eyebrow" data-reveal>Welcome to my portfolio</p>
  ```
  with:
  ```html
  <p class="hero2__eyebrow" data-reveal>Designing digital interfaces</p>
  ```

  Replace the rotating roles attribute:
  ```html
  data-roles="Developer, Problem Solver"
  ```
  with:
  ```html
  data-roles="Creative Developer, Frontend Engineer, Design Builder"
  ```

  Replace the blurb paragraph:
  ```html
  <p class="hero2__blurb" data-reveal>A driven builder with a curious mind for the ever-evolving world of technology and design. I blend logical problem-solving with creative expression.</p>
  ```
  with:
  ```html
  <p class="hero2__blurb" data-reveal>A developer dedicated to crafting clean, high-performance web experiences. I combine technical precision with intuitive design to build interfaces that feel responsive and effortless.</p>
  ```

- [ ] **Step 2: Run verification**

  Open `index.html` in a web browser or verify that the file modifications have been correctly applied and formatting is intact.

- [ ] **Step 3: Commit**

  Run:
  ```bash
  git add index.html
  git commit -m "feat(hero): rewrite hero section copy for originality and elegance"
  ```

---

### Task 2: Rewrite About Section in index.html

**Files:**
- Modify: `index.html:114-154`

- [ ] **Step 1: Replace About Heading and Body Paragraphs**

  Replace the about section heading lines:
  ```html
              <div class="stage__heading-wrap">
                <h2 class="feature__heading" data-split-chars>
                  <span class="d-block">Building with</span>
                  <span class="d-block">craft and code</span>
                </h2>
              </div>
  ```
  with:
  ```html
              <div class="stage__heading-wrap">
                <h2 class="feature__heading" data-split-chars>
                  <span class="d-block">Crafting experiences</span>
                  <span class="d-block">at the intersection of design and code</span>
                </h2>
              </div>
  ```

  Replace the two body paragraphs inside `<div class="feature__body" data-reveal>`:
  ```html
                <div class="stage__p">
                  <p>I am a creative developer who bridges the gap between design systems and immersive frontend technology. I make digital interfaces feel responsive, tactile, and human.</p>
                </div>
                <div class="stage__p">
                  <p>I focus on GPU-accelerated graphics, fine-tuned typography, and rich physical motion. My work is built on robust engineering and strict design principles.</p>
                </div>
  ```
  ```html
                <div class="stage__p">
                  <p>I build fluid, responsive interfaces that bring digital ideas to life. By combining modern design systems with robust engineering, I create websites that are visually refined and highly functional.</p>
                </div>
                <div class="stage__p">
                  <p>My approach centers on performance, clean typography, and subtle, meaningful interactions.</p>
                </div>
  ```

- [ ] **Step 2: Run verification**

  Open the page and verify that the about section text wraps nicely without any styling issues.

- [ ] **Step 3: Commit**

  Run:
  ```bash
  git add index.html
  git commit -m "feat(about): rewrite about section copy focusing on design and engineering"
  ```

---

### Task 3: Rewrite Projects Showcase Section in index.html

**Files:**
- Modify: `index.html:168-195`

- [ ] **Step 1: Replace Projects Names, Descriptions, and Tags**

  Replace the first project article element:
  ```html
                <!-- Project 1 — This Portfolio -->
                <article class="project-card active" data-index="0">
                  <span class="project-number">01 / 02</span>
                  <h3 class="project-name">3D Interactive Portfolio</h3>
                  <p class="project-description">The very site you&rsquo;re exploring — an immersive WebGL portfolio with a motion-driven HUD interface, particle systems, and scroll-morphing 3D visuals.</p>
                  <div class="project-tags" style="margin-bottom: 8px;">
                    <span class="tag">Three.js</span>
                    <span class="tag">WebGL</span>
                    <span class="tag">GSAP</span>
                    <span class="tag">JavaScript</span>
                  </div>
                  <a href="https://github.com/jvoclarit01/3d-Portfolio" target="_blank" rel="noopener noreferrer" class="link-underline">View Source on GitHub</a>
                </article>
  ```
  with:
  ```html
                <!-- Project 1 — This Portfolio -->
                <article class="project-card active" data-index="0">
                  <span class="project-number">01 / 02</span>
                  <h3 class="project-name">Interactive 3D Portfolio</h3>
                  <p class="project-description">An exploration of spatial UI and web graphics. Built using custom shaders, responsive physics-like particles, and fluid animations to create a tactile digital environment.</p>
                  <div class="project-tags" style="margin-bottom: 8px;">
                    <span class="tag">WebGL</span>
                    <span class="tag">Three.js</span>
                    <span class="tag">Interactive UI</span>
                    <span class="tag">GSAP</span>
                  </div>
                  <a href="https://github.com/jvoclarit01/3d-Portfolio" target="_blank" rel="noopener noreferrer" class="link-underline">View Source on GitHub</a>
                </article>
  ```

  Replace the second project article element:
  ```html
                <!-- Project 2 — PhishShield -->
                <article class="project-card" data-index="1">
                  <span class="project-number">02 / 02</span>
                  <h3 class="project-name">PhishShield</h3>
                  <p class="project-description">A machine-learning phishing URL detector with SHAP-based explanations, single-URL and batch scanning, and a deep-scan mode — flagging fraudulent sites before they strike.</p>
                  <div class="project-tags" style="margin-bottom: 8px;">
                    <span class="tag">Machine Learning</span>
                    <span class="tag">Explainable AI</span>
                    <span class="tag">Security</span>
                    <span class="tag">Web App</span>
                  </div>
                  <a href="https://phishshield.pages.dev/" target="_blank" rel="noopener noreferrer" class="link-underline">Visit Live Project</a>
                </article>
  ```
  with:
  ```html
                <!-- Project 2 — PhishShield -->
                <article class="project-card" data-index="1">
                  <span class="project-number">02 / 02</span>
                  <h3 class="project-name">PhishShield</h3>
                  <p class="project-description">An intelligent security utility designed to identify fraudulent URLs. Leveraging machine learning and explainable AI (SHAP), it analyzes web addresses in real-time, providing clear visual transparency on potential risk factors.</p>
                  <div class="project-tags" style="margin-bottom: 8px;">
                    <span class="tag">Machine Learning</span>
                    <span class="tag">Explainable AI</span>
                    <span class="tag">URL Classification</span>
                    <span class="tag">UI Design</span>
                  </div>
                  <a href="https://phishshield.pages.dev/" target="_blank" rel="noopener noreferrer" class="link-underline">Visit Live Project</a>
                </article>
  ```

- [ ] **Step 2: Run verification**

  Ensure that project details render correctly and the tags are aligned.

- [ ] **Step 3: Commit**

  Run:
  ```bash
  git add index.html
  git commit -m "feat(projects): update project descriptions and tags with original copy"
  ```

---

### Task 4: Rewrite Connect and Contact Sections in index.html

**Files:**
- Modify: `index.html:233-241, 381-403`

- [ ] **Step 1: Replace Connect header and Contact card texts**

  Replace the connect section header:
  ```html
          <header class="connect-section__head" data-reveal>
            <span class="connect-section__eyebrow">Real-Time</span>
            <h2 class="connect-section__heading">Live Signals</h2>
            <p class="connect-section__lead">A live pulse of what I'm up to right now — my Discord presence, what I'm listening to on Spotify, and my GitHub activity, all synced straight from the source.</p>
          </header>
  ```
  with:
  ```html
          <header class="connect-section__head" data-reveal>
            <span class="connect-section__eyebrow">Live Status</span>
            <h2 class="connect-section__heading">Current Pulse</h2>
            <p class="connect-section__lead">An automated, real-time snapshot of my active projects, Spotify listening history, and GitHub contributions, bridging the gap between my development workflow and live portfolio.</p>
          </header>
  ```

  Replace the contact card description:
  ```html
            <div class="contact-details__header">
              <h3 class="contact-details__title">Let’s build something <span class="highlight">extraordinary together</span></h3>
              <p class="contact-details__content">I am always open to discussing new projects, collaborative ideas, or web engineering opportunities. Drop me a line!</p>
            </div>
  ```
  with:
  ```html
            <div class="contact-details__header">
              <h3 class="contact-details__title">Let’s collaborate on your <span class="highlight">next digital project</span></h3>
              <p class="contact-details__content">Whether you want to discuss a new project, collaborate on creative ideas, or simply say hello, feel free to drop me a message. I’ll do my best to get back to you shortly.</p>
            </div>
  ```

- [ ] **Step 2: Run verification**

  Verify the texts in both sections render properly.

- [ ] **Step 3: Commit**

  Run:
  ```bash
  git add index.html
  git commit -m "feat(connect-contact): update current pulse and contact details text"
  ```

---

### Task 5: Update README.md Description

**Files:**
- Modify: `README.md:1-5`

- [ ] **Step 1: Update project overview in README.md**

  Replace the description at the top of `README.md`:
  ```markdown
  An animated, dark-theme creative portfolio website featuring a WebGL particle hero, dynamic grid systems, and a drifting field of binary parallax particles. Built with a focus on tactile digital experiences, high-fidelity typography, and expressive motion.
  ```
  with:
  ```markdown
  A refined, minimalist creative portfolio website featuring a WebGL particle hero, dynamic grids, and clean layout design. Built with a focus on polished typography, seamless interactions, and high-performance frontend engineering.
  ```

- [ ] **Step 2: Run verification**

  Verify that the README.md remains valid markdown and renders correctly.

- [ ] **Step 3: Commit**

  Run:
  ```bash
  git add README.md
  git commit -m "docs(readme): rewrite readme description to match new portfolio copy"
  ```
