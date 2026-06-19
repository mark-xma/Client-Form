// XMA service catalog — every field here forces sales to be specific so ops can verify feasibility.
// Adding a service: add an entry, app.js renders forms + delivery items automatically.

window.XMA_SERVICES = {

  // --- CONTENT ---
  reels: {
    label: "Reels",
    category: "Content",
    fields: [
      { key: "qty",         label: "Number of reels per month",      type: "number" },
      { key: "length",      label: "Length per reel (seconds)",      type: "text", placeholder: "e.g. 15–30s" },
      { key: "shootDays",   label: "Shoot days included / month",    type: "number" },
      { key: "location",    label: "Shoot location(s)",              type: "text" },
      { key: "scripted",    label: "Scripted or freestyle?",         type: "select", options: ["Scripted by XMA", "Scripted by client", "Freestyle / outline only"] },
      { key: "talent",      label: "Talent / on-camera",             type: "select", options: ["Client themselves", "XMA model/talent (extra cost)", "Mix"] },
      { key: "editing",     label: "Editing style",                  type: "text", placeholder: "e.g. fast cuts, talking head, b-roll" },
      { key: "revisions",   label: "Revision rounds per reel",       type: "number" },
      { key: "deliveryFmt", label: "Final delivery format",          type: "text", placeholder: "9:16 .mp4, captions burnt-in" },
    ]
  },

  aiVideos: {
    label: "AI Videos",
    category: "Content",
    fields: [
      { key: "qty",         label: "Number of AI videos",            type: "number" },
      { key: "length",      label: "Length per video",               type: "text" },
      { key: "style",       label: "Style / model (Sora, Veo, Higgsfield, etc.)", type: "text" },
      { key: "voiceover",   label: "Voiceover?",                     type: "select", options: ["No", "AI voice", "Human voice"] },
      { key: "script",      label: "Who writes the script?",         type: "select", options: ["XMA", "Client", "Co-written"] },
      { key: "revisions",   label: "Revision rounds per video",      type: "number" },
    ]
  },

  // --- DESIGN ---
  graphics: {
    label: "Graphics",
    category: "Design",
    fields: [
      { key: "qty",         label: "Quantity per month",             type: "number" },
      { key: "type",        label: "Type",                           type: "text", placeholder: "feed posts, stories, carousels, print" },
      { key: "templates",   label: "Provide editable templates?",    type: "select", options: ["No", "Yes — Canva", "Yes — Figma"] },
      { key: "revisions",   label: "Revision rounds per graphic",    type: "number" },
    ]
  },

  brandingKit: {
    label: "Branding Kit",
    category: "Design",
    fields: [
      { key: "deliverables", label: "What's included?",              type: "textarea", placeholder: "logo variants, color system, typography, photo direction, social templates, brand guide PDF…" },
      { key: "guidePages",   label: "Pages in brand guide PDF",      type: "number" },
      { key: "moodboards",   label: "Moodboard rounds",              type: "number" },
      { key: "revisions",    label: "Total revision rounds",         type: "number" },
      { key: "timeline",     label: "Delivery timeline (weeks)",     type: "number" },
    ]
  },

  logo: {
    label: "Logo",
    category: "Design",
    fields: [
      { key: "concepts",    label: "Initial concepts presented",     type: "number" },
      { key: "variants",    label: "Final variants delivered",       type: "text", placeholder: "primary, secondary, monogram, favicon" },
      { key: "formats",     label: "File formats",                   type: "text", placeholder: ".ai, .svg, .png, .pdf" },
      { key: "revisions",   label: "Revision rounds",                type: "number" },
      { key: "timeline",    label: "Delivery timeline (weeks)",      type: "number" },
    ]
  },

  // --- TECH ---
  website: {
    label: "Websites",
    category: "Tech",
    fields: [
      { key: "platform",    label: "Platform",                       type: "select", options: ["WordPress", "Webflow", "Framer", "Shopify", "Wix", "Custom code"] },
      { key: "pages",       label: "Number of pages",                type: "number" },
      { key: "ecommerce",   label: "E-commerce?",                    type: "select", options: ["No", "Yes — basic catalog", "Yes — full store"] },
      { key: "integrations",label: "Integrations needed",            type: "text", placeholder: "Stripe, Mailchimp, GHL, Calendly…" },
      { key: "copywriting", label: "Copy provided by?",              type: "select", options: ["Client", "XMA (extra)", "AI-assisted, client reviewed"] },
      { key: "hosting",     label: "Hosting & domain included?",     type: "select", options: ["No", "1 year included", "Ongoing managed"] },
      { key: "revisions",   label: "Design revision rounds",         type: "number" },
      { key: "timeline",    label: "Launch timeline (weeks)",        type: "number" },
    ]
  },

  crm: {
    label: "CRM Setup",
    category: "Tech",
    fields: [
      { key: "platform",    label: "Which CRM",                      type: "select", options: ["GoHighLevel", "HubSpot", "Salesforce", "Notion-based", "Other"] },
      { key: "workflows",   label: "Workflows / automations to build", type: "number" },
      { key: "pipelines",   label: "Sales pipelines to set up",      type: "number" },
      { key: "integrations",label: "Integrations",                   type: "text", placeholder: "WhatsApp, Meta lead forms, Calendly, Stripe…" },
      { key: "dataImport",  label: "Data migration / import?",       type: "select", options: ["None", "CSV import", "From another CRM"] },
      { key: "training",    label: "Training hours included",        type: "number" },
      { key: "support",     label: "Post-launch support",            type: "select", options: ["None", "30 days", "90 days", "Ongoing retainer"] },
    ]
  },

  goAi: {
    label: "GO AI",
    category: "Tech",
    fields: [
      { key: "useCase",     label: "Use case",                       type: "textarea", placeholder: "What does the AI do for them? Lead qualification? Customer support? Content gen?" },
      { key: "channels",    label: "Channels it lives on",           type: "text", placeholder: "WhatsApp, Instagram DM, website widget…" },
      { key: "training",    label: "Training data source",           type: "text", placeholder: "client docs, FAQ, website…" },
      { key: "languages",   label: "Languages supported",            type: "text" },
      { key: "humanHandoff",label: "Human handoff trigger",          type: "text", placeholder: "When does it pass to a human?" },
      { key: "support",     label: "Tuning / monitoring period",     type: "select", options: ["1 month", "3 months", "6 months", "Ongoing"] },
    ]
  },

  // --- ADS ---
  adManagement: {
    label: "Ad Management",
    category: "Ads",
    fields: [
      { key: "platforms",   label: "Platforms",                      type: "text", placeholder: "Meta, Google, TikTok, LinkedIn…" },
      { key: "monthlySpend",label: "Monthly ad spend (client's budget, not our fee)", type: "number" },
      { key: "campaigns",   label: "Active campaigns to manage",     type: "number" },
      { key: "creatives",   label: "New creatives per month (qty)",  type: "number" },
      { key: "creativeBy",  label: "Creative produced by",           type: "select", options: ["XMA in this fee", "Client provides", "Separate creative retainer"] },
      { key: "kpi",         label: "Primary KPI",                    type: "text", placeholder: "CPL, ROAS target, CAC ceiling…" },
      { key: "reporting",   label: "Reporting cadence",              type: "select", options: ["Weekly", "Bi-weekly", "Monthly"] },
      { key: "callsPerMonth", label: "Strategy calls per month",     type: "number" },
    ]
  },

};
