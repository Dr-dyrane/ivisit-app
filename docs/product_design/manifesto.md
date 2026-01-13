🏥 iVisit 2026: Design Manifesto
Vision: Shift the user experience from a "Transactional List" to a "Digital Medical Vault." Every appointment, ambulance trip, and profile is treated as a Verifiable Identity Artifact.
1. Geometric Signature: The Rule of Nested Squircles
Standard rounding is forbidden. Every container follows a mathematical "squircle" progression to create a nested, organic depth.
Layer	Radius	Use Case
Outer Shell	48px	Bottom Sheets, Modals, Root Containers
Primary Artifact	36px	Hospital Cards, Visit Cards, Ambulance Modules
Widget / Card-in-Card	24px	Action Buttons, Identity Widgets, Stats Boxes
Identity / Detail	14px	Icon Boxes, Avatars, Image Badges
2. Typography: The Editorial Weight
We use "San Francisco / Inter" with extreme weights to differentiate between Mission-Critical Data and Metadata.
Primary Headline: FontWeight: 900, LetterSpacing: -1.0pt. (e.g., Hospital Names, Prices).
The Identity Label: FontWeight: 800, LetterSpacing: 1.5pt, TextTransform: Uppercase. (e.g., "SPECIALTIES", "RESERVATION").
The "Vital" Stat: FontWeight: 900, LetterSpacing: -0.5pt. (e.g., ETA Numbers, Bed Numbers).
3. Depth: Bioluminescence & Glass
We reject 1px borders. Depth is achieved through light emission and opacity layering.
Border-Free Depth: Boundaries are defined by background color shifts (brandPrimary + "15" alpha) and shadow offsets.
The Active Glow: Selected items emit a colored shadow (shadowColor: COLORS.brandPrimary). This creates a "Live" effect on the screen.
Frosted Glass (The Stage): High-opacity overlays (95% to 98%) allow the map colors to bleed into the UI without sacrificing text legibility.
4. The Signature Interaction: "The Corner Seal"
The hallmark of the iVisit UI is the bottom-right selection anchor.
Placement: bottom: -4px, right: -4px.
Component: An 18px to 32px checkmark-circle that overlaps the container edge.
Logic: This "breaks" the box, making the UI feel 3D and physically confirmed.
5. Core Component Specifications
A. The Floating Island Header
Height: 80px.
Style: A pill-shaped glass island floating 8px from the screen top.
Logic: Contains an Identity Icon on the left and a Status Badge on the right.
B. The Vital Signal (Progress Track)
Architecture: A thin 4px hairline track.
The Plow: A circular 12px indicator with a brand glow that sits on top of the track, representing the live movement of a responder.
C. The Identity Module (Details)
Hero Section: 240px height image with a top-right floating badge.
Identity Widget: A row-based container for Doctor/Responder info using the 14px icon squircle.
Data Grid: Symmetrical 2x2 or 1x2 squares for Date, Time, and Location.
6. Color Theory (Brand-Standard)
Variable	Hex Value	Purpose
brandPrimary	#86100E	Urgency, Call-to-Action, Active Glow
activeBG (Light)	#86100E15	Ghost Tints for selected items
activeBG (Dark)	#86100E20	High-contrast selected fill
neutralGlass	rgba(0,0,0,0.03)	Default unselected surface depth
7. Motion & Haptics
Micro-Scale: Every interactive card scales to 0.98 on press.
Identity Entry: Modals slide from the bottom with a Tension: 45, Friction: 10 spring to feel heavy and premium.
Haptic Signature:
Selection: Impact: Light.
Mission Confirmation: Notification: Success.
Cancel/Delete: Impact: Heavy.
Summary: This document moves iVisit beyond the utility standards of Uber and the minimalist standards of Apple, creating a distinct "Identity-First" medical ecosystem. Every screen is a passport; every interaction is a confirmation of care.