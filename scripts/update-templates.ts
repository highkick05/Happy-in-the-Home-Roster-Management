import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

const extendedTemplates = [
  {
    title: "Support Worker",
    desc: `Position Overview:
The Support Worker is responsible for providing direct, person-centered care and assistance to clients within their homes and the community. This role focuses on empowering clients to maintain their independence, dignity, and quality of life in accordance with their individual care plans.

Key Responsibilities:
• Personal Care: Assist with daily living activities including bathing, dressing, grooming, toileting, and personal hygiene.
• Domestic Assistance: Perform essential household tasks such as cleaning, laundry, meal preparation, and grocery shopping to maintain a safe and hygienic living environment.
• Community Access: Facilitate social inclusion by transporting and accompanying clients to medical appointments, community events, shopping, and recreational activities.
• Health & Wellbeing: Monitor client health, provide medication prompting and assistance (where authorized), and immediately report any changes in condition to the clinical team.
• Documentation: Maintain accurate, timely, and objective progress notes after each shift, detailing the care provided and any incidents or observations.
• Safety & Compliance: Adhere to all organizational policies, manual handling guidelines, and occupational health and safety regulations to ensure a safe environment for both the client and staff member.

Requirements:
• Certificate III in Individual Support, Aged Care, or Disability (or equivalent/working towards).
• Valid First Aid and CPR certification.
• Current Driver's License and a reliable, insured vehicle.
• National Police Clearance and relevant Working with Children/Vulnerable People checks.`
  },
  {
    title: "Registered Nurse",
    desc: `Position Overview:
The Registered Nurse provides high-level clinical care, assessment, and management for clients living in the community. This role requires clinical leadership, critical thinking, and a commitment to delivering evidence-based nursing care to support clients with complex health needs.

Key Responsibilities:
• Clinical Assessment: Conduct comprehensive initial and ongoing clinical assessments of clients to determine their health status and care requirements.
• Care Planning: Develop, implement, and evaluate individualized clinical care plans in consultation with the client, their family, and allied health professionals.
• Direct Nursing Care: Perform specialized clinical procedures including wound management, catheter care, stoma care, palliative care, and complex medication administration (including IV therapy where applicable).
• Supervision & Leadership: Provide clinical guidance, delegation, and supervision to Enrolled Nurses and Support Workers, ensuring care is delivered safely and within their scope of practice.
• Documentation & Reporting: Maintain meticulous clinical records, prepare reports for funding bodies, and ensure all documentation complies with legal and regulatory standards.
• Health Education: Educate clients and their families on health management, disease prevention, and self-care strategies.

Requirements:
• Current, unrestricted registration as a Registered Nurse with AHPRA.
• Bachelor of Nursing degree (or equivalent).
• Extensive clinical experience, preferably in community, aged care, or acute settings.
• Advanced clinical skills and the ability to work autonomously in the community.`
  },
  {
    title: "Enrolled Nurse",
    desc: `Position Overview:
Working under the direction and supervision of a Registered Nurse, the Enrolled Nurse delivers high-quality, clinical nursing care to clients in their homes. This role supports the clinical team in implementing comprehensive care plans and monitoring client health outcomes.

Key Responsibilities:
• Clinical Care Delivery: Provide routine and specialized nursing care as delegated by the RN, including wound dressings, vital sign monitoring, and blood glucose testing.
• Medication Administration: Administer medications safely in accordance with organizational policies, scope of practice, and prescriber instructions.
• Client Monitoring: Observe, measure, and record client health status, reporting any deterioration or abnormalities to the supervising Registered Nurse immediately.
• Care Implementation: Assist in the execution of individualized care plans, ensuring all interventions align with the client's goals and clinical needs.
• Documentation: Accurately document all clinical interventions, medication administrations, and observations in the client's health record.
• Team Collaboration: Work collaboratively with Support Workers, Registered Nurses, and external healthcare providers to ensure holistic care delivery.

Requirements:
• Current registration as an Enrolled Nurse with AHPRA (preferably with medication endorsement).
• Diploma of Nursing (or equivalent).
• Sound clinical knowledge and excellent communication skills.
• Commitment to delivering compassionate, patient-centered care.`
  },
  {
    title: "Clinical Coordinator",
    desc: `Position Overview:
The Clinical Coordinator provides strategic and operational leadership to the clinical care team. This role is responsible for overseeing the quality, safety, and compliance of clinical services delivered to clients, ensuring adherence to national standards and funding requirements.

Key Responsibilities:
• Care Coordination: Manage and coordinate complex client caseloads, ensuring all clinical interventions are timely, appropriate, and aligned with client goals.
• Quality & Compliance: Audit clinical records, monitor incident reports, and ensure the organization complies with Aged Care Quality Standards and NDIS Practice Standards.
• Stakeholder Engagement: Liaise with GPs, hospitals, allied health professionals, and families to facilitate seamless care transitions and multidisciplinary case management.
• Team Leadership: Mentor, educate, and conduct performance reviews for nursing staff and specialized support workers. Facilitate ongoing clinical training programs.
• Clinical Governance: Contribute to the development and review of clinical policies, procedures, and risk management strategies.
• Escalation Management: Act as the primary point of contact for complex clinical escalations, complaints, and critical incidents.

Requirements:
• Current registration as a Registered Nurse with AHPRA.
• Significant postgraduate experience in clinical coordination, management, or community health leadership.
• Comprehensive understanding of relevant legislative and regulatory frameworks (Aged Care, NDIS).
• Strong leadership, conflict resolution, and organizational skills.`
  },
  {
    title: "Administrator",
    desc: `Position Overview:
The Administrator is the backbone of the organization's daily operations, ensuring the office runs smoothly and efficiently. This role provides critical support to management, staff, and clients, requiring exceptional organizational and communication skills.

Key Responsibilities:
• Front Office Management: Act as the first point of contact for client inquiries, managing phone calls, emails, and office visitors with professionalism and empathy.
• Scheduling & Rostering: Assist with staff scheduling, ensuring shifts are filled, client preferences are met, and staff travel is optimized.
• Records Management: Maintain accurate and confidential client and employee records, both physical and digital, ensuring compliance with privacy legislation.
• Payroll & Invoicing Support: Assist the finance team with data entry, timesheet verification, and the preparation of client invoices and staff payroll.
• General Administration: Manage office supplies, coordinate meetings, draft correspondence, and support the management team with ad-hoc administrative projects.
• Compliance Tracking: Monitor and track staff compliance requirements, including police checks, first aid certificates, and training modules, sending reminders as necessary.

Requirements:
• Proven experience in an administrative or office management role.
• High proficiency in office software (e.g., Microsoft Office Suite, CRM systems, rostering software).
• Excellent written and verbal communication skills.
• Strong attention to detail and the ability to multitask in a fast-paced environment.`
  },
  {
    title: "Gardener",
    desc: `Position Overview:
The Gardener is responsible for providing essential outdoor maintenance and landscaping services for clients, ensuring their gardens and outdoor living spaces remain safe, accessible, and well-presented.

Key Responsibilities:
• Lawn Maintenance: Perform regular lawn mowing, edging, and trimming to keep grass areas neat and hazard-free.
• Garden Care: Undertake pruning, weeding, mulching, and general garden tidy-ups to maintain plant health and visual appeal.
• Waste Removal: Safely collect and dispose of green waste and garden debris from the client's property.
• Safety Inspections: Identify and report any outdoor hazards (e.g., uneven paving, overhanging branches, broken fences) to management to ensure client safety.
• Equipment Maintenance: Operate and maintain gardening tools and machinery (e.g., mowers, snippers) safely and effectively, ensuring they are in good working order.
• Client Interaction: Communicate politely and respectfully with clients, ensuring gardening tasks align with their preferences and care plan requirements.

Requirements:
• Experience in landscaping, gardening, or outdoor maintenance.
• Ability to operate standard gardening machinery safely.
• High level of physical fitness to perform manual labor outdoors in various weather conditions.
• Valid Driver's License and ability to transport gardening equipment.`
  },
  {
    title: "Home Maintenance Worker",
    desc: `Position Overview:
The Home Maintenance Worker performs vital minor repairs and maintenance tasks within client homes. This role focuses on preventative maintenance and addressing immediate safety concerns to support clients in living safely and independently.

Key Responsibilities:
• Minor Repairs: Perform general handy-person tasks such as repairing hinges, fixing sticking doors, assembling minor furniture, and repairing loose fixtures.
• Safety Modifications: Install minor safety aids such as grab rails (where qualified), change lightbulbs, replace smoke detector batteries, and secure loose rugs or cables.
• Preventative Maintenance: Conduct basic checks of the home environment, identifying potential safety hazards or areas requiring specialized trades (e.g., plumbing, electrical).
• Outdoor Maintenance: Perform minor exterior repairs, such as clearing low gutters, fixing gates, or repairing steps to ensure safe access to the property.
• Tool & Inventory Management: Maintain a safe, organized inventory of tools and materials required for daily tasks.
• Reporting: Document all work completed and report any significant structural or safety issues to the coordination team for further action.

Requirements:
• Proven experience in property maintenance, handyman services, or a relevant trade background.
• Practical knowledge of basic carpentry, hardware installation, and home safety.
• Ability to work autonomously and problem-solve on-site.
• Excellent customer service skills and an understanding of the needs of elderly or disabled clients.`
  }
];

const updateStmt = db.prepare(`
    UPDATE position_templates SET description_text = ? WHERE position_title = ?
`);

db.transaction(() => {
    for (const t of extendedTemplates) {
        updateStmt.run(t.desc, t.title);
    }
})();

console.log('Database templates updated successfully via tsx!');
