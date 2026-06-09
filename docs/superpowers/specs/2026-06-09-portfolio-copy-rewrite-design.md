# Design Specification: Portfolio Copy Rewrite

**Date:** 2026-06-09  
**Author:** Antigravity  
**Topic:** Portfolio Copy Rewrite for Originality and Premium Tone  
**Status:** Approved  

---

## 1. Background & Goals

The goal of this task is to rewrite the textual content and descriptions of the 3D Portfolio for Jan Vincent Oclarit. This is to ensure the content is completely original, professional, and premium, eliminating any risk of plagiarism while maintaining the user's name, email, and social links.

Following a collaborative brainstorming session, the **High-End Minimalist / Editorial** approach was selected. This style emphasizes elegance, human-centric design, and clean design principles, softening technical/sci-fi jargon while maintaining clear technical credibility.

---

## 2. Copy Modifications

### 2.1 Hero Section
* **Eyebrow:** "Designing digital interfaces" (previously: "Welcome to my portfolio")
* **Roles Rotation (`data-roles`):** "Creative Developer, Frontend Engineer, Design Builder" (previously: "Developer, Problem Solver")
* **Blurb:** "A developer dedicated to crafting clean, high-performance web experiences. I combine technical precision with intuitive design to build interfaces that feel responsive and effortless." (previously: "A driven builder with a curious mind for the ever-evolving world of technology and design. I blend logical problem-solving with creative expression.")

### 2.2 About Section
* **Heading:**
  ```html
  <span class="d-block">Crafting experiences</span>
  <span class="d-block">at the intersection of design and code</span>
  ```
  (previously: "Building with craft and code")
* **Paragraph 1:** "I build fluid, responsive interfaces that bring digital ideas to life. By combining modern design systems with robust engineering, I create websites that are visually refined and highly functional." (previously: "I am a creative developer who bridges the gap between design systems and immersive frontend technology. I make digital interfaces feel responsive, tactile, and human.")
* **Paragraph 2:** "My approach centers on performance, clean typography, and subtle, meaningful interactions." (previously: "I focus on GPU-accelerated graphics, fine-tuned typography, and rich physical motion. My work is built on robust engineering and strict design principles.")

### 2.3 Projects Showcase Section
* **Project 1: Interactive 3D Portfolio**
  * **Title:** "Interactive 3D Portfolio" (previously: "3D Interactive Portfolio")
  * **Description:** "An exploration of spatial UI and web graphics. Built using custom shaders, responsive physics-like particles, and fluid animations to create a tactile digital environment." (previously: "The very site you’re exploring — an immersive WebGL portfolio with a motion-driven HUD interface, particle systems, and scroll-morphing 3D visuals.")
  * **Tags:** "WebGL", "Three.js", "Interactive UI", "GSAP" (previously: "Three.js", "WebGL", "GSAP", "JavaScript")
* **Project 2: PhishShield**
  * **Title:** "PhishShield"
  * **Description:** "An intelligent security utility designed to identify fraudulent URLs. Leveraging machine learning and explainable AI (SHAP), it analyzes web addresses in real-time, providing clear visual transparency on potential risk factors." (previously: "A machine-learning phishing URL detector with SHAP-based explanations, single-URL and batch scanning, and a deep-scan mode — flagging fraudulent sites before they strike.")
  * **Tags:** "Machine Learning", "Explainable AI", "URL Classification", "UI Design" (previously: "Machine Learning", "Explainable AI", "Security", "Web App")

### 2.4 Connect Section (Current Pulse)
* **Eyebrow:** "Live Status" (previously: "Real-Time")
* **Title:** "Current Pulse" (previously: "Live Signals")
* **Lead:** "An automated, real-time snapshot of my active projects, Spotify listening history, and GitHub contributions, bridging the gap between my development workflow and live portfolio." (previously: "A live pulse of what I'm up to right now — my Discord presence, what I'm listening to on Spotify, and my GitHub activity, all synced straight from the source.")

### 2.5 Contact Section
* **Subheading:** "Let’s collaborate on your next digital project" (previously: "Let’s build something extraordinary together")
* **Body Text:** "Whether you want to discuss a new project, collaborate on creative ideas, or simply say hello, feel free to drop me a message. I’ll do my best to get back to you shortly." (previously: "I am always open to discussing new projects, collaborative ideas, or web engineering opportunities. Drop me a line!")

---

## 3. Impacted Files

* **[index.html](file:///D:/3d-Portfolio/3d-Portfolio/index.html)**: Contains all the text elements, headings, paragraphs, project cards, and labels.
* **[README.md](file:///D:/3d-Portfolio/3d-Portfolio/README.md)**: Update README description to align with the new editorial tone.

---

## 4. Verification & Testing

* **Visual Audit:** Open the portfolio locally and verify that the typography wraps elegantly and matches the High-End Minimalist styling without layout shifts or line-wrap issues.
* **Link / Semantic Validation:** Ensure all HTML tags remain properly closed and links continue to function correctly.
